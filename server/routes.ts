import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { runNpmAudit } from "./services/npmAudit";
import { analyzeCodeUsage, calculateMigrationComplexity } from "./services/codeAnalysis";
import { generateMigrationSuggestions } from "./services/openai";
import { performASTAnalysis } from "./services/astAnalysis";
import { analyzeChangelog } from "./services/changelogAnalysis";
import { fetchCVEDetails, enrichVulnerabilityWithCVE } from "./services/cveService";
import { generateAutomatedMigration } from "./services/migrationGenerator";
import { insertAnalysisSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow package.json and common source file types
    const allowedTypes = [
      'application/json',
      'text/plain',
      'text/javascript',
      'application/javascript',
      'text/typescript',
    ];
    
    const allowedExtensions = ['.json', '.js', '.ts', '.jsx', '.tsx', '.mjs'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only package.json and source files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Analysis endpoint
  app.post("/api/analyze", upload.fields([
    { name: 'packageJson', maxCount: 1 },
    { name: 'sourceFiles', maxCount: 100 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files.packageJson || files.packageJson.length === 0) {
        return res.status(400).json({ error: "package.json file is required" });
      }

      const packageJsonFile = files.packageJson[0];
      let packageJsonContent: string;
      
      try {
        packageJsonContent = packageJsonFile.buffer.toString('utf-8');
        JSON.parse(packageJsonContent); // Validate JSON
      } catch (error) {
        return res.status(400).json({ error: "Invalid package.json file" });
      }

      // Create temporary directory for npm audit
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'depguard-'));
      
      try {
        // Run NPM audit
        const auditResult = await runNpmAudit(packageJsonContent, tempDir);
        
        // Process source files if provided
        let codeAnalysis: any = null;
        let astAnalysis: any = null;
        if (files.sourceFiles && files.sourceFiles.length > 0) {
          const sourceFiles = files.sourceFiles.map(file => ({
            name: file.originalname,
            content: file.buffer.toString('utf-8')
          }));
          
          const packageJson = JSON.parse(packageJsonContent);
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          // Perform both basic and AST analysis
          codeAnalysis = await analyzeCodeUsage(sourceFiles, dependencies);
          
          try {
            astAnalysis = await performASTAnalysis(sourceFiles, dependencies);
          } catch (astError) {
            console.error("AST analysis failed:", astError);
            // Continue without AST analysis
          }
          
          // Enhance vulnerabilities with usage analysis
          auditResult.vulnerabilities.forEach(vuln => {
            const usage = codeAnalysis?.packageUsage[vuln.package];
            const astUsage = astAnalysis?.packageUsage[vuln.package];
            if (usage) {
              vuln.usageAnalysis = {
                filesAffected: usage.filesUsing.length,
                methodsUsed: usage.methodsUsed,
                migrationRisk: astUsage?.migrationRisk || 'low',
                complexityScore: astUsage?.complexityScore || 0
              };
            }
          });
        }

        // Enrich vulnerabilities with CVE details
        const enrichedVulnerabilities = await Promise.all(
          auditResult.vulnerabilities.map(async (vuln) => {
            try {
              return await enrichVulnerabilityWithCVE(vuln);
            } catch (error) {
              console.error(`Failed to enrich CVE for ${vuln.id}:`, error);
              return vuln;
            }
          })
        );

        // Generate AI migration suggestions and automated migrations
        let aiSuggestions: any[] = [];
        let automatedMigrations: any[] = [];
        
        try {
          aiSuggestions = await generateMigrationSuggestions(
            enrichedVulnerabilities,
            JSON.parse(packageJsonContent),
            codeAnalysis
          );

          // Generate detailed automated migrations for high-priority vulnerabilities
          if (astAnalysis && enrichedVulnerabilities.length > 0) {
            const criticalVulns = enrichedVulnerabilities
              .filter(v => v.severity === 'critical' || v.severity === 'high')
              .slice(0, 3); // Limit to prevent long processing times

            for (const vuln of criticalVulns) {
              try {
                const changelogAnalysis = await analyzeChangelog(
                  vuln.package,
                  vuln.version,
                  vuln.fixedIn || 'latest'
                );

                const migration = await generateAutomatedMigration(
                  vuln.package,
                  vuln.version,
                  vuln.fixedIn || 'latest',
                  astAnalysis,
                  changelogAnalysis,
                  codeAnalysis
                );

                automatedMigrations.push(migration);
              } catch (migrationError) {
                console.error(`Failed to generate migration for ${vuln.package}:`, migrationError);
              }
            }
          }
        } catch (aiError) {
          console.error("Failed to generate AI suggestions:", aiError);
          // Continue without AI suggestions rather than failing the entire request
        }

        // Calculate security score
        const securityScore = calculateSecurityScore(auditResult.metrics);

        // Generate session ID
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store analysis result
        const analysisData = {
          sessionId,
          packageJson: JSON.parse(packageJsonContent),
          vulnerabilities: enrichedVulnerabilities,
          securityScore,
          aiSuggestions,
          codeAnalysis: {
            ...codeAnalysis,
            astAnalysis,
            automatedMigrations
          }
        };

        const result = await storage.saveAnalysisResult(analysisData);

        res.json({
          id: result.id,
          sessionId: result.sessionId,
          vulnerabilities: enrichedVulnerabilities,
          metrics: auditResult.metrics,
          securityScore,
          aiSuggestions,
          automatedMigrations,
          codeAnalysis: analysisData.codeAnalysis,
          dependencyInfo: codeAnalysis ? {
            total: Object.keys(JSON.parse(packageJsonContent).dependencies || {}).length + 
                   Object.keys(JSON.parse(packageJsonContent).devDependencies || {}).length,
            vulnerable: enrichedVulnerabilities.length,
            outdated: 0, // Could be enhanced with additional checks
            unused: codeAnalysis.unusedDependencies.length
          } : null
        });

      } finally {
        // Clean up temp directory
        try {
          await fs.rm(tempDir, { recursive: true });
        } catch (cleanupError) {
          console.error("Failed to clean up temp directory:", cleanupError);
        }
      }

    } catch (error) {
      console.error("Analysis failed:", error);
      res.status(500).json({ 
        error: "Analysis failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get analysis result by session ID
  app.get("/api/analysis/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await storage.getAnalysisResult(sessionId);
      
      if (!result) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to get analysis:", error);
      res.status(500).json({ error: "Failed to retrieve analysis" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function calculateSecurityScore(metrics: { critical: number; high: number; moderate: number; low: number }): number {
  // Calculate score out of 100, with critical issues having the highest impact
  const totalIssues = metrics.critical + metrics.high + metrics.moderate + metrics.low;
  
  if (totalIssues === 0) return 100;
  
  // Weight different severity levels
  const weightedScore = (
    metrics.critical * 40 +  // Critical issues are heavily weighted
    metrics.high * 20 +      // High issues have significant impact
    metrics.moderate * 8 +   // Moderate issues have medium impact
    metrics.low * 2          // Low issues have minimal impact
  );
  
  // Convert to a score out of 100 (lower is worse)
  const maxReasonableIssues = 50; // Assume 50+ total issues is very bad
  const normalizedScore = Math.max(0, 100 - (weightedScore / maxReasonableIssues * 100));
  
  return Math.round(normalizedScore);
}
