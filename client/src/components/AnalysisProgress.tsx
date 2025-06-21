import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Circle } from "lucide-react";
import { AnalysisProgress as AnalysisProgressType } from "@shared/schema";

interface AnalysisProgressProps {
  progress: AnalysisProgressType;
}

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  const steps = [
    "Parsing package.json",
    "Running NPM audit",
    "Analyzing code usage",
    "Generating AI recommendations"
  ];

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < progress.step) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (stepIndex === progress.step) {
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    } else {
      return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStepTextColor = (stepIndex: number) => {
    if (stepIndex < progress.step) {
      return "text-slate-900";
    } else if (stepIndex === progress.step) {
      return "text-slate-900";
    } else {
      return "text-slate-400";
    }
  };

  return (
    <div className="mb-8">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Analysis in Progress</h3>
            <span className="text-sm text-slate-600">
              Step {progress.step + 1} of {progress.total}
            </span>
          </div>
          
          <div className="space-y-3 mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className={`text-sm ${getStepTextColor(index)}`}>
                  {step}
                </span>
                {getStepIcon(index)}
              </div>
            ))}
          </div>

          <div>
            <Progress value={progress.percentage} className="h-2" />
          </div>

          {progress.currentStep && (
            <p className="text-sm text-slate-600 mt-2">
              {progress.currentStep}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
