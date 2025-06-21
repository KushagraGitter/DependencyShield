import { users, analysisResults, type User, type InsertUser, type AnalysisResult, type InsertAnalysisResult } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveAnalysisResult(analysis: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResult(sessionId: string): Promise<AnalysisResult | undefined>;
  getAnalysisResultById(id: number): Promise<AnalysisResult | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analysisResults: Map<number, AnalysisResult>;
  private analysisResultsBySession: Map<string, AnalysisResult>;
  private currentUserId: number;
  private currentAnalysisId: number;

  constructor() {
    this.users = new Map();
    this.analysisResults = new Map();
    this.analysisResultsBySession = new Map();
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveAnalysisResult(analysis: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.currentAnalysisId++;
    const result: AnalysisResult = {
      ...analysis,
      id,
      createdAt: new Date(),
      aiSuggestions: analysis.aiSuggestions || null,
      codeAnalysis: analysis.codeAnalysis || null,
    };
    
    this.analysisResults.set(id, result);
    this.analysisResultsBySession.set(analysis.sessionId, result);
    
    return result;
  }

  async getAnalysisResult(sessionId: string): Promise<AnalysisResult | undefined> {
    return this.analysisResultsBySession.get(sessionId);
  }

  async getAnalysisResultById(id: number): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(id);
  }
}

export const storage = new MemStorage();
