import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Mail, Brain } from 'lucide-react';

interface ProgressDialogProps {
  isOpen: boolean;
  syncProgress: {
    isComplete: boolean;
    total: number;
    processed: number;
    currentStatus: string;
  };
  analysisProgress: {
    isComplete: boolean;
    total: number;
    processed: number;
    currentStatus: string;
  };
  stage: 'sync' | 'analysis' | 'complete';
}

export function ProgressDialog({ 
  isOpen, 
  syncProgress, 
  analysisProgress, 
  stage 
}: ProgressDialogProps) {
  if (!isOpen) return null;

  const getSyncPercentage = () => {
    if (syncProgress.total === 0) return 0;
    return Math.round((syncProgress.processed / syncProgress.total) * 100);
  };

  const getAnalysisPercentage = () => {
    if (analysisProgress.total === 0) return 0;
    return Math.round((analysisProgress.processed / analysisProgress.total) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="relative w-full max-w-md bg-white dark:bg-neutral-900 border shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stage === 'complete' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 animate-pulse text-primary" />
            )}
            {stage === 'sync' && 'Syncing Emails'}
            {stage === 'analysis' && 'Analyzing Conversations'}
            {stage === 'complete' && 'Analysis Complete'}
          </CardTitle>
          <CardDescription>
            {stage === 'sync' && 'Fetching your recent email conversations...'}
            {stage === 'analysis' && 'AI is analyzing your conversations for insights...'}
            {stage === 'complete' && 'Your email analysis is ready!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gmail Sync Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Gmail Sync</span>
              </div>
              {syncProgress.isComplete ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : stage === 'sync' ? (
                <Badge variant="secondary">
                  {syncProgress.processed}/{syncProgress.total}
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <Progress 
              value={syncProgress.isComplete ? 100 : getSyncPercentage()} 
              className="h-2"
            />
            {stage === 'sync' && (
              <p className="text-xs text-muted-foreground">
                {syncProgress.currentStatus}
              </p>
            )}
          </div>

          {/* Analysis Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Analysis</span>
              </div>
              {analysisProgress.isComplete ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              ) : stage === 'analysis' ? (
                <Badge variant="secondary">
                  {analysisProgress.processed}/{analysisProgress.total}
                </Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
            <Progress 
              value={analysisProgress.isComplete ? 100 : getAnalysisPercentage()} 
              className="h-2"
            />
            {stage === 'analysis' && (
              <p className="text-xs text-muted-foreground">
                {analysisProgress.currentStatus}
              </p>
            )}
          </div>

          {stage === 'complete' && (
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Found {analysisProgress.total} conversations to review
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}