import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  ExternalLink, 
  Calendar,
  TrendingUp,
  Bug,
  Target,
  Zap
} from 'lucide-react';

interface CVEDetailsProps {
  cveDetails: {
    id: string;
    description: string;
    publishedDate: string;
    lastModifiedDate: string;
    cvssV3?: {
      baseScore: number;
      baseSeverity: string;
      vectorString: string;
      attackVector: string;
      attackComplexity: string;
      privilegesRequired: string;
      userInteraction: string;
      scope: string;
      confidentialityImpact: string;
      integrityImpact: string;
      availabilityImpact: string;
    };
    cvssV2?: {
      baseScore: number;
      baseSeverity: string;
      vectorString: string;
    };
    references: {
      url: string;
      source: string;
      tags?: string[];
    }[];
    hasExploit: boolean;
    patchAvailable: boolean;
    epssScore?: number;
    cisaKev?: boolean;
    threatIntelligence?: {
      exploitInWild: boolean;
      malwareUse: boolean;
      threatActors: string[];
    };
    weaknesses?: {
      source: string;
      type: string;
      description: string;
    }[];
  };
  riskScore?: number;
  priorityLevel?: 'critical' | 'high' | 'medium' | 'low';
}

export function CVEDetailsCard({ cveDetails, riskScore, priorityLevel }: CVEDetailsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              {cveDetails.id}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">{cveDetails.description}</p>
          </div>
          {priorityLevel && (
            <Badge className={`${getPriorityColor(priorityLevel)} text-white`}>
              {priorityLevel.toUpperCase()} PRIORITY
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Critical Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cveDetails.cisaKev && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">CISA KEV</span>
              </div>
              <p className="text-sm text-red-700">Listed in Known Exploited Vulnerabilities</p>
            </div>
          )}

          {cveDetails.hasExploit && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bug className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-900">Exploit Available</span>
              </div>
              <p className="text-sm text-orange-700">Public exploits detected</p>
            </div>
          )}

          {cveDetails.threatIntelligence?.exploitInWild && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">Active Exploitation</span>
              </div>
              <p className="text-sm text-red-700">Exploited in the wild</p>
            </div>
          )}
        </div>

        {/* CVSS Scoring */}
        {(cveDetails.cvssV3 || cveDetails.cvssV2) && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">CVSS Scoring</h4>
            
            {cveDetails.cvssV3 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">CVSS v3.1</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{cveDetails.cvssV3.baseScore}</span>
                    <Badge className={getSeverityColor(cveDetails.cvssV3.baseSeverity)}>
                      {cveDetails.cvssV3.baseSeverity}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Attack Vector:</span>
                    <p className="font-medium">{cveDetails.cvssV3.attackVector}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Complexity:</span>
                    <p className="font-medium">{cveDetails.cvssV3.attackComplexity}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Privileges:</span>
                    <p className="font-medium">{cveDetails.cvssV3.privilegesRequired}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">User Interaction:</span>
                    <p className="font-medium">{cveDetails.cvssV3.userInteraction}</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 font-mono">{cveDetails.cvssV3.vectorString}</p>
                </div>
              </div>
            )}

            {cveDetails.cvssV2 && !cveDetails.cvssV3 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">CVSS v2.0</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{cveDetails.cvssV2.baseScore}</span>
                    <Badge className={getSeverityColor(cveDetails.cvssV2.baseSeverity)}>
                      {cveDetails.cvssV2.baseSeverity}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-600 font-mono">{cveDetails.cvssV2.vectorString}</p>
              </div>
            )}
          </div>
        )}

        {/* Risk Assessment */}
        {(riskScore !== undefined || cveDetails.epssScore !== undefined) && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Risk Assessment</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskScore !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Overall Risk Score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-blue-700">{riskScore}/100</span>
                    <Progress value={riskScore} className="flex-1" />
                  </div>
                </div>
              )}

              {cveDetails.epssScore !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-900">EPSS Score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-purple-700">
                      {(cveDetails.epssScore * 100).toFixed(1)}%
                    </span>
                    <Progress value={cveDetails.epssScore * 100} className="flex-1" />
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Probability of exploitation</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weaknesses (CWE) */}
        {cveDetails.weaknesses && cveDetails.weaknesses.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Weaknesses (CWE)</h4>
            <div className="space-y-2">
              {cveDetails.weaknesses.map((weakness, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-yellow-900">{weakness.type}</span>
                    <Badge variant="outline" className="text-xs">{weakness.source}</Badge>
                  </div>
                  <p className="text-sm text-yellow-800">{weakness.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Threat Intelligence */}
        {cveDetails.threatIntelligence && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Threat Intelligence</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${
                cveDetails.threatIntelligence.exploitInWild 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className="text-sm font-medium">Exploit in Wild</p>
                <p className={`text-xs ${
                  cveDetails.threatIntelligence.exploitInWild ? 'text-red-600' : 'text-green-600'
                }`}>
                  {cveDetails.threatIntelligence.exploitInWild ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div className={`p-3 rounded-lg border ${
                cveDetails.threatIntelligence.malwareUse 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className="text-sm font-medium">Malware Use</p>
                <p className={`text-xs ${
                  cveDetails.threatIntelligence.malwareUse ? 'text-red-600' : 'text-green-600'
                }`}>
                  {cveDetails.threatIntelligence.malwareUse ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                <p className="text-sm font-medium">Threat Actors</p>
                <p className="text-xs text-gray-600">
                  {cveDetails.threatIntelligence.threatActors.length > 0 
                    ? `${cveDetails.threatIntelligence.threatActors.length} identified`
                    : 'None identified'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Timeline</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-gray-600">{formatDate(cveDetails.publishedDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Last Modified</p>
                <p className="text-xs text-gray-600">{formatDate(cveDetails.lastModifiedDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* References */}
        {cveDetails.references && cveDetails.references.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">References</h4>
            <div className="space-y-2">
              {cveDetails.references.slice(0, 5).map((ref, index) => (
                <a
                  key={index}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-600 truncate">{ref.source}</p>
                    <p className="text-xs text-gray-600 truncate">{ref.url}</p>
                  </div>
                  {ref.tags && ref.tags.length > 0 && (
                    <div className="flex gap-1">
                      {ref.tags.slice(0, 2).map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </a>
              ))}
              {cveDetails.references.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{cveDetails.references.length - 5} more references
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}