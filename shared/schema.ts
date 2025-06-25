import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  packageJson: jsonb("package_json").notNull(),
  vulnerabilities: jsonb("vulnerabilities").notNull(),
  securityScore: integer("security_score").notNull(),
  aiSuggestions: jsonb("ai_suggestions"),
  codeAnalysis: jsonb("code_analysis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAnalysisSchema = createInsertSchema(analysisResults).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type InsertAnalysisResult = z.infer<typeof insertAnalysisSchema>;

// Types for analysis data structures
export interface Vulnerability {
  id: string;
  package: string;
  version: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  description: string;
  cve: string;
  cvss: number;
  fixedIn?: string;
  usageAnalysis?: {
    filesAffected: number;
    methodsUsed: string[];
    migrationRisk?: 'low' | 'medium' | 'high';
    complexityScore?: number;
    fileUsage?: {
      fileName: string;
      importStatements: string[];
      usageExamples: string[];
      lineNumbers: number[];
    }[];
  };
  cveDetails: {
    id: string;
    description: string;
    publishedDate: string;
    lastModifiedDate: string;
    cvssV3?: any;
    cvssV2?: any;
    references: any[];
    hasExploit: boolean;
    patchAvailable: boolean;
    exploitabilityScore?: number;
    impactScore?: number;
  };
  hasExploit?: boolean;
  patchAvailable?: boolean;
  exploitabilityScore?: number;
  impactScore?: number;
  references?: any[];
  releaseNotesComparison?: ReleaseNotesComparison;
}

export interface SecurityMetrics {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
}

export interface DependencyInfo {
  total: number;
  vulnerable: number;
  outdated: number;
  unused: number;
}

export interface AIMigrationSuggestion {
  id: string;
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

export interface AnalysisProgress {
  step: number;
  total: number;
  currentStep: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  percentage: number;
}

export interface AutomatedMigration {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  migrationSteps: MigrationStep[];
  overallComplexity: 'low' | 'medium' | 'high';
  automationCoverage: number;
  totalEstimatedTime: string;
  preRequisites: string[];
  postMigrationTasks: string[];
  riskAssessment: {
    dataLoss: 'none' | 'low' | 'medium' | 'high';
    breakingChanges: 'none' | 'minor' | 'major' | 'critical';
    rollbackDifficulty: 'easy' | 'medium' | 'hard';
  };
}

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

export interface ReleaseNotesComparison {
  packageName: string;
  currentVersion: string;
  recommendedVersion: string;
  summary: string;
  breakingChanges: {
    type: 'api' | 'config' | 'dependency' | 'behavior';
    description: string;
    impact: 'low' | 'medium' | 'high';
    migrationRequired: boolean;
  }[];
  newFeatures: string[];
  bugFixes: string[];
  securityFixes: string[];
  deprecations: string[];
  migrationComplexity: 'low' | 'medium' | 'high';
  estimatedMigrationTime: string;
  recommendations: string[];
}
