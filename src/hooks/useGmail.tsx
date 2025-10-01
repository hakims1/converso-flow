import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  content: string;
  labels: string[];
  url: string;
}

export interface GmailSyncResponse {
  success: boolean;
  messages: GmailMessage[];
  totalCount: number;
  error?: string;
  message?: string;
}

export const useGmail = () => {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [needsReauth, setNeedsReauth] = useState(false);
  const { session } = useAuth();
  const { toast } = useToast();

  const syncGmail = async (opts?: { sinceDays?: number; maxThreads?: number; fullHistory?: boolean; silent?: boolean; incremental?: boolean }) => {
    if (!session) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to sync your Gmail.',
        variant: 'destructive'
      });
      return;
    }

    console.log('🔄 Starting Gmail sync...', {
      hasSession: !!session,
      hasAccessToken: !!session.access_token,
      hasProviderToken: !!session.provider_token,
      opts
    });

    const sinceDays = opts?.sinceDays ?? (opts?.incremental ? 7 : 180); // Incremental: 7 days, Full: 6 months
    const maxThreads = opts?.maxThreads ?? (opts?.incremental ? 50 : 100);
    const fullHistory = opts?.fullHistory ?? false;

    setLoading(true);
    try {
      console.log('🚀 Invoking gmail-sync function...', {
        hasSession: !!session,
        userId: session?.user?.id,
        params: { fullHistory, sinceDays, maxThreads }
      });

      // Add timeout to prevent indefinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gmail sync timeout after 2 minutes')), 120000)
      );

      const syncPromise = supabase.functions.invoke('gmail-sync', {
        body: {
          full_history: fullHistory,
          since_days: sinceDays,
          max_threads: maxThreads,
        },
      });

      const result = await Promise.race([syncPromise, timeoutPromise]) as any;
      const { data, error } = result;

      console.log('📡 Gmail sync response:', { 
        success: data?.success,
        messageCount: data?.messages?.length,
        error: error?.message,
        rawError: error 
      });

      if (error) {
        // Check if it's a permissions error
        if (error.message?.includes('GMAIL_PERMISSIONS_REQUIRED') || 
            (error.details && error.details.includes('403'))) {
          setNeedsReauth(true);
          // Don't show toast for permission errors - handled in UI
          return;
        }
        throw error;
      }

      const response: GmailSyncResponse = data;
      
      if (response.success) {
        setMessages(response.messages);
        setTotalCount(response.totalCount);
        setNeedsReauth(false);
        
        // Analysis is now manual. Users can trigger it from the dashboard when ready.
        
        if (!opts?.silent) {
          toast({
            title: opts?.incremental ? 'Latest Emails Synced' : 'Gmail Synced',
            description: `Successfully loaded ${response.messages.length} ${opts?.incremental ? 'new ' : ''}emails.`,
          });
        }
      } else {
        // Check for specific permission errors
        if (response.error === 'GMAIL_PERMISSIONS_REQUIRED') {
          setNeedsReauth(true);
          // Don't show toast for permission errors - handled in UI
          return;
        }
        throw new Error(response.error || 'Failed to sync Gmail');
      }
    } catch (error: any) {
      console.error('Gmail sync error:', error);
      toast({
        title: 'Gmail Sync Failed',
        description: error.message || 'Failed to sync your Gmail. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Incremental sync - only gets new emails since last sync
  const syncLatestEmails = async () => {
    await syncGmail({ incremental: true, silent: false });
  };

  return {
    messages,
    loading,
    totalCount,
    needsReauth,
    syncGmail,
    syncLatestEmails
  };
};