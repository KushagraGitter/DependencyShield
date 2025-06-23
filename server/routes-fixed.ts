import express, { type Request, Response, Express } from "express";
import multer from "multer";
import { createServer, type Server } from "http";
import fs from "fs/promises";
import path from "path";
import os from "os";
import yauzl from "yauzl";
import { runNpmAudit } from "./services/npmAudit";
import { analyzeCodeUsage } from "./services/codeAnalysis";
import { performASTAnalysis } from "./services/astAnalysis";
import { enrichVulnerabilityWithCVE } from "./services/cveService";
import { generateMigrationSuggestions } from "./services/openai";
import { generateAutomatedMigration } from "./services/migrationGenerator";
import { analyzeChangelog } from "./services/changelogAnalysis";
import { storage } from "./storage";
import packageDetailsRoutes from "./routes/packageDetailsRoutes";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024,
    files: 101 // 1 package.json + up to 100 source files
  },
  fileFilter: (req, file, cb) => {
    console.log('Processing file:', file.fieldname, file.originalname, file.mimetype);
    
    const allowedExtensions = ['.json', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.zip'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Accept files with allowed extensions regardless of MIME type
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}. Only .json, .js, .ts, .jsx, .tsx, .mjs, .zip files are allowed.`));
    }
  }
});

function calculateSecurityScore(metrics: { critical: number; high: number; moderate: number; low: number }): number {
  const weights = { critical: 10, high: 7, moderate: 4, low: 1 };
  const totalVulns = metrics.critical + metrics.high + metrics.moderate + metrics.low;
  
  if (totalVulns === 0) return 100;
  
  const weightedScore = (
    metrics.critical * weights.critical +
    metrics.high * weights.high +
    metrics.moderate * weights.moderate +
    metrics.low * weights.low
  );
  
  const maxPossibleScore = totalVulns * weights.critical;
  const securityScore = Math.max(0, 100 - (weightedScore / maxPossibleScore) * 100);
  
  return Math.round(securityScore);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Register package details routes
  app.use('/api', packageDetailsRoutes);

  // JSON endpoint for simplified testing
  app.post("/api/analyze-json", async (req: Request, res: Response) => {
    try {
      const { packageJson } = req.body;
      
      if (!packageJson) {
        return res.status(400).json({ error: "packageJson is required" });
      }

      const packageJsonContent = JSON.stringify(packageJson);
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'depguard-'));
      
      try {
        const auditResult = await runNpmAudit(packageJsonContent, tempDir);
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        
        // Enrich vulnerabilities with CVE details and usage analysis
        const enrichedVulnerabilities = await Promise.all(
          auditResult.vulnerabilities.map(async (vuln: any) => {
            try {
              const enrichedVuln = await enrichVulnerabilityWithCVE(vuln);
              
              // Add usage analysis from code analysis (for now, AST analysis methods detection needs improvement)
              enrichedVuln.usageAnalysis = {
                filesAffected: 0,
                methodsUsed: [],
                migrationRisk: 'low',
                complexityScore: 0,
                fileUsage: [],
              };
              
              return enrichedVuln;
            } catch (error) {
              console.error(`Failed to enrich vulnerability ${vuln.id}:`, error);
              return vuln;
            }
          })
        );

        // Calculate security score
        const securityScore = calculateSecurityScore(auditResult.metrics);
        
        // Generate AI migration suggestions (limit data to avoid token limits)
        let aiSuggestions: any[] = [];
        try {
          const limitedVulns = enrichedVulnerabilities.slice(0, 5);
          aiSuggestions = await generateMigrationSuggestions(
            limitedVulns,
            packageJson
          );
        } catch (aiError) {
          console.error('AI suggestions skipped due to rate limits or model constraints');
        }

        // Generate automated migrations for top vulnerabilities
        let automatedMigrations: any[] = [];
        try {
          const criticalVulns = enrichedVulnerabilities
            .filter(v => v.severity === 'critical' || v.severity === 'high')
            .slice(0, 2);
            
          for (const vuln of criticalVulns) {
            try {
              const changelogAnalysis = await analyzeChangelog(vuln.package, vuln.version, vuln.fixedIn);
              const migration = await generateAutomatedMigration(
                vuln.package,
                vuln.version,
                vuln.fixedIn || 'latest',
                null,
                changelogAnalysis
              );
              automatedMigrations.push(migration);
            } catch (migError) {
              console.error(`Failed to generate migration for ${vuln.package}:`, migError);
            }
          }
        } catch (migrationError) {
          console.error('Failed to generate automated migrations:', migrationError);
        }

        // Save analysis result
        const analysisResult = await storage.saveAnalysisResult({
          sessionId,
          vulnerabilities: enrichedVulnerabilities,
          metrics: auditResult.metrics,
          securityScore,
          dependencyInfo: {
            total: Object.keys(packageJson.dependencies || {}).length + Object.keys(packageJson.devDependencies || {}).length,
            vulnerable: enrichedVulnerabilities.length,
            outdated: 0,
            unused: 0
          },
          aiSuggestions,
          automatedMigrations
        });

        res.json(analysisResult);

      } catch (error) {
        console.error('Analysis failed:', error);
        res.status(500).json({ 
          error: "Analysis failed", 
          details: error instanceof Error ? error.message : String(error)
        });
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error('Failed to cleanup temp directory:', cleanupError);
        }
      }
    } catch (error) {
      console.error('Request processing failed:', error);
      res.status(500).json({ 
        error: "Request processing failed", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ZIP extraction helper function
  async function extractZipFile(zipBuffer: Buffer, tempDir: string): Promise<{ packageJsonContent?: string; sourceFiles: { name: string; content: string }[] }> {
    return new Promise((resolve, reject) => {
      yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipfile) => {
        if (err) return reject(err);
        
        const sourceFiles: { name: string; content: string }[] = [];
        let packageJsonContent: string | undefined;
        
        zipfile.readEntry();
        
        zipfile.on("entry", (entry: any) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry, skip
            zipfile.readEntry();
            return;
          }
          
          // Skip node_modules and hidden files
          if (entry.fileName.includes('node_modules/') || 
              entry.fileName.includes('/.') ||
              entry.fileName.startsWith('.')) {
            zipfile.readEntry();
            return;
          }
          
          zipfile.openReadStream(entry, (err: any, readStream: any) => {
            if (err) return reject(err);
            
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readStream.on('end', () => {
              const content = Buffer.concat(chunks).toString('utf8');
              const fileName = path.basename(entry.fileName);
              
              if (fileName === 'package.json') {
                packageJsonContent = content;
              } else if (/\.(js|ts|jsx|tsx|mjs)$/.test(fileName)) {
                sourceFiles.push({
                  name: entry.fileName,
                  content
                });
              }
              
              zipfile.readEntry();
            });
          });
        });
        
        zipfile.on("end", () => {
          resolve({ packageJsonContent, sourceFiles });
        });
        
        zipfile.on("error", reject);
      });
    });
  }

  // File upload endpoint  
  app.post("/api/analyze", upload.fields([
    { name: 'packageJson', maxCount: 1 },
    { name: 'sourceCode', maxCount: 100 },
    { name: 'projectZip', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};
      
      let packageJsonContent: string;
      let sourceFiles: { name: string; content: string }[] = [];
      
      // Handle ZIP file upload
      if (files.projectZip && files.projectZip.length > 0) {
        const zipFile = files.projectZip[0];
        console.log('Processing ZIP file:', zipFile.originalname, zipFile.size);
        
        try {
          const extracted = await extractZipFile(zipFile.buffer, '');
          
          if (!extracted.packageJsonContent) {
            return res.status(400).json({ error: "No package.json found in ZIP file" });
          }
          
          packageJsonContent = extracted.packageJsonContent;
          sourceFiles = extracted.sourceFiles;
          
          // Validate package.json
          JSON.parse(packageJsonContent);
          
          console.log(`Extracted ${sourceFiles.length} source files from ZIP`);
        } catch (error) {
          console.error('ZIP extraction failed:', error);
          return res.status(400).json({ error: "Failed to extract ZIP file" });
        }
      } else {
        // Handle individual file uploads
        if (!files.packageJson || files.packageJson.length === 0) {
          return res.status(400).json({ error: "package.json file or ZIP file is required" });
        }

        const packageJsonFile = files.packageJson[0];
        
        try {
          packageJsonContent = packageJsonFile.buffer.toString('utf-8');
          JSON.parse(packageJsonContent);
        } catch (error) {
          return res.status(400).json({ error: "Invalid package.json file" });
        }
        
        // Process individual source files
        if (files.sourceCode && files.sourceCode.length > 0) {
          sourceFiles = files.sourceCode.map(file => ({
            name: file.originalname,
            content: file.buffer.toString('utf-8')
          }));
        }
      }

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'depguard-'));
      
      try {
        const auditResult = await runNpmAudit(packageJsonContent, tempDir);
        
        // Process source files if provided
        let codeAnalysis: any = null;
        let astAnalysis: any = null;
        if (sourceFiles.length > 0) {
          const packageJson = JSON.parse(packageJsonContent);
          const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
          
          codeAnalysis = await analyzeCodeUsage(sourceFiles, dependencies);
          
          try {
            astAnalysis = await performASTAnalysis(sourceFiles, dependencies);
          } catch (astError) {
            console.error('AST analysis failed:', astError);
            astAnalysis = null;
          }
        }

        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        
        const enrichedVulnerabilities = await Promise.all(
          auditResult.vulnerabilities.map(async (vuln: any) => {
            try {
              const enrichedVuln = await enrichVulnerabilityWithCVE(vuln);
              
              // Enrich with usage analysis from code and AST analysis
              if (codeAnalysis?.packageUsage[vuln.package] || astAnalysis?.packageUsage[vuln.package]) {
                const codeData = codeAnalysis?.packageUsage[vuln.package];
                const astData = astAnalysis?.packageUsage[vuln.package];
                
                // Create file usage array with actual file names and code instances
                const fileUsage = [];
                if (astData?.fileUsage?.length > 0) {
                  fileUsage.push(...astData.fileUsage);
                } else if (codeData?.filesUsing?.length > 0) {
                  // Fallback to code analysis data
                  codeData.filesUsing.forEach((fileName, index) => {
                    fileUsage.push({
                      fileName,
                      importStatements: codeData.importStatements || [],
                      usageExamples: astData?.usageNodes || [],
                      lineNumbers: []
                    });
                  });
                }
                
                enrichedVuln.usageAnalysis = {
                  filesAffected: fileUsage.length || codeData?.filesUsing?.length || 0,
                  methodsUsed: codeData?.methodsUsed || astData?.exportedSymbols || [],
                  migrationRisk: astData?.migrationRisk || 'low',
                  complexityScore: astData?.complexityScore || 0,
                  fileUsage,
                };
              }
              
              return enrichedVuln;
            } catch (error) {
              console.error(`Failed to enrich vulnerability ${vuln.id}:`, error);
              return vuln;
            }
          })
        );

        const securityScore = calculateSecurityScore(auditResult.metrics);
        
        let aiSuggestions: any[] = [];
        try {
          const packageJson = JSON.parse(packageJsonContent);
          aiSuggestions = await generateMigrationSuggestions(
            enrichedVulnerabilities.slice(0, 5),
            packageJson,
            codeAnalysis
          );
        } catch (aiError) {
          console.error('AI suggestions skipped due to rate limits or model constraints');
        }

        const analysisResult = await storage.saveAnalysisResult({
          sessionId,
          vulnerabilities: enrichedVulnerabilities,
          metrics: auditResult.metrics,
          securityScore,
          dependencyInfo: {
            total: codeAnalysis?.totalFiles || 0,
            vulnerable: enrichedVulnerabilities.length,
            outdated: 0,
            unused: codeAnalysis?.unusedDependencies?.length || 0
          },
          aiSuggestions,
          codeAnalysis,
          astAnalysis
        });

        res.json(analysisResult);

      } catch (error) {
        console.error('Analysis failed:', error);
        res.status(500).json({ 
          error: "Analysis failed", 
          details: error instanceof Error ? error.message : String(error)
        });
      } finally {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error('Failed to cleanup temp directory:', cleanupError);
        }
      }
    } catch (error) {
      console.error('Request processing failed:', error);
      res.status(500).json({ 
        error: "Request processing failed", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/analysis/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const result = await storage.getAnalysisResult(sessionId);
      
      if (!result) {
        return res.status(404).json({ error: "Analysis result not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Failed to fetch analysis result:', error);
      res.status(500).json({ error: "Failed to fetch analysis result" });
    }
  });

  const server = createServer(app);
  return server;
}