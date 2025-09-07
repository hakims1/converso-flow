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

export const useAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AnalysisInvokeResult | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();

  const analyzeConversations = async (opts?: { max?: number; sinceLast?: boolean; cutoffDays?: number }) => {
    if (!session) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to analyze conversations.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-conversations', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          max_to_analyze: opts?.max ?? 75,
          since_last: opts?.sinceLast ?? false,
          respect_tier: false,
          cutoff_days: opts?.cutoffDays ?? 180,
        },
      });

      if (error) {
        throw error;
      }

      const res = data as AnalysisInvokeResult;
      setLastResult(res);

      if (res.success) {
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
