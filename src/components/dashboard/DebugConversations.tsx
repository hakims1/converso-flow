import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConversationAnalysis } from "@/hooks/useConversationAnalysis";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, MessageSquare, Users, Calendar, Brain, AlertCircle, CheckCircle, Zap, Info } from "lucide-react";
import { format } from "date-fns";

export function DebugConversations() {
  const { conversations, loading, error, refetch } = useConversationAnalysis();
  const { loading: analyzing, analyzeConversations } = useAnalysis();
  const { user } = useAuth();

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
              View synced Gmail conversations with AI analysis results ({conversations.length} conversations)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await analyzeConversations({ max: 10, sinceLast: true });
                // Auto-refresh after analysis completes
                setTimeout(() => refetch(), 2000);
              }}
              disabled={analyzing}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
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
        </div>
      </CardHeader>
      <CardContent>
        {/* Preview Authentication Notice */}
        {!user && window.location.pathname.includes('preview') && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Preview Mode:</strong> You're viewing the dashboard in preview mode. 
              To see actual conversation data, please <strong>sign in with email/password</strong> using the Auth page.
              Google OAuth won't work in this preview iframe.
            </AlertDescription>
          </Alert>
        )}
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">
                        {conversation.subject || 'No Subject'}
                      </h3>
                      {conversation.analysis ? (
                        <div title="AI Analyzed">
                          <Brain className="h-3 w-3 text-green-500" />
                        </div>
                      ) : (
                        <div title="Not analyzed">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        </div>
                      )}
                    </div>
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

                {conversation.analysis && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                      <Brain className="h-3 w-3" />
                      AI Analysis
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-muted-foreground">Category:</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {conversation.analysis.category}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Sentiment:</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {conversation.analysis.sentiment}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <Badge 
                          variant={
                            conversation.analysis.completion_status === 'complete' ? 'default' :
                            conversation.analysis.completion_status === 'need_to_respond' ? 'destructive' : 'secondary'
                          }
                          className="ml-1 text-xs"
                        >
                          {conversation.analysis.completion_status}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Urgency:</span>
                        <Badge variant="outline" className="ml-1 text-xs">
                          {conversation.analysis.urgency_score || 'N/A'}
                        </Badge>
                      </div>
                    </div>

                    {conversation.analysis.topic && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Topic:</span>
                        <span className="ml-1">{conversation.analysis.topic}</span>
                      </div>
                    )}

                    {conversation.analysis.summary && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Summary:</span>
                        <p className="mt-1 text-foreground/80">{conversation.analysis.summary}</p>
                      </div>
                    )}

                    {conversation.analysis.action_items && conversation.analysis.action_items.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Action Items:</span>
                        <ul className="mt-1 space-y-1">
                          {conversation.analysis.action_items.map((item, index) => (
                            <li key={index} className="text-foreground/80 flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {conversation.analysis.suggested_response && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Suggested Response:</span>
                        <p className="mt-1 italic text-foreground/80">{conversation.analysis.suggested_response}</p>
                      </div>
                    )}
                  </div>
                )}

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