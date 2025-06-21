import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, TrendingUp, Shield, ArrowRight, Copy } from "lucide-react";
import { AIMigrationSuggestion } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AIMigrationSuggestionsProps {
  suggestions: AIMigrationSuggestion[];
}

export function AIMigrationSuggestions({ suggestions }: AIMigrationSuggestionsProps) {
  const { toast } = useToast();

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Code example has been copied to your clipboard.",
      });
    });
  };

  const applyMigration = (suggestion: AIMigrationSuggestion) => {
    toast({
      title: "Migration guide",
      description: `This would show detailed migration instructions for ${suggestion.package}`,
    });
  };

  if (suggestions.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="text-purple-600 w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No AI Suggestions Available</h3>
          <p className="text-slate-600">No migration recommendations were generated for your project.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Bot className="text-purple-600 w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">AI Migration Recommendations</h3>
            <p className="text-sm text-slate-600">Powered by OpenAI GPT-4</p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-6 space-y-6">
        {suggestions.map((suggestion, index) => (
          <div key={suggestion.id || index} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{suggestion.recommendation}</h4>
                <div className="flex items-center space-x-4 text-sm text-slate-600">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {suggestion.estimatedTime}
                  </span>
                  <Badge className={getComplexityColor(suggestion.complexity)}>
                    {suggestion.complexity} complexity
                  </Badge>
                  {suggestion.vulnerabilitiesFixed > 0 && (
                    <span className="flex items-center text-green-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Fixes {suggestion.vulnerabilitiesFixed} vulnerabilities
                    </span>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => applyMigration(suggestion)}
                className="text-blue-600 hover:text-blue-800"
                variant="ghost" 
                size="sm"
              >
                Apply Migration
              </Button>
            </div>
            
            <p className="text-slate-700 mb-4">{suggestion.recommendation}</p>
            
            {/* Code Example */}
            {suggestion.codeExample && (
              <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm mb-4">
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-red-600 mb-1">- Before</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(suggestion.codeExample!.before)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-red-800 bg-red-50 p-2 rounded">
                    {suggestion.codeExample.before}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-green-600 mb-1">+ After</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(suggestion.codeExample!.after)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-green-800 bg-green-50 p-2 rounded">
                    {suggestion.codeExample.after}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-slate-600">
                {suggestion.affectedFiles && (
                  <span>Affected files: {suggestion.affectedFiles}</span>
                )}
                {suggestion.bundleSizeReduction && (
                  <span>Bundle size reduction: {suggestion.bundleSizeReduction}</span>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-600 hover:text-slate-900"
                onClick={() => applyMigration(suggestion)}
              >
                View detailed guide <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
