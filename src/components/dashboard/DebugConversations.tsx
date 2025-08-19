import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConversations } from "@/hooks/useConversations";
import { RefreshCw, MessageSquare, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

export function DebugConversations() {
  const { conversations, loading, error, refetch } = useConversations();

  const truncateContent = (content: string, maxLength: number = 500) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Debug: Conversations
            </CardTitle>
            <CardDescription>
              View synced Gmail conversation data (last {conversations.length} conversations)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-md">
            Error: {error}
          </div>
        )}

        {loading && !conversations.length && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No conversations found. Try syncing your Gmail first.</p>
          </div>
        )}

        {conversations.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="border rounded-lg p-4 space-y-3 bg-background/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">
                      {conversation.subject || 'No Subject'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Users className="h-3 w-3" />
                      <span>
                        {conversation.participants?.join(', ') || 'No participants'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(conversation.last_message_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="text-xs">
                  <div className="font-medium mb-1 text-muted-foreground">Content Preview:</div>
                  <div className="text-foreground/80 bg-muted/30 p-2 rounded text-xs leading-relaxed">
                    {conversation.full_content 
                      ? truncateContent(conversation.full_content)
                      : conversation.snippet || 'No content available'
                    }
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
                  </Badge>
                  <span>Thread: {conversation.thread_id.substring(0, 12)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}