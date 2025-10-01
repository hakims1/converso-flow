import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/hooks/use-toast';
import { useGmail } from '@/hooks/useGmail';
import { ProgressDialog } from '@/components/ProgressDialog';
import { AnalysisPage } from '@/components/AnalysisPage';
import { useState } from 'react';

export default function Analyze() {
  const navigate = useNavigate();
  const { analyzeConversations, loading } = useAnalysis();
  const { toast } = useToast();
  const { syncGmail, loading: syncing } = useGmail();
  
  const [showProgress, setShowProgress] = useState(false);
  const [stage, setStage] = useState<'sync' | 'analysis' | 'complete'>('sync');
  const [syncProgress, setSyncProgress] = useState({
    isComplete: false,
    total: 0,
    processed: 0,
    currentStatus: 'Initializing...'
  });
  const [analysisProgress, setAnalysisProgress] = useState({
    isComplete: false,
    total: 0,
    processed: 0,
    currentStatus: 'Waiting for sync...'
  });
  const handleAnalyze = async () => {
    try {
      setShowProgress(true);
      setStage('sync');
      setSyncProgress({
        isComplete: false,
        total: 30,
        processed: 0,
        currentStatus: 'Connecting to Gmail...'
      });

      // Show progress animation during sync
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.processed < prev.total - 5) {
            return {
              ...prev,
              processed: prev.processed + 1,
              currentStatus: `Syncing conversations... (${prev.processed + 1}/${prev.total})`
            };
          }
          return prev;
        });
      }, 2000); // Update every 2 seconds

      try {
        await syncGmail({ 
          sinceDays: 14, 
          maxThreads: 30,
          fullHistory: false, 
          silent: true 
        });
      } finally {
        clearInterval(progressInterval);
      }
      
      setSyncProgress({
        isComplete: true,
        total: 30,
        processed: 30,
        currentStatus: 'Sync complete!'
      });

      // Start analysis phase
      setStage('analysis');
      setAnalysisProgress({
        isComplete: false,
        total: 25, // Reduced for faster results
        processed: 0,
        currentStatus: 'Starting AI analysis...'
      });

      await analyzeConversations({ 
        sinceLast: true, 
        cutoffDays: 14, 
        max: 25,
        onProgress: (processed, total, status) => {
          setAnalysisProgress({
            isComplete: false,
            total,
            processed,
            currentStatus: status || 'Analyzing conversations...'
          });
        }
      });

      setAnalysisProgress(prev => ({
        ...prev,
        isComplete: true,
        currentStatus: 'Analysis complete!'
      }));
      
      setStage('complete');
      
      // Brief delay to show completion
      setTimeout(() => {
        setShowProgress(false);
        toast({
          title: "Analysis Complete",
          description: "Your emails have been analyzed successfully!",
        });
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      setShowProgress(false);
      toast({
        title: "Analysis Failed", 
        description: "There was an error analyzing your emails. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleBack = () => {
    navigate('/');
  };

  return (
    <>
      <AnalysisPage 
        onAnalyze={handleAnalyze}
        onBack={handleBack}
        loading={loading || syncing}
      />
      
      <ProgressDialog
        isOpen={showProgress}
        syncProgress={syncProgress}
        analysisProgress={analysisProgress}
        stage={stage}
      />
    </>
  );
}