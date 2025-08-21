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
  labels: string[];
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

  const syncGmail = async () => {
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
      hasProviderToken: !!session.provider_token
    });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          access_token: session.provider_token ?? '',
        },
      });

      console.log('📡 Gmail sync response:', { data, error });

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
        
        // Trigger analysis of newly synced conversations
        try {
          console.log('🧠 Triggering conversation analysis...');
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-conversations', {
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: { max_to_analyze: 10, since_last: true, respect_tier: true }
          });
          
          if (analysisError) {
            console.error('Analysis trigger error:', analysisError);
          } else {
            console.log('✅ Analysis triggered successfully:', analysisData);
          }
        } catch (analysisErr) {
          console.error('Failed to trigger analysis:', analysisErr);
        }
        
        toast({
          title: 'Gmail Synced',
          description: `Successfully loaded ${response.messages.length} recent emails.`,
        });
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

  return {
    messages,
    loading,
    totalCount,
    needsReauth,
    syncGmail
  };
};