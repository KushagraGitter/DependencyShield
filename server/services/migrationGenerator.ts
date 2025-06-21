import OpenAI from "openai";
import { ASTAnalysisResult } from "./astAnalysis";
import { BreakingChangeAnalysis } from "./changelogAnalysis";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

export interface MigrationStep {
  id: string;
  type: 'import_change' | 'api_change' | 'config_change' | 'dependency_change' | 'manual_review';
  title: string;
  description: string;
  automated: boolean;
  codeChanges?: {
    file: string;
    changes: {
      line: number;
      oldCode: string;
      newCode: string;
      explanation: string;
    }[];
  }[];
  verification?: {
    test: string;
    expectedResult: string;
  };
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AutomatedMigration {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  migrationSteps: MigrationStep[];
  overallComplexity: 'low' | 'medium' | 'high';
  automationCoverage: number; // percentage of steps that can be automated
  totalEstimatedTime: string;
  preRequisites: string[];
  postMigrationTasks: string[];
  riskAssessment: {
    dataLoss: 'none' | 'low' | 'medium' | 'high';
    breakingChanges: 'none' | 'minor' | 'major' | 'critical';
    rollbackDifficulty: 'easy' | 'medium' | 'hard';
  };
}

export async function generateAutomatedMigration(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  astAnalysis: ASTAnalysisResult,
  changelogAnalysis: BreakingChangeAnalysis,
  codeUsage: any
): Promise<AutomatedMigration> {
  try {
    const migrationPlan = await generateMigrationPlan(
      packageName,
      fromVersion,
      toVersion,
      astAnalysis,
      changelogAnalysis,
      codeUsage
    );

    const codeTransformations = await generateCodeTransformations(
      packageName,
      astAnalysis,
      changelogAnalysis
    );

    const migrationSteps = combinePlanAndTransformations(migrationPlan, codeTransformations);
    
    return {
      packageName,
      fromVersion,
      toVersion,
      migrationSteps,
      overallComplexity: calculateOverallComplexity(migrationSteps, changelogAnalysis),
      automationCoverage: calculateAutomationCoverage(migrationSteps),
      totalEstimatedTime: calculateTotalTime(migrationSteps),
      preRequisites: extractPreRequisites(migrationPlan),
      postMigrationTasks: extractPostMigrationTasks(migrationPlan),
      riskAssessment: assessRisks(changelogAnalysis, astAnalysis),
    };
  } catch (error) {
    console.error(`Failed to generate automated migration for ${packageName}:`, error);
    throw new Error(`Migration generation failed: ${error.message}`);
  }
}

async function generateMigrationPlan(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  astAnalysis: ASTAnalysisResult,
  changelogAnalysis: BreakingChangeAnalysis,
  codeUsage: any
): Promise<any> {
  const prompt = `
Generate a detailed migration plan for upgrading ${packageName} from version ${fromVersion} to ${toVersion}.

Code Analysis:
${JSON.stringify(astAnalysis.packageUsage[packageName] || {}, null, 2)}

Breaking Changes:
${JSON.stringify(changelogAnalysis.breakingChanges, null, 2)}

Code Usage Patterns:
${JSON.stringify(codeUsage?.packageUsage?.[packageName] || {}, null, 2)}

Generate a comprehensive migration plan in JSON format:
{
  "migrationSteps": [
    {
      "id": "step-1",
      "type": "import_change|api_change|config_change|dependency_change|manual_review",
      "title": "Step title",
      "description": "Detailed description",
      "automated": true|false,
      "estimatedTime": "5 minutes",
      "priority": "high|medium|low",
      "codeChanges": [
        {
          "file": "filename.js",
          "changes": [
            {
              "line": 10,
              "oldCode": "old import statement",
              "newCode": "new import statement",
              "explanation": "Why this change is needed"
            }
          ]
        }
      ]
    }
  ],
  "preRequisites": ["Backup your code", "Update Node.js version"],
  "postMigrationTasks": ["Run tests", "Update documentation"],
  "warnings": ["Potential issues to watch for"]
}

Focus on:
1. Import statement changes
2. API method signature changes
3. Configuration updates
4. Dependency version conflicts
5. Breaking behavioral changes
6. Testing requirements
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a senior software engineer specializing in package migrations. Generate practical, actionable migration plans."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

async function generateCodeTransformations(
  packageName: string,
  astAnalysis: ASTAnalysisResult,
  changelogAnalysis: BreakingChangeAnalysis
): Promise<any> {
  const usage = astAnalysis.packageUsage[packageName];
  if (!usage || usage.usageNodes.length === 0) return { transformations: [] };

  const prompt = `
Generate automated code transformations for migrating ${packageName}.

Current Usage Analysis:
- Import statements: ${JSON.stringify(usage.importNodes)}
- Usage patterns: ${JSON.stringify(usage.usageNodes)}
- Exported symbols: ${JSON.stringify(usage.exportedSymbols)}

Breaking Changes:
${JSON.stringify(changelogAnalysis.breakingChanges, null, 2)}

Generate specific code transformations in JSON format:
{
  "transformations": [
    {
      "type": "find_replace",
      "pattern": "regex pattern to find",
      "replacement": "replacement code",
      "explanation": "Why this change is needed",
      "fileTypes": [".js", ".ts", ".jsx", ".tsx"]
    },
    {
      "type": "import_update",
      "oldImport": "import { old } from 'package'",
      "newImport": "import { new } from 'package'",
      "explanation": "Import path changed"
    },
    {
      "type": "method_signature",
      "oldSignature": "oldMethod(param1, param2)",
      "newSignature": "newMethod({param1, param2})",
      "explanation": "Method signature updated to use options object"
    }
  ]
}

Focus on patterns that can be automatically detected and replaced.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert in automated code transformations and AST manipulation."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content || '{ "transformations": [] }');
}

function combinePlanAndTransformations(migrationPlan: any, codeTransformations: any): MigrationStep[] {
  const steps: MigrationStep[] = [];
  
  // Add migration plan steps
  if (migrationPlan.migrationSteps) {
    steps.push(...migrationPlan.migrationSteps.map((step: any) => ({
      ...step,
      automated: step.automated || false,
    })));
  }

  // Add transformation steps
  if (codeTransformations.transformations) {
    codeTransformations.transformations.forEach((transform: any, index: number) => {
      steps.push({
        id: `transform-${index + 1}`,
        type: 'api_change',
        title: `Automated Code Transformation: ${transform.type}`,
        description: transform.explanation,
        automated: true,
        codeChanges: [{
          file: 'multiple files',
          changes: [{
            line: 0,
            oldCode: transform.pattern || transform.oldImport || transform.oldSignature,
            newCode: transform.replacement || transform.newImport || transform.newSignature,
            explanation: transform.explanation,
          }]
        }],
        estimatedTime: '2 minutes',
        priority: 'medium' as const,
      });
    });
  }

  return steps;
}

function calculateOverallComplexity(
  steps: MigrationStep[], 
  changelogAnalysis: BreakingChangeAnalysis
): 'low' | 'medium' | 'high' {
  const stepComplexity = steps.length;
  const breakingChangesComplexity = changelogAnalysis.migrationComplexity;
  const manualSteps = steps.filter(step => !step.automated).length;
  
  if (breakingChangesComplexity === 'high' || manualSteps > 5 || stepComplexity > 10) {
    return 'high';
  }
  if (breakingChangesComplexity === 'medium' || manualSteps > 2 || stepComplexity > 5) {
    return 'medium';
  }
  return 'low';
}

function calculateAutomationCoverage(steps: MigrationStep[]): number {
  if (steps.length === 0) return 0;
  const automatedSteps = steps.filter(step => step.automated).length;
  return Math.round((automatedSteps / steps.length) * 100);
}

function calculateTotalTime(steps: MigrationStep[]): string {
  let totalMinutes = 0;
  
  steps.forEach(step => {
    const timeMatch = step.estimatedTime.match(/(\d+)\s*(minute|hour)/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      totalMinutes += unit.includes('hour') ? value * 60 : value;
    }
  });
  
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function extractPreRequisites(migrationPlan: any): string[] {
  return migrationPlan.preRequisites || [
    'Create a backup of your project',
    'Ensure all tests are passing',
    'Update to latest patch version first',
    'Review breaking changes documentation',
  ];
}

function extractPostMigrationTasks(migrationPlan: any): string[] {
  return migrationPlan.postMigrationTasks || [
    'Run full test suite',
    'Update documentation',
    'Test in staging environment',
    'Monitor for runtime errors',
  ];
}

function assessRisks(
  changelogAnalysis: BreakingChangeAnalysis,
  astAnalysis: ASTAnalysisResult
): any {
  const breakingChanges = changelogAnalysis.breakingChanges.length;
  const usageComplexity = Object.values(astAnalysis.packageUsage)
    .reduce((sum, usage) => sum + usage.complexityScore, 0);
  
  return {
    dataLoss: breakingChanges > 3 ? 'medium' : 'low',
    breakingChanges: breakingChanges === 0 ? 'none' : 
                    breakingChanges <= 2 ? 'minor' : 
                    breakingChanges <= 5 ? 'major' : 'critical',
    rollbackDifficulty: usageComplexity > 20 ? 'hard' : 
                       usageComplexity > 10 ? 'medium' : 'easy',
  };
}

export async function generateMigrationCode(
  transformation: any,
  sourceCode: string
): Promise<string> {
  const prompt = `
Apply the following transformation to the source code:

Transformation:
${JSON.stringify(transformation, null, 2)}

Source Code:
\`\`\`
${sourceCode}
\`\`\`

Return the transformed code with the changes applied. Only return the code, no explanations.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a code transformation engine. Apply the requested changes to the source code precisely."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0,
  });

  return response.choices[0].message.content || sourceCode;
}