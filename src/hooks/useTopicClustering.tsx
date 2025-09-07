import { useMemo } from 'react';

interface ConversationWithAnalysis {
  id: string;
  subject: string;
  participants: string[];
  snippet: string;
  last_message_date: string;
  message_count: number;
  thread_id: string;
  analysis?: {
    category: string;
    topic: string | null;
    sentiment: string;
    summary: string | null;
    action_items: string[];
    urgency_score: number | null;
  };
}

interface TopicCluster {
  id: string;
  name: string;
  conversations: ConversationWithAnalysis[];
  keywords: string[];
  category: string;
}

interface CategoryGroup {
  category: string;
  clusters: TopicCluster[];
  totalConversations: number;
}

export function useTopicClustering(conversations: ConversationWithAnalysis[]) {
  return useMemo(() => {
    if (!conversations.length) return [];

    // Helper function to extract keywords from topic
    const extractKeywords = (topic: string): string[] => {
      if (!topic) return [];
      return topic
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .filter(word => !['the', 'and', 'for', 'with', 'from', 'about', 'this', 'that'].includes(word));
    };

    // Helper function to calculate similarity score between two keyword arrays
    const calculateSimilarity = (keywords1: string[], keywords2: string[]): number => {
      if (!keywords1.length || !keywords2.length) return 0;
      
      const set1 = new Set(keywords1);
      const set2 = new Set(keywords2);
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      return intersection.size / union.size; // Jaccard similarity
    };

    // Group conversations by category first
    const categoryGroups = conversations.reduce((acc, conv) => {
      const category = conv.analysis?.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(conv);
      return acc;
    }, {} as Record<string, ConversationWithAnalysis[]>);

    // Process each category
    const categoryResults: CategoryGroup[] = Object.entries(categoryGroups).map(([category, convs]) => {
      const clusters: TopicCluster[] = [];
      const processed = new Set<string>();

      // First pass: Group by exact subject
      const subjectGroups = convs.reduce((acc, conv) => {
        const subject = conv.subject.toLowerCase().trim();
        if (!acc[subject]) {
          acc[subject] = [];
        }
        acc[subject].push(conv);
        return acc;
      }, {} as Record<string, ConversationWithAnalysis[]>);

      // Create clusters for exact subject matches (with multiple conversations)
      Object.entries(subjectGroups).forEach(([subject, subjectConvs]) => {
        if (subjectConvs.length > 1) {
          clusters.push({
            id: `subject-${clusters.length}`,
            name: subject,
            conversations: subjectConvs,
            keywords: extractKeywords(subject),
            category
          });
          subjectConvs.forEach(conv => processed.add(conv.id));
        }
      });

      // Second pass: Group remaining conversations by topic similarity
      const remainingConvs = convs.filter(conv => !processed.has(conv.id));
      
      remainingConvs.forEach(conv => {
        if (processed.has(conv.id)) return;

        const topic = conv.analysis?.topic || conv.subject;
        const keywords = extractKeywords(topic);
        
        // Try to find an existing cluster with similar topic
        const similarCluster = clusters.find(cluster => {
          const similarity = calculateSimilarity(keywords, cluster.keywords);
          return similarity > 0.3; // 30% similarity threshold
        });

        if (similarCluster) {
          similarCluster.conversations.push(conv);
          // Update cluster keywords with union
          const allKeywords = [...similarCluster.keywords, ...keywords];
          similarCluster.keywords = [...new Set(allKeywords)];
        } else {
          // Create new cluster
          clusters.push({
            id: `topic-${clusters.length}`,
            name: topic || 'Untitled',
            conversations: [conv],
            keywords,
            category
          });
        }
        
        processed.add(conv.id);
      });

      // Sort clusters by conversation count (descending)
      clusters.sort((a, b) => b.conversations.length - a.conversations.length);

      return {
        category,
        clusters,
        totalConversations: convs.length
      };
    });

    // Sort categories by total conversation count
    categoryResults.sort((a, b) => b.totalConversations - a.totalConversations);

    return categoryResults;
  }, [conversations]);
}