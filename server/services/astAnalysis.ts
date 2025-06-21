import { Project, Node, SyntaxKind } from "ts-morph";
import { parse } from "@babel/parser";
import * as traverse from "@babel/traverse";
import * as t from "@babel/types";

export interface ASTAnalysisResult {
  packageUsage: Record<string, {
    importNodes: string[];
    usageNodes: string[];
    exportedSymbols: string[];
    complexityScore: number;
    migrationRisk: 'low' | 'medium' | 'high';
  }>;
  codeMetrics: {
    totalFunctions: number;
    totalClasses: number;
    totalImports: number;
    cyclomaticComplexity: number;
  };
  dependencyGraph: Record<string, string[]>;
}

export async function performASTAnalysis(
  sourceFiles: { name: string; content: string }[],
  dependencies: Record<string, string>
): Promise<ASTAnalysisResult> {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      target: 99, // Latest
    },
  });

  const packageUsage: Record<string, {
    importNodes: string[];
    usageNodes: string[];
    exportedSymbols: string[];
    complexityScore: number;
    migrationRisk: 'low' | 'medium' | 'high';
  }> = {};

  const codeMetrics = {
    totalFunctions: 0,
    totalClasses: 0,
    totalImports: 0,
    cyclomaticComplexity: 0,
  };

  const dependencyGraph: Record<string, string[]> = {};

  // Initialize package usage tracking
  Object.keys(dependencies).forEach(dep => {
    packageUsage[dep] = {
      importNodes: [],
      usageNodes: [],
      exportedSymbols: [],
      complexityScore: 0,
      migrationRisk: 'low',
    };
  });

  for (const file of sourceFiles) {
    try {
      // Try TypeScript/TSX first
      if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const sourceFile = project.createSourceFile(file.name, file.content);
        analyzeTypeScriptFile(sourceFile, packageUsage, codeMetrics, dependencyGraph, dependencies);
      } else {
        // Use Babel for JavaScript files
        await analyzeJavaScriptFile(file, packageUsage, codeMetrics, dependencyGraph, dependencies);
      }
    } catch (error) {
      console.error(`Failed to analyze ${file.name}:`, error);
    }
  }

  // Calculate migration risks
  Object.keys(packageUsage).forEach(pkg => {
    const usage = packageUsage[pkg];
    usage.migrationRisk = calculateMigrationRisk(usage);
  });

  return {
    packageUsage,
    codeMetrics,
    dependencyGraph,
  };
}

function analyzeTypeScriptFile(
  sourceFile: any,
  packageUsage: Record<string, any>,
  codeMetrics: any,
  dependencyGraph: Record<string, string[]>,
  dependencies: Record<string, string>
) {
  // Count functions and classes
  sourceFile.getFunctions().forEach(() => codeMetrics.totalFunctions++);
  sourceFile.getClasses().forEach(() => codeMetrics.totalClasses++);

  // Analyze imports
  sourceFile.getImportDeclarations().forEach((importDecl: any) => {
    codeMetrics.totalImports++;
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const packageName = extractPackageName(moduleSpecifier);
    
    if (packageName && dependencies[packageName]) {
      const importText = importDecl.getText();
      packageUsage[packageName].importNodes.push(importText);
      
      // Track named imports
      const namedImports = importDecl.getNamedImports();
      namedImports.forEach((namedImport: any) => {
        packageUsage[packageName].exportedSymbols.push(namedImport.getName());
      });
    }
  });

  // Analyze function calls and property access
  sourceFile.forEachDescendant((node: any) => {
    if (Node.isCallExpression(node)) {
      const expression = node.getExpression();
      if (Node.isPropertyAccessExpression(expression)) {
        const objectText = expression.getExpression().getText();
        const packageName = findPackageFromIdentifier(objectText, dependencies);
        if (packageName) {
          packageUsage[packageName].usageNodes.push(node.getText());
          packageUsage[packageName].complexityScore += 1;
        }
      }
    }
  });
}

async function analyzeJavaScriptFile(
  file: { name: string; content: string },
  packageUsage: Record<string, any>,
  codeMetrics: any,
  dependencyGraph: Record<string, string[]>,
  dependencies: Record<string, string>
) {
  try {
    const ast = parse(file.content, {
      sourceType: "module",
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      plugins: [
        "jsx",
        "typescript",
        "decorators-legacy",
        "classProperties",
        "asyncGenerators",
        "functionBind",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "dynamicImport",
        "nullishCoalescingOperator",
        "optionalChaining",
      ],
    });

    (traverse.default || traverse)(ast, {
      ImportDeclaration(path: any) {
        codeMetrics.totalImports++;
        const source = path.node.source.value;
        const packageName = extractPackageName(source);
        
        if (packageName && dependencies[packageName]) {
          packageUsage[packageName].importNodes.push(path.toString());
          
          path.node.specifiers.forEach((spec: any) => {
            if (t.isImportSpecifier(spec)) {
              packageUsage[packageName].exportedSymbols.push(spec.imported.name);
            }
          });
        }
      },
      
      FunctionDeclaration(path: any) {
        codeMetrics.totalFunctions++;
      },
      
      ClassDeclaration(path: any) {
        codeMetrics.totalClasses++;
      },
      
      CallExpression(path: any) {
        if (t.isMemberExpression(path.node.callee)) {
          const objectName = getObjectName(path.node.callee.object);
          const packageName = findPackageFromIdentifier(objectName, dependencies);
          if (packageName) {
            packageUsage[packageName].usageNodes.push(path.toString());
            packageUsage[packageName].complexityScore += 1;
          }
        }
      },
    });
  } catch (error) {
    console.error(`Error parsing JavaScript file ${file.name}:`, error);
  }
}

function extractPackageName(importPath: string): string | null {
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }

  return importPath.split('/')[0];
}

function findPackageFromIdentifier(identifier: string, dependencies: Record<string, string>): string | null {
  // Common patterns for package identification
  const commonMappings: Record<string, string> = {
    '_': 'lodash',
    '$': 'jquery',
    'React': 'react',
    'Vue': 'vue',
    'axios': 'axios',
    'moment': 'moment',
  };

  if (commonMappings[identifier] && dependencies[commonMappings[identifier]]) {
    return commonMappings[identifier];
  }

  // Check if identifier matches any dependency name
  const matchingDep = Object.keys(dependencies).find(dep => 
    dep.toLowerCase() === identifier.toLowerCase() ||
    dep.replace(/[-_]/g, '').toLowerCase() === identifier.replace(/[-_]/g, '').toLowerCase()
  );

  return matchingDep || null;
}

function getObjectName(node: any): string {
  if (t.isIdentifier(node)) {
    return node.name;
  }
  if (t.isMemberExpression(node)) {
    return getObjectName(node.object);
  }
  return '';
}

function calculateMigrationRisk(usage: any): 'low' | 'medium' | 'high' {
  const { usageNodes, exportedSymbols, complexityScore } = usage;
  
  let risk = 0;
  risk += usageNodes.length * 1;
  risk += exportedSymbols.length * 2;
  risk += complexityScore * 0.5;
  
  if (risk <= 5) return 'low';
  if (risk <= 15) return 'medium';
  return 'high';
}