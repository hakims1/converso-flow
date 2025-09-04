import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, MessageSquare, Users, Calendar, Brain, AlertCircle, CheckCircle, Zap, Info, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export function DebugConversations() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loading: analyzing, analyzeConversations, lastResult } = useAnalysis();
  const { user } = useAuth();

  // Sorting helper functions
  const getMessageGroup = (messageCount: number): number => {
    if (messageCount >= 50) return 1;
    if (messageCount >= 25) return 2; 
    if (messageCount >= 5) return 3;
    if (messageCount >= 2) return 4;
    return 5;
  };

  const sortConversationsByPriority = (analyses: any[]): any[] => {
    return [...analyses].sort((a, b) => {
      const aMessageCount = a.conversations?.message_count || 1;
      const bMessageCount = b.conversations?.message_count || 1;
      const aGroup = getMessageGroup(aMessageCount);
      const bGroup = getMessageGroup(bMessageCount);
      
      // Primary: Message group (ascending - smaller group number = higher priority)
      if (aGroup !== bGroup) {
        return aGroup - bGroup;
      }
      
      // Secondary: Urgency score (descending - higher score = higher priority)
      const aUrgency = a.urgency_score || 0;
      const bUrgency = b.urgency_score || 0;
      if (aUrgency !== bUrgency) {
        return bUrgency - aUrgency;
      }
      
      // Tertiary: Date (descending - more recent = higher priority)
      const aDate = new Date(a.conversations?.last_message_date || a.processed_at);
      const bDate = new Date(b.conversations?.last_message_date || b.processed_at);
      return bDate.getTime() - aDate.getTime();
    });
  };

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('conversation_analysis')
        .select(`
          *,
          conversations (
            subject,
            participants,
            thread_id,
            message_count,
            last_message_date
          )
        `)
        .limit(75); // Show 75 most recent analyzed conversations
        
      if (fetchError) throw fetchError;
      
      // Apply sophisticated sorting
      const sortedData = sortConversationsByPriority(data || []);
      setAnalyses(sortedData);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

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
              <Brain className="h-5 w-5" />
              Claude Analysis Results
            </CardTitle>
            <CardDescription>
              Raw AI analysis output from Claude ({analyses.length} analyses)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await analyzeConversations({ max: 75, sinceLast: true });
                // Auto-refresh after analysis completes
                setTimeout(() => fetchAnalyses(), 2000);
              }}
              disabled={analyzing}
              className="gap-2"
            >
              <Zap className={`h-4 w-4 ${analyzing ? 'animate-pulse' : ''}`} />
              {analyzing ? 'Analyzing...' : 'Analyze New/Updated'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await analyzeConversations({ max: 5000, sinceLast: false });
                setTimeout(() => fetchAnalyses(), 2000);
              }}
              disabled={analyzing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Re-analyzing...' : 'Refresh (Re-analyze all)'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAnalyses}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh List
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

        {lastResult && (
          <Alert className="mb-4">
            <AlertDescription>
              {`Processed ${lastResult.processed ?? 0}, failed ${(lastResult.results?.filter(r => !r.success).length) ?? 0}, remaining ${lastResult.remaining ?? 0}.`}
            </AlertDescription>
          </Alert>
        )}

        {loading && !analyses.length && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading analyses...</p>
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div className="text-center py-8">
            <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No analyses found. Try running analysis first.</p>
          </div>
        )}

        {analyses.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {analyses.map((analysis) => (
              <div key={analysis.id} className="border rounded-lg p-4 space-y-3 bg-background/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">
                        {analysis.conversations?.subject || 'No Subject'}
                      </h3>
                      <Badge 
                        variant={
                          analysis.completion_status === 'complete' ? 'default' :
                          analysis.completion_status === 'pending_response' || analysis.completion_status === 'needs_followup' ? 'destructive' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {analysis.completion_status}
                      </Badge>
                    </div>
                     <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                       <Users className="h-3 w-3" />
                       <span>
                         {analysis.conversations?.participants?.join(', ') || 'No participants'}
                       </span>
                       <MessageSquare className="h-3 w-3 ml-2" />
                       <span>{analysis.conversations?.message_count || 1} messages</span>
                       <Badge 
                         variant="secondary" 
                         className="ml-2 text-xs"
                       >
                         Group {getMessageGroup(analysis.conversations?.message_count || 1)}
                       </Badge>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(analysis.processed_at), 'MMM d, yyyy HH:mm')}</span>
                    {analysis.conversations?.thread_id && (
                      <Button asChild variant="outline" size="sm" className="ml-2">
                        <a
                          href={`https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(user?.email || '')}#inbox/${analysis.conversations.thread_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open conversation in Gmail"
                        >
                          Open in Gmail
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <Brain className="h-3 w-3" />
                    Claude Analysis Output
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Category:</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {analysis.category}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Sentiment:</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {analysis.sentiment}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Status:</span>
                      <Badge 
                        variant={
                          analysis.completion_status === 'complete' ? 'default' :
                          analysis.completion_status === 'pending_response' || analysis.completion_status === 'needs_followup' ? 'destructive' : 'secondary'
                        }
                        className="ml-1 text-xs"
                      >
                        {analysis.completion_status}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Urgency:</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {analysis.urgency_score || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  {analysis.topic && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Topic:</span>
                      <span className="ml-1">{analysis.topic}</span>
                    </div>
                  )}

                  {analysis.summary && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Summary:</span>
                      <p className="mt-1 text-foreground/80">{analysis.summary}</p>
                    </div>
                  )}

                  {analysis.action_items && analysis.action_items.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Action Items:</span>
                      <ul className="mt-1 space-y-1">
                        {analysis.action_items.map((item, index) => (
                          <li key={index} className="text-foreground/80 flex items-start gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.suggested_response && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Suggested Response:</span>
                      <p className="mt-1 italic text-foreground/80">{analysis.suggested_response}</p>
                    </div>
                  )}

                  {analysis.key_contacts && analysis.key_contacts.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium text-muted-foreground">Key Contacts:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.key_contacts.map((contact, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {contact}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    Analysis ID: {analysis.id.substring(0, 8)}...
                  </Badge>
                  <span>Conversation ID: {analysis.conversation_id.substring(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}