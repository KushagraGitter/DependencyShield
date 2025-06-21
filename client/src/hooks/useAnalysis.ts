import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnalysisProgress, Vulnerability, SecurityMetrics, DependencyInfo, AIMigrationSuggestion, AutomatedMigration } from "@shared/schema";

interface AnalysisResult {
  id: number;
  sessionId: string;
  vulnerabilities: Vulnerability[];
  metrics: SecurityMetrics;
  securityScore: number;
  aiSuggestions?: AIMigrationSuggestion[];
  automatedMigrations?: AutomatedMigration[];
  dependencyInfo?: DependencyInfo | null;
}

interface AnalysisOptions {
  deepCodeAnalysis: boolean;
  aiMigrationSuggestions: boolean;
}

export function useAnalysis() {
  const [uploadedFiles, setUploadedFiles] = useState<{
    packageJson?: File;
    sourceFiles: File[];
  }>({ sourceFiles: [] });
  
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);

  const analysismutation = useMutation({
    mutationFn: async ({ files, options }: { files: typeof uploadedFiles; options: AnalysisOptions }) => {
      if (!files.packageJson) {
        throw new Error("package.json file is required");
      }

      const formData = new FormData();
      formData.append('packageJson', files.packageJson);
      
      files.sourceFiles.forEach(file => {
        formData.append('sourceFiles', file);
      });

      // Simulate progress updates
      setProgress({
        step: 0,
        total: 4,
        currentStep: "Uploading files...",
        status: 'running',
        percentage: 25
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update progress
      setProgress(prev => prev ? {
        ...prev,
        step: 1,
        currentStep: "Running NPM audit...",
        percentage: 50
      } : null);

      const result = await response.json();

      // Update progress
      setProgress(prev => prev ? {
        ...prev,
        step: 2,
        currentStep: "Analyzing code usage...",
        percentage: 75
      } : null);

      // Simulate final step
      setTimeout(() => {
        setProgress(prev => prev ? {
          ...prev,
          step: 3,
          currentStep: "Generating AI recommendations...",
          percentage: 100,
          status: 'completed'
        } : null);
      }, 500);

      return result as AnalysisResult;
    },
    onError: (error) => {
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        currentStep: `Error: ${error.message}`
      } : null);
    },
    onSuccess: () => {
      setTimeout(() => {
        setProgress(null);
      }, 2000);
    }
  });

  const uploadFiles = useCallback((files: { packageJson?: File; sourceFiles: File[] }) => {
    setUploadedFiles(files);
  }, []);

  const startAnalysis = useCallback((options: AnalysisOptions) => {
    if (!uploadedFiles.packageJson) return;
    
    analysismutation.mutate({ files: uploadedFiles, options });
  }, [uploadedFiles, analysismutation]);

  const canStartAnalysis = uploadedFiles.packageJson !== undefined;

  return {
    uploadFiles,
    analysisResult: analysismutation.data,
    isAnalyzing: analysismutation.isPending,
    progress,
    error: analysismutation.error?.message,
    startAnalysis,
    canStartAnalysis,
  };
}
