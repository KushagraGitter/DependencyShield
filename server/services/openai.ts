import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface MigrationAnalysis {
  package: string;
  currentVersion: string;
  suggestedAction: 'update' | 'replace' | 'remove';
  recommendation: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  vulnerabilitiesFixed: number;
  codeExample?: {
    before: string;
    after: string;
  };
  affectedFiles?: number;
  bundleSizeReduction?: string;
}

export async function generateMigrationSuggestions(
  vulnerabilities: any[],
  packageJson: any,
  codeUsage?: any
): Promise<MigrationAnalysis[]> {
  try {
    const prompt = `
You are an expert Node.js security consultant. Analyze the following vulnerability data and provide migration suggestions.

Package.json dependencies:
${JSON.stringify(packageJson.dependencies || {}, null, 2)}

Vulnerabilities found:
${JSON.stringify(vulnerabilities, null, 2)}

Code usage patterns (if available):
${codeUsage ? JSON.stringify(codeUsage, null, 2) : 'No code analysis available'}

Provide migration suggestions in JSON format with the following structure:
{
  "suggestions": [
    {
      "package": "package-name",
      "currentVersion": "1.0.0",
      "suggestedAction": "update|replace|remove",
      "recommendation": "Detailed explanation of the suggested migration",
      "complexity": "low|medium|high",
      "estimatedTime": "time estimate like '30 minutes' or '2 hours'",
      "vulnerabilitiesFixed": 2,
      "codeExample": {
        "before": "old code example",
        "after": "new code example"
      },
      "affectedFiles": 5,
      "bundleSizeReduction": "45KB"
    }
  ]
}

Focus on:
1. Security improvements
2. Practical migration paths
3. Breaking changes analysis
4. Bundle size optimizations
5. Modern alternatives when applicable
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert Node.js security consultant specializing in dependency management and migration strategies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];
  } catch (error) {
    console.error("Error generating migration suggestions:", error);
    throw new Error("Failed to generate AI migration suggestions");
  }
}

export async function analyzeBreakingChanges(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<{ summary: string; severity: string; details: string[] }> {
  try {
    const prompt = `
Analyze the breaking changes between ${packageName}@${fromVersion} and ${packageName}@${toVersion}.

Provide analysis in JSON format:
{
  "summary": "Brief summary of breaking changes",
  "severity": "low|medium|high",
  "details": ["list of specific breaking changes"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    return JSON.parse(response.choices[0].message.content || '{"summary": "Unable to analyze", "severity": "unknown", "details": []}');
  } catch (error) {
    console.error("Error analyzing breaking changes:", error);
    return {
      summary: "Unable to analyze breaking changes",
      severity: "unknown",
      details: []
    };
  }
}
