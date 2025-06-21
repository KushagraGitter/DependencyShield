import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Bot, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Code, 
  Play, 
  Download,
  Shield,
  Target,
  Zap
} from "lucide-react";
import { AutomatedMigration, MigrationStep } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AutomatedMigrationGuideProps {
  migrations: AutomatedMigration[];
}

export function AutomatedMigrationGuide({ migrations }: AutomatedMigrationGuideProps) {
  const [selectedMigration, setSelectedMigration] = useState<string | null>(
    migrations.length > 0 ? migrations[0].packageName : null
  );
  const { toast } = useToast();

  const migration = migrations.find(m => m.packageName === selectedMigration);

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none':
      case 'easy':
      case 'low': return 'text-green-600';
      case 'minor':
      case 'medium': return 'text-yellow-600';
      case 'major':
      case 'hard':
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const executeStep = (step: MigrationStep) => {
    if (step.automated) {
      toast({
        title: "Automated step executed",
        description: `${step.title} has been applied successfully.`,
      });
    } else {
      toast({
        title: "Manual review required",
        description: `Please review and manually apply: ${step.title}`,
        variant: "destructive",
      });
    }
  };

  if (migrations.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="text-blue-600 w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Automated Migrations Available</h3>
          <p className="text-slate-600">No critical vulnerabilities requiring automated migration were found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Zap className="text-purple-600 w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Automated Migration Guide</h3>
            <p className="text-sm text-slate-600">Step-by-step migration instructions with code generation</p>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {migrations.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Package:</label>
            <select 
              value={selectedMigration || ''} 
              onChange={(e) => setSelectedMigration(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {migrations.map(migration => (
                <option key={migration.packageName} value={migration.packageName}>
                  {migration.packageName} ({migration.fromVersion} → {migration.toVersion})
                </option>
              ))}
            </select>
          </div>
        )}

        {migration && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="steps">Migration Steps</TabsTrigger>
              <TabsTrigger value="code">Code Changes</TabsTrigger>
              <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Migration Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Package:</span>
                      <span className="font-medium">{migration.packageName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="font-medium">{migration.fromVersion} → {migration.toVersion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Steps:</span>
                      <span className="font-medium">{migration.migrationSteps.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Time:</span>
                      <span className="font-medium">{migration.totalEstimatedTime}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Automation Coverage</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Automated Steps</span>
                      <span>{migration.automationCoverage}%</span>
                    </div>
                    <Progress value={migration.automationCoverage} className="h-2" />
                    <Badge className={getComplexityColor(migration.overallComplexity)}>
                      {migration.overallComplexity} complexity
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Prerequisites</h4>
                  <ul className="space-y-2">
                    {migration.preRequisites.map((req, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Post-Migration Tasks</h4>
                  <ul className="space-y-2">
                    {migration.postMigrationTasks.map((task, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="steps" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-900">Migration Steps</h4>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Play className="w-4 h-4 mr-2" />
                  Run All Automated Steps
                </Button>
              </div>

              <Accordion type="single" collapsible className="space-y-2">
                {migration.migrationSteps.map((step, index) => (
                  <AccordionItem key={step.id} value={step.id} className="border border-slate-200 rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-left">{step.title}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {step.automated ? (
                            <Badge className="bg-green-100 text-green-800">Auto</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">Manual</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {step.estimatedTime}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        <p className="text-sm text-slate-700">{step.description}</p>
                        
                        {step.codeChanges && step.codeChanges.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3">
                            <h5 className="text-sm font-medium text-slate-900 mb-2">Code Changes</h5>
                            {step.codeChanges.map((change, changeIndex) => (
                              <div key={changeIndex} className="mb-2 last:mb-0">
                                <div className="text-xs text-slate-600 mb-1">File: {change.file}</div>
                                {change.changes.map((c, cIndex) => (
                                  <div key={cIndex} className="bg-white rounded border p-2 text-xs font-mono">
                                    <div className="text-red-600 mb-1">- {c.oldCode}</div>
                                    <div className="text-green-600">+ {c.newCode}</div>
                                    <div className="text-slate-500 mt-1 text-xs">{c.explanation}</div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button 
                            onClick={() => executeStep(step)}
                            variant={step.automated ? "default" : "outline"}
                            size="sm"
                          >
                            {step.automated ? (
                              <>
                                <Zap className="w-3 h-3 mr-1" />
                                Apply Automatically
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Manual Review Required
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-900">Generated Code Transformations</h4>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Migration Script
                </Button>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <div className="text-green-400 mb-2">#!/bin/bash</div>
                <div className="text-slate-300"># Automated migration script for {migration.packageName}</div>
                <div className="text-slate-300"># Generated by DepGuard AI</div>
                <div className="mt-4">
                  {migration.migrationSteps
                    .filter(step => step.automated)
                    .map((step, index) => (
                      <div key={index} className="mb-2">
                        <div className="text-blue-400"># Step {index + 1}: {step.title}</div>
                        {step.codeChanges?.map((change, changeIndex) => (
                          <div key={changeIndex}>
                            <div className="text-yellow-400">echo "Updating {change.file}..."</div>
                            {change.changes.map((c, cIndex) => (
                              <div key={cIndex} className="text-white">
                                sed -i 's/{c.oldCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/{c.newCode}/g' {change.file}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <h4 className="font-semibold text-slate-900">Risk Assessment</h4>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-slate-900">Data Loss Risk</span>
                  </div>
                  <div className={`font-semibold ${getRiskColor(migration.riskAssessment.dataLoss)}`}>
                    {migration.riskAssessment.dataLoss.toUpperCase()}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-slate-900">Breaking Changes</span>
                  </div>
                  <div className={`font-semibold ${getRiskColor(migration.riskAssessment.breakingChanges)}`}>
                    {migration.riskAssessment.breakingChanges.toUpperCase()}
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-900">Rollback Difficulty</span>
                  </div>
                  <div className={`font-semibold ${getRiskColor(migration.riskAssessment.rollbackDifficulty)}`}>
                    {migration.riskAssessment.rollbackDifficulty.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-yellow-800 mb-1">Important Recommendations</h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Always test migrations in a development environment first</li>
                      <li>• Create a complete backup before starting the migration</li>
                      <li>• Run your test suite after each major step</li>
                      <li>• Monitor application performance after migration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}