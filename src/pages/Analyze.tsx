import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useToast } from '@/hooks/use-toast';
import { useGmail } from '@/hooks/useGmail';
import { ProgressDialog } from '@/components/ProgressDialog';
import { AnalysisPage } from '@/components/AnalysisPage';
import { useState } from 'react';

interface TierLimits {
  sinceDays: number;
  maxThreads: number;
  maxAnalysis: number;
}

export default function Analyze() {
  const navigate = useNavigate();
  const { analyzeConversations, loading } = useAnalysis();
  const { toast } = useToast();
  const { syncGmail, loading: syncing } = useGmail();
  
  const [isPaidMode, setIsPaidMode] = useState(false);
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

  // Tier-based limits
  const tierLimits: TierLimits = isPaidMode 
    ? { sinceDays: 90, maxThreads: 500, maxAnalysis: 500 } // Paid: 3 months, analyze all
    : { sinceDays: 30, maxThreads: 50, maxAnalysis: 50 };   // Free: 30 days, 50 emails
  const handleAnalyze = async () => {
    try {
      console.log(`🔵 Starting analysis flow in ${isPaidMode ? 'PAID' : 'FREE'} mode...`, tierLimits);
      setShowProgress(true);
      setStage('sync');
      setSyncProgress({
        isComplete: false,
        total: tierLimits.maxThreads,
        processed: 0,
        currentStatus: 'Syncing Gmail conversations...'
      });

      try {
        console.log('📧 Calling syncGmail with params:', {
          sinceDays: tierLimits.sinceDays,
          maxThreads: tierLimits.maxThreads
        });
        await syncGmail({ 
          sinceDays: tierLimits.sinceDays,
          maxThreads: tierLimits.maxThreads,
          fullHistory: false, 
          silent: true 
        });
        console.log('✅ syncGmail completed');
      } catch (syncError) {
        console.error('❌ syncGmail failed:', syncError);
        throw syncError;
      }
      
      setSyncProgress({
        isComplete: true,
        total: tierLimits.maxThreads,
        processed: tierLimits.maxThreads,
        currentStatus: 'Sync complete!'
      });

      // Start analysis phase
      setStage('analysis');
      setAnalysisProgress({
        isComplete: false,
        total: tierLimits.maxAnalysis,
        processed: 0,
        currentStatus: 'Analyzing conversations with AI...'
      });

      console.log('🤖 Starting AI analysis with max:', tierLimits.maxAnalysis);
      await analyzeConversations({ 
        sinceLast: true, 
        cutoffDays: tierLimits.sinceDays, 
        max: tierLimits.maxAnalysis,
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

  const handleTogglePaidMode = () => {
    setIsPaidMode(!isPaidMode);
    toast({
      title: isPaidMode ? 'Switched to Free Mode' : 'Switched to Paid Mode',
      description: isPaidMode 
        ? 'Will analyze last 30 days (up to 50 emails)'
        : 'Will analyze last 90 days (up to 500 emails)',
    });
  };

  return (
    <>
      <AnalysisPage 
        onAnalyze={handleAnalyze}
        onBack={handleBack}
        loading={loading || syncing}
        isPaidMode={isPaidMode}
        onTogglePaidMode={handleTogglePaidMode}
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