import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';

interface CVESearchResult {
  id: string;
  description: string;
  severity: string;
  score: number;
  publishedDate: string;
  affectedPackages: string[];
}

export function CVETracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCVE, setSelectedCVE] = useState<string | null>(null);

  // Mock data for demonstration
  const mockCVEs: CVESearchResult[] = [
    {
      id: 'CVE-2024-1234',
      description: 'Critical vulnerability in React allowing arbitrary code execution',
      severity: 'critical',
      score: 9.8,
      publishedDate: '2024-06-20',
      affectedPackages: ['react', 'react-dom']
    },
    {
      id: 'CVE-2024-5678',
      description: 'High severity vulnerability in lodash merge function',
      severity: 'high',
      score: 7.5,
      publishedDate: '2024-06-18',
      affectedPackages: ['lodash']
    },
    {
      id: 'CVE-2024-9012',
      description: 'Medium severity vulnerability in express middleware',
      severity: 'medium',
      score: 5.3,
      publishedDate: '2024-06-15',
      affectedPackages: ['express']
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredCVEs = searchTerm 
    ? mockCVEs.filter(cve => 
        cve.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cve.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cve.affectedPackages.some(pkg => pkg.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : mockCVEs;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            CVE Vulnerability Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search CVEs by ID, description, or package name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Critical CVEs</p>
                <p className="text-2xl font-bold text-red-600">1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High CVEs</p>
                <p className="text-2xl font-bold text-orange-600">1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Shield className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Medium CVEs</p>
                <p className="text-2xl font-bold text-yellow-600">1</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tracked</p>
                <p className="text-2xl font-bold text-blue-600">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CVE Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent CVEs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCVEs.map((cve) => (
              <div
                key={cve.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedCVE(cve.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-lg">{cve.id}</h3>
                    <Badge className={getSeverityColor(cve.severity)}>
                      {cve.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-medium">CVSS: {cve.score}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(cve.publishedDate).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-gray-700 mb-3">{cve.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Affected packages:</span>
                    <div className="flex gap-1">
                      {cve.affectedPackages.map((pkg, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {pkg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}

            {filteredCVEs.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No CVEs Found</h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? `No CVEs match your search for "${searchTerm}"`
                    : 'No CVEs to display'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent CVE Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">
                  New critical CVE published: CVE-2024-1234
                </p>
                <p className="text-xs text-red-700">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  CVE-2024-5678 updated with new patch information
                </p>
                <p className="text-xs text-blue-700">6 hours ago</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  CVE-2024-0123 marked as resolved with new package version
                </p>
                <p className="text-xs text-green-700">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}