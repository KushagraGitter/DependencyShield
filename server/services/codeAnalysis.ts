import fs from 'fs/promises';
import path from 'path';

export interface CodeUsageAnalysis {
  packageUsage: Record<string, {
    filesUsing: string[];
    methodsUsed: string[];
    importStatements: string[];
  }>;
  unusedDependencies: string[];
  totalFiles: number;
}

export async function analyzeCodeUsage(
  sourceFiles: { name: string; content: string }[],
  dependencies: Record<string, string>
): Promise<CodeUsageAnalysis> {
  const packageUsage: Record<string, {
    filesUsing: string[];
    methodsUsed: string[];
    importStatements: string[];
  }> = {};

  const usedPackages = new Set<string>();

  // Initialize tracking for all dependencies
  Object.keys(dependencies).forEach(dep => {
    packageUsage[dep] = {
      filesUsing: [],
      methodsUsed: [],
      importStatements: []
    };
  });

  // Analyze each source file
  sourceFiles.forEach(file => {
    const content = file.content;
    
    // Check for import/require statements
    const importRegexes = [
      /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,
      /import\s+['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    ];

    importRegexes.forEach(regex => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Extract package name (handle scoped packages and relative paths)
        const packageName = extractPackageName(importPath);
        
        if (packageName && dependencies[packageName]) {
          usedPackages.add(packageName);
          
          if (!packageUsage[packageName].filesUsing.includes(file.name)) {
            packageUsage[packageName].filesUsing.push(file.name);
          }
          
          packageUsage[packageName].importStatements.push(match[0]);
          
          // Analyze method usage patterns
          const methods = extractMethodUsage(content, packageName, importPath);
          methods.forEach(method => {
            if (!packageUsage[packageName].methodsUsed.includes(method)) {
              packageUsage[packageName].methodsUsed.push(method);
            }
          });
        }
      }
    });
  });

  // Identify unused dependencies
  const unusedDependencies = Object.keys(dependencies).filter(dep => !usedPackages.has(dep));

  return {
    packageUsage,
    unusedDependencies,
    totalFiles: sourceFiles.length
  };
}

function extractPackageName(importPath: string): string | null {
  // Handle relative imports
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  // Handle scoped packages (@scope/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }

  // Handle regular packages (package/subpath -> package)
  return importPath.split('/')[0];
}

function extractMethodUsage(content: string, packageName: string, importPath: string): string[] {
  const methods: string[] = [];

  // Common patterns for method usage
  const patterns = [
    // lodash: _.methodName
    new RegExp(`_\\.(\\w+)`, 'g'),
    // axios: axios.method
    new RegExp(`${packageName}\\.(\\w+)`, 'g'),
    // destructured: { method } from 'package'
    new RegExp(`\\{\\s*([\\w,\\s]+)\\s*\\}\\s*from\\s*['"\`]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`, 'g'),
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        // Handle destructured imports
        if (match[1].includes(',')) {
          match[1].split(',').forEach(method => {
            const cleanMethod = method.trim();
            if (cleanMethod && !methods.includes(cleanMethod)) {
              methods.push(cleanMethod);
            }
          });
        } else {
          const method = match[1].trim();
          if (method && !methods.includes(method)) {
            methods.push(method);
          }
        }
      }
    }
  });

  return methods;
}

export function calculateMigrationComplexity(
  packageName: string,
  usage: {
    filesUsing: string[];
    methodsUsed: string[];
    importStatements: string[];
  }
): 'low' | 'medium' | 'high' {
  const fileCount = usage.filesUsing.length;
  const methodCount = usage.methodsUsed.length;
  const importCount = usage.importStatements.length;

  // Calculate complexity score
  let score = 0;
  score += fileCount * 2; // Each file adds complexity
  score += methodCount * 1; // Each unique method adds complexity
  score += importCount * 0.5; // Each import statement adds some complexity

  // Adjust for package-specific complexity
  const complexPackages = ['lodash', 'moment', 'jquery', 'angular'];
  if (complexPackages.includes(packageName)) {
    score *= 1.5;
  }

  if (score <= 5) return 'low';
  if (score <= 15) return 'medium';
  return 'high';
}
