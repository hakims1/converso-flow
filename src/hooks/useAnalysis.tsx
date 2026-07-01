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

    // Analyze in small batches that each complete well within the edge-function /
    // request time limit, looping until nothing is left. A single large call used
    // to time out mid-run (leaving most conversations unanalyzed + orphaned
    // "pending" attempt rows). since_last:true means each call takes the NEXT
    // not-yet-analyzed batch, so the loop steadily drains the backlog.
    const batchSize = opts?.max ?? 8;
    const cutoffDays = opts?.cutoffDays ?? 180; // cover synced history, not just 2 weeks
    const maxIterations = 40; // safety cap (40 * 8 = 320 conversations)

    let totalProcessed = 0;
    let totalFailed = 0;
    let prevRemaining = Number.POSITIVE_INFINITY;

    opts?.onProgress?.(0, 0, 'Starting analysis...');

    try {
      for (let i = 0; i < maxIterations; i++) {
        const { data, error } = await supabase.functions.invoke('analyze-conversations', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            max_to_analyze: batchSize,
            since_last: true,
            respect_tier: false,
            cutoff_days: cutoffDays,
          },
        });

        if (error) throw error;

        const res = data as AnalysisInvokeResult;
        setLastResult(res);

        // No conversations in window (or a soft error) -> stop cleanly.
        if (!res.success) {
          if (res.error === 'NO_CONVERSATIONS') break;
          throw new Error(res.error || res.message || 'Analysis failed');
        }

        totalProcessed += res.processed ?? 0;
        totalFailed += res.results?.filter((r) => !r.success).length ?? 0;
        const remaining = res.remaining ?? 0;

        opts?.onProgress?.(
          totalProcessed,
          totalProcessed + remaining,
          `Analyzed ${totalProcessed}, ${remaining} remaining...`
        );

        if (remaining === 0) break;
        // No progress this round (e.g. a batch that all errored) -> stop to avoid a loop.
        if ((res.processed ?? 0) === 0 || remaining >= prevRemaining) break;
        prevRemaining = remaining;
      }

      opts?.onProgress?.(totalProcessed, totalProcessed, 'Analysis complete!');
      toast({
        title: 'Analysis complete',
        description: `Analyzed ${totalProcessed} conversation${totalProcessed === 1 ? '' : 's'}${
          totalFailed ? `, ${totalFailed} could not be processed` : ''
        }.`,
      });
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
