import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Search, ExternalLink, Clock, Users } from "lucide-react";
import { useConversationAnalysis } from "@/hooks/useConversationAnalysis";
import { useTopicClustering } from "@/hooks/useTopicClustering";
import { formatDistanceToNow } from "date-fns";

// Dummy data for preview
const dummyConversations = [
  {
    id: '1',
    subject: 'Investor Platform Pitch to Bain',
    participants: ['john@example.com', 'sarah@bain.com'],
    snippet: 'Following up on our discussion about the investment platform...',
    last_message_date: '2024-01-15T10:30:00Z',
    message_count: 8,
    thread_id: 'thread_1',
    analysis: {
      category: 'Business',
      topic: 'Investor Platform Pitch to Bain',
      sentiment: 'Positive',
      summary: 'Ongoing discussion about investment platform pitch',
      action_items: ['Send follow-up presentation', 'Schedule demo'],
      urgency_score: 8
    }
  },
  {
    id: '2',
    subject: 'Startup Investment Platform Pitch',
    participants: ['alex@startup.com', 'mike@venture.com'],
    snippet: 'Excited to share our investment platform proposal...',
    last_message_date: '2024-01-14T14:20:00Z',
    message_count: 12,
    thread_id: 'thread_2',
    analysis: {
      category: 'Business',
      topic: 'Startup Investment Platform Pitch',
      sentiment: 'Positive',
      summary: 'Investment platform pitch discussion',
      action_items: ['Prepare term sheet', 'Review legal docs'],
      urgency_score: 9
    }
  },
  {
    id: '3',
    subject: 'Meeting Request - Q1 Planning',
    participants: ['team@company.com', 'manager@company.com'],
    snippet: 'We need to schedule our quarterly planning session...',
    last_message_date: '2024-01-13T09:15:00Z',
    message_count: 4,
    thread_id: 'thread_3',
    analysis: {
      category: 'Internal',
      topic: 'Quarterly Planning Meeting',
      sentiment: 'Neutral',
      summary: 'Planning Q1 meeting logistics',
      action_items: ['Book conference room', 'Prepare agenda'],
      urgency_score: 6
    }
  },
  {
    id: '4',
    subject: 'Meeting Request - Q1 Strategy',
    participants: ['strategy@company.com', 'ceo@company.com'],
    snippet: 'Strategic planning for Q1 initiatives...',
    last_message_date: '2024-01-12T16:45:00Z',
    message_count: 6,
    thread_id: 'thread_4',
    analysis: {
      category: 'Internal',
      topic: 'Q1 Strategy Planning',
      sentiment: 'Neutral',
      summary: 'Strategic planning discussion',
      action_items: ['Review objectives', 'Align on priorities'],
      urgency_score: 7
    }
  },
  {
    id: '5',
    subject: 'Customer Support Issue #1234',
    participants: ['support@company.com', 'customer@client.com'],
    snippet: 'Customer experiencing login issues with our platform...',
    last_message_date: '2024-01-11T11:30:00Z',
    message_count: 15,
    thread_id: 'thread_5',
    analysis: {
      category: 'Support',
      topic: 'Login Authentication Issues',
      sentiment: 'Negative',
      summary: 'Customer login problem resolution',
      action_items: ['Debug authentication', 'Update customer'],
      urgency_score: 8
    }
  },
  {
    id: '6',
    subject: 'Technical Support - API Integration',
    participants: ['dev@company.com', 'partner@integration.com'],
    snippet: 'Having trouble with the API integration documentation...',
    last_message_date: '2024-01-10T13:20:00Z',
    message_count: 9,
    thread_id: 'thread_6',
    analysis: {
      category: 'Support',
      topic: 'API Integration Support',
      sentiment: 'Neutral',
      summary: 'API integration troubleshooting',
      action_items: ['Update documentation', 'Provide code examples'],
      urgency_score: 5
    }
  },
  {
    id: '7',
    subject: 'Marketing Campaign - Q1 Launch',
    participants: ['marketing@company.com', 'agency@creative.com'],
    snippet: 'Finalizing the creative assets for our Q1 campaign...',
    last_message_date: '2024-01-09T15:10:00Z',
    message_count: 7,
    thread_id: 'thread_7',
    analysis: {
      category: 'Marketing',
      topic: 'Q1 Marketing Campaign',
      sentiment: 'Positive',
      summary: 'Campaign planning and asset creation',
      action_items: ['Approve final designs', 'Set launch date'],
      urgency_score: 7
    }
  },
  {
    id: '8',
    subject: 'Social Media Strategy Discussion',
    participants: ['social@company.com', 'influencer@media.com'],
    snippet: 'Exploring partnership opportunities for social media...',
    last_message_date: '2024-01-08T10:45:00Z',
    message_count: 5,
    thread_id: 'thread_8',
    analysis: {
      category: 'Marketing',
      topic: 'Social Media Partnership Strategy',
      sentiment: 'Positive',
      summary: 'Social media collaboration discussion',
      action_items: ['Draft partnership agreement', 'Plan content calendar'],
      urgency_score: 4
    }
  }
];

export function Categories() {
  // Use dummy data instead of real API
  const conversations = dummyConversations;
  const loading = false;
  const error = null;
  const categoryGroups = useTopicClustering(conversations);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const openGmailThread = (threadId: string) => {
    const gmailUrl = `https://mail.google.com/mail/u/0/#search/in%3Aanywhere+rfc822msgid%3A${threadId}`;
    window.open(gmailUrl, '_blank');
  };

  const filteredGroups = categoryGroups.map(group => ({
    ...group,
    clusters: group.clusters.map(cluster => ({
      ...cluster,
      conversations: cluster.conversations.filter(conv =>
        conv.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (conv.analysis?.topic && conv.analysis.topic.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    })).filter(cluster => cluster.conversations.length > 0)
  })).filter(group => group.clusters.length > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">Categories</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading conversation categories...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">Categories</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">Error: {error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">Categories</h1>
          <p className="text-muted-foreground">Conversations grouped by topic and subject similarity</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations, topics, or participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      {filteredGroups.length > 0 ? (
        <Tabs defaultValue={filteredGroups[0]?.category} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
            {filteredGroups.slice(0, 6).map((group) => (
              <TabsTrigger key={group.category} value={group.category} className="text-xs">
                {group.category}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {group.totalConversations}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {filteredGroups.map((group) => (
            <TabsContent key={group.category} value={group.category} className="space-y-4">
              {group.clusters.map((cluster) => (
                <Card key={cluster.id} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCluster(cluster.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {expandedClusters.has(cluster.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{cluster.name}</CardTitle>
                          <CardDescription>
                            {cluster.conversations.length} conversation{cluster.conversations.length !== 1 ? 's' : ''}
                            {cluster.keywords.length > 0 && (
                              <span className="ml-2">
                                • Keywords: {cluster.keywords.slice(0, 3).join(', ')}
                                {cluster.keywords.length > 3 && '...'}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {cluster.conversations.length}
                      </Badge>
                    </div>
                  </CardHeader>

                  {expandedClusters.has(cluster.id) && (
                    <CardContent className="pt-0">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {cluster.conversations.map((conv) => (
                            <Card key={conv.id} className="p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-start justify-between space-x-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium truncate">{conv.subject}</h4>
                                    {conv.analysis?.urgency_score && conv.analysis.urgency_score > 7 && (
                                      <Badge variant="destructive" className="text-xs">High Priority</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                                    <div className="flex items-center space-x-1">
                                      <Users className="h-3 w-3" />
                                      <span>{conv.participants.length} participant{conv.participants.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{formatDistanceToNow(new Date(conv.last_message_date), { addSuffix: true })}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>

                                  <p className="text-sm text-muted-foreground truncate mb-2">
                                    {conv.snippet}
                                  </p>

                                  {conv.analysis && (
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline" className="text-xs">
                                        {conv.analysis.sentiment}
                                      </Badge>
                                      {conv.analysis.topic && (
                                        <Badge variant="secondary" className="text-xs">
                                          {conv.analysis.topic}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openGmailThread(conv.thread_id)}
                                  className="shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {searchTerm ? 'No conversations match your search criteria.' : 'No analyzed conversations found.'}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}