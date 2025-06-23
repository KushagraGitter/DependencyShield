import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GitCompare, AlertTriangle, Zap, Bug, Lock, Clock, CheckCircle } from "lucide-react";
import type { ReleaseNotesComparison } from "@shared/schema";

interface ReleaseNotesComparisonProps {
  comparison: ReleaseNotesComparison;
}

export function ReleaseNotesComparison({ comparison }: ReleaseNotesComparisonProps) {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Release Notes Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Current Version</div>
              <div className="text-lg font-mono">{comparison.currentVersion}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-muted-foreground">Recommended Version</div>
              <div className="text-lg font-mono">{comparison.recommendedVersion}</div>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg mb-4">
            <h4 className="font-semibold mb-2">Summary</h4>
            <p className="text-sm">{comparison.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Badge variant={getComplexityColor(comparison.migrationComplexity)}>
                {comparison.migrationComplexity} Complexity
              </Badge>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{comparison.estimatedMigrationTime}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breaking Changes */}
      {comparison.breakingChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Breaking Changes ({comparison.breakingChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.breakingChanges.map((change, index) => (
                <div key={index} className="border-l-4 border-l-destructive pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {change.type}
                    </Badge>
                    <Badge variant={getImpactColor(change.impact)} className="text-xs">
                      {change.impact} impact
                    </Badge>
                    {change.migrationRequired && (
                      <Badge variant="outline" className="text-xs">
                        Migration Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{change.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Security Fixes */}
        {comparison.securityFixes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 text-sm">
                <Lock className="h-4 w-4" />
                Security Fixes ({comparison.securityFixes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.securityFixes.slice(0, 3).map((fix, index) => (
                  <div key={index} className="text-xs bg-green-50 dark:bg-green-950 p-2 rounded">
                    {fix}
                  </div>
                ))}
                {comparison.securityFixes.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{comparison.securityFixes.length - 3} more...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Features */}
        {comparison.newFeatures.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 text-sm">
                <Zap className="h-4 w-4" />
                New Features ({comparison.newFeatures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.newFeatures.slice(0, 3).map((feature, index) => (
                  <div key={index} className="text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded">
                    {feature}
                  </div>
                ))}
                {comparison.newFeatures.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{comparison.newFeatures.length - 3} more...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bug Fixes */}
        {comparison.bugFixes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600 text-sm">
                <Bug className="h-4 w-4" />
                Bug Fixes ({comparison.bugFixes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {comparison.bugFixes.slice(0, 3).map((fix, index) => (
                  <div key={index} className="text-xs bg-orange-50 dark:bg-orange-950 p-2 rounded">
                    {fix}
                  </div>
                ))}
                {comparison.bugFixes.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{comparison.bugFixes.length - 3} more...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Migration Recommendations */}
      {comparison.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Migration Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deprecations */}
      {comparison.deprecations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Deprecations ({comparison.deprecations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.deprecations.map((dep, index) => (
                <div key={index} className="text-sm bg-yellow-50 dark:bg-yellow-950 p-2 rounded border-l-4 border-l-yellow-500">
                  {dep}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}