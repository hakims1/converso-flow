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
      // Get conversations with their latest analysis using a simpler approach
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_date', { ascending: false })
        .limit(50);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        throw convError;
      }

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found');
        setConversations([]);
        return;
      }

      // Get conversation IDs
      const conversationIds = conversationsData.map(conv => conv.id);

      // Fetch analyses for these conversations
      const { data: analysesData, error: analysisError } = await supabase
        .from('conversation_analysis')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('processed_at', { ascending: false });

      if (analysisError) {
        console.error('Error fetching analyses:', analysisError);
        // Don't throw here, just show conversations without analysis
      }

      // Group analyses by conversation_id and get the latest one for each
      const analysisMap = new Map();
      (analysesData || []).forEach(analysis => {
        const convId = analysis.conversation_id;
        const existing = analysisMap.get(convId);
        if (!existing || new Date(analysis.processed_at) > new Date(existing.processed_at)) {
          analysisMap.set(convId, analysis);
        }
      });

      // Transform the data to include the latest analysis per conversation
      const transformedData = conversationsData.map((conv: any) => {
        const analysis = analysisMap.get(conv.id);
        return {
          ...conv,
          analysis: analysis || null
        };
      });

      console.log(`Fetched ${transformedData.length} conversations, ${analysisMap.size} with analyses`);
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