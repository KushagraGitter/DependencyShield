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
  cve?: string;
  cvss?: number;
  fixedIn?: string;
  usageAnalysis?: {
    filesAffected: number;
    methodsUsed: string[];
  };
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
