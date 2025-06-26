import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Package, 
  ArrowRight, 
  ExternalLink, 
  TrendingUp,
  CheckCircle,
  Copy
} from 'lucide-react';

interface AlternativePackagesProps {
  packageName: string;
  alternatives: string[];
  deprecationInfo?: {
    message: string;
    date: string;
    isDeprecated: boolean;
  };
}

export function AlternativePackagesCard({ 
  packageName, 
  alternatives, 
  deprecationInfo 
}: AlternativePackagesProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Package Deprecated - Alternative Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deprecation Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-900">Deprecated Package</span>
            <Badge variant="destructive">
              DEPRECATED
            </Badge>
          </div>
          
          {deprecationInfo && (
            <>
              <p className="text-sm text-red-700 mb-2">
                <strong>Deprecation Message:</strong> {deprecationInfo.message}
              </p>
              <p className="text-xs text-red-600">
                Deprecated on: {formatDate(deprecationInfo.date)}
              </p>
            </>
          )}
          
          <p className="text-sm text-red-700 mt-2">
            This package is no longer maintained and may have security vulnerabilities. 
            Consider migrating to one of the recommended alternatives below.
          </p>
        </div>

        {/* Migration Recommendation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Recommended Migration Path</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <code className="bg-red-100 text-red-800 px-2 py-1 rounded font-mono">
              {packageName}
            </code>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-blue-700">Choose an alternative below</span>
          </div>
        </div>

        {/* Alternative Packages */}
        {alternatives && alternatives.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Recommended Alternatives
            </h4>
            
            <div className="grid gap-3">
              {alternatives.map((alternative, index) => (
                <div 
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900">{alternative}</span>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        RECOMMENDED
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(`npm install ${alternative}`)}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Install
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://www.npmjs.com/package/${alternative}`, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Package
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    Modern alternative to {packageName} with active maintenance and security updates.
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Actively maintained</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Security patches</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Community support</span>
                    </div>
                  </div>

                  {/* Installation Command */}
                  <div className="mt-3 p-2 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Installation command:</p>
                    <code className="text-sm font-mono text-gray-800">
                      npm install {alternative}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Migration Steps */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-3">Migration Steps</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
            <li>Choose one of the recommended alternatives above</li>
            <li>Review the alternative package's documentation for API differences</li>
            <li>Install the new package: <code className="bg-yellow-100 px-1 rounded">npm install [alternative]</code></li>
            <li>Update your imports and code to use the new package</li>
            <li>Remove the deprecated package: <code className="bg-yellow-100 px-1 rounded">npm uninstall {packageName}</code></li>
            <li>Test your application thoroughly</li>
            <li>Update your documentation and team about the change</li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="font-medium text-red-900 text-sm">Security Advisory</span>
          </div>
          <p className="text-xs text-red-700">
            Deprecated packages may contain unpatched security vulnerabilities. 
            Migration should be prioritized to maintain application security.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}