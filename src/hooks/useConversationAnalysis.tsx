import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationAnalysis {
  id: string;
  conversation_id: string;
  sentiment: string;
  category: string;
  topic: string | null;
  summary: string | null;
  completion_status: string;
  action_items: string[];
  key_contacts: string[];
  urgency_score: number | null;
  suggested_response: string | null;
  processed_at: string;
}

interface ConversationWithAnalysis {
  id: string;
  subject: string;
  participants: string[];
  snippet: string;
  full_content: string;
  last_message_date: string;
  message_count: number;
  thread_id: string;
  analysis?: ConversationAnalysis;
}

export function useConversationAnalysis() {
  const [conversations, setConversations] = useState<ConversationWithAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyzedConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      // First fetch conversations with their latest analysis
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_analysis (
            id,
            conversation_id,
            sentiment,
            category,
            topic,
            summary,
            completion_status,
            action_items,
            key_contacts,
            urgency_score,
            suggested_response,
            processed_at
          )
        `)
        .order('last_message_date', { ascending: false })
        .limit(50);

      if (convError) {
        throw convError;
      }

      // Transform the data to include only the latest analysis per conversation
      const transformedData = conversationsData?.map((conv: any) => {
        const analyses = conv.conversation_analysis || [];
        const latestAnalysis = analyses.length > 0 
          ? analyses.reduce((latest: any, current: any) => 
              new Date(current.processed_at) > new Date(latest.processed_at) ? current : latest
            )
          : null;

        return {
          ...conv,
          analysis: latestAnalysis
        };
      }) || [];

      setConversations(transformedData);
    } catch (err) {
      console.error('Error fetching analyzed conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analyzed conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyzedConversations();
  }, []);

  return {
    conversations,
    loading,
    error,
    refetch: fetchAnalyzedConversations
  };
}