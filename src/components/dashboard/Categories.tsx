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

export function Categories() {
  const { conversations, loading, error } = useConversationAnalysis();
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