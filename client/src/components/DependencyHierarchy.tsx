import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GitBranch, 
  Package, 
  ArrowRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface DependencyHierarchyProps {
  packageName: string;
  isDirect: boolean;
  dependencyPath?: string[];
}

export function DependencyHierarchy({ 
  packageName, 
  isDirect, 
  dependencyPath 
}: DependencyHierarchyProps) {
  if (isDirect) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Direct Dependency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-900">{packageName}</span>
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              Direct
            </Badge>
          </div>
          <p className="text-sm text-green-700 mt-2">
            This package is directly listed in your package.json dependencies.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Transitive Dependency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Dependency Path */}
          {dependencyPath && dependencyPath.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-orange-900 mb-2">Dependency Chain:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {dependencyPath.map((dep, index) => (
                  <React.Fragment key={index}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span className={`font-medium ${
                        index === 0 ? 'text-green-700' : 
                        index === dependencyPath.length - 1 ? 'text-red-700' : 
                        'text-orange-700'
                      }`}>
                        {dep}
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                          Direct
                        </Badge>
                      )}
                      {index === dependencyPath.length - 1 && (
                        <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                          Vulnerable
                        </Badge>
                      )}
                    </div>
                    {index < dependencyPath.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-orange-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-900">{packageName}</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                Transitive
              </Badge>
            </div>
          )}

          {/* Explanation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">What this means:</span>
            </div>
            <p className="text-sm text-yellow-800">
              This vulnerable package is not directly installed by you, but is required by one of your direct dependencies. 
              You may need to update the parent package or find an alternative.
            </p>
          </div>

          {/* Resolution Strategy */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-1">Resolution Strategy:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Update the direct dependency to a version that uses a secure version of this package</li>
              <li>• Use npm audit fix to automatically resolve if possible</li>
              <li>• Consider using npm overrides to force a specific version</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}