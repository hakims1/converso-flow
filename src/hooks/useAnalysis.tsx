import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AnalysisInvokeResult {
  success: boolean;
  processed?: number;
  skipped?: number;
  remaining?: number;
  results?: Array<{ conversation_id: string; success: boolean; error_code?: string; error_message?: string }>;
  error?: string;
  message?: string;
}

interface AnalysisOptions {
  max?: number;
  sinceLast?: boolean;
  cutoffDays?: number;
  onProgress?: (processed: number, total: number, status?: string) => void;
}

export const useAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisInvokeResult | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const analyzeConversations = async (opts?: AnalysisOptions) => {
    if (!session) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to analyze conversations.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    opts?.onProgress?.(0, opts?.max || 25, 'Starting analysis...');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          max_to_analyze: opts?.max ?? 25,
          since_last: opts?.sinceLast ?? false,
          respect_tier: false,
          cutoff_days: opts?.cutoffDays ?? 14,
        },
      });

      if (error) {
        throw error;
      }

      const res = data as AnalysisInvokeResult;
      setLastResult(res);

      if (res.success) {
        opts?.onProgress?.(res.processed || 0, res.processed || 0, 'Analysis complete!');
        const failed = res.results?.filter((r) => !r.success).length ?? 0;
        toast({
          title: 'Analysis complete',
          description: `Processed ${res.processed ?? 0}, failed ${failed}, remaining ${res.remaining ?? 0}.`,
        });
      } else {
        toast({
          title: 'Analysis failed',
          description: res.error || 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      console.error('Analyze error:', e);
      toast({
        title: 'Analysis failed',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { loading, lastResult, analyzeConversations };
};
