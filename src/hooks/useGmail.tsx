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
}

export const useGmail = () => {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      const response: GmailSyncResponse = data;
      
      if (response.success) {
        setMessages(response.messages);
        setTotalCount(response.totalCount);
        toast({
          title: 'Gmail Synced',
          description: `Successfully loaded ${response.messages.length} recent emails.`,
        });
      } else {
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
    syncGmail
  };
};