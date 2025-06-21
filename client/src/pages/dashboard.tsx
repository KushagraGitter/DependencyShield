import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, HelpCircle, Settings } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { VulnerabilityDashboard } from "@/components/VulnerabilityDashboard";
import { VulnerabilityList } from "@/components/VulnerabilityList";
import { AIMigrationSuggestions } from "@/components/AIMigrationSuggestions";
import { useAnalysis } from "@/hooks/useAnalysis";

export default function Dashboard() {
  const [analysisOptions, setAnalysisOptions] = useState({
    deepCodeAnalysis: true,
    aiMigrationSuggestions: true,
  });

  const {
    uploadFiles,
    analysisResult,
    isAnalyzing,
    progress,
    error,
    startAnalysis,
    canStartAnalysis,
  } = useAnalysis();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">DepGuard AI</h1>
              <p className="text-xs text-slate-600">Intelligent NPM Security Analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Upload Section */}
        <div className="mb-8">
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyze Your Project</h2>
                <p className="text-slate-600">Upload your package.json and source files to get started with vulnerability analysis</p>
              </div>
              
              <FileUpload onFilesChange={uploadFiles} />

              {/* Analysis Options */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2">
                      <Checkbox 
                        checked={analysisOptions.deepCodeAnalysis}
                        onCheckedChange={(checked) => 
                          setAnalysisOptions(prev => ({ ...prev, deepCodeAnalysis: !!checked }))
                        }
                      />
                      <span className="text-sm text-slate-700">Deep code analysis</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <Checkbox 
                        checked={analysisOptions.aiMigrationSuggestions}
                        onCheckedChange={(checked) => 
                          setAnalysisOptions(prev => ({ ...prev, aiMigrationSuggestions: !!checked }))
                        }
                      />
                      <span className="text-sm text-slate-700">AI migration suggestions</span>
                    </label>
                  </div>
                  <Button 
                    onClick={() => startAnalysis(analysisOptions)}
                    disabled={!canStartAnalysis || isAnalyzing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isAnalyzing ? "Analyzing..." : "Start Analysis"}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && progress && (
          <AnalysisProgress progress={progress} />
        )}

        {/* Results Dashboard */}
        {analysisResult && (
          <>
            <VulnerabilityDashboard 
              vulnerabilities={analysisResult.vulnerabilities}
              metrics={analysisResult.metrics}
              securityScore={analysisResult.securityScore}
              dependencyInfo={analysisResult.dependencyInfo}
            />

            <VulnerabilityList 
              vulnerabilities={analysisResult.vulnerabilities}
            />

            {analysisResult.aiSuggestions && analysisResult.aiSuggestions.length > 0 && (
              <AIMigrationSuggestions 
                suggestions={analysisResult.aiSuggestions}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
