import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Conversation {
  id: string;
  subject: string;
  participants: string[];
  snippet: string;
  full_content?: string; // Now optional since we store encrypted content separately
  last_message_date: string;
  message_count: number;
  thread_id: string;
  participant_avatars?: { [email: string]: string | null };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_date', { ascending: false })
        .limit(75);

      if (dbError) {
        throw dbError;
      }

      const conversationsData = data || [];

      // Extract all unique participant emails
      const allEmails = new Set<string>();
      conversationsData.forEach(conv => {
        conv.participants?.forEach(email => allEmails.add(email));
      });

      // Fetch avatars for all participants
      let avatarsMap: { [email: string]: string | null } = {};
      if (allEmails.size > 0) {
        try {
          const { data: avatarData } = await supabase.functions.invoke('fetch-contact-avatars', {
            body: { emails: Array.from(allEmails) }
          });

          if (avatarData?.avatars) {
            avatarsMap = avatarData.avatars.reduce((acc: any, avatar: any) => {
              acc[avatar.email] = avatar.avatar_url;
              return acc;
            }, {});
          }
        } catch (avatarError) {
          console.warn('Failed to fetch avatars:', avatarError);
        }
      }

      // Add avatars to conversations
      const conversationsWithAvatars = conversationsData.map(conv => ({
        ...conv,
        participant_avatars: conv.participants?.reduce((acc: any, email) => {
          acc[email] = avatarsMap[email] || null;
          return acc;
        }, {}) || {}
      }));

      setConversations(conversationsWithAvatars);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations
  };
}