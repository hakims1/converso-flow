import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, MessageSquare, Users, Calendar, Brain, AlertCircle, CheckCircle, Zap, Info } from "lucide-react";
import { format } from "date-fns";

export function DebugConversations() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loading: analyzing, analyzeConversations } = useAnalysis();
  const { user } = useAuth();

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
            participants
          )
        `)
        .order('processed_at', { ascending: false })
        .limit(20);
        
      if (fetchError) throw fetchError;
      setAnalyses(data || []);
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
                await analyzeConversations({ max: 10, sinceLast: true });
                // Auto-refresh after analysis completes
                setTimeout(() => fetchAnalyses(), 2000);
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
              onClick={fetchAnalyses}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(analysis.processed_at), 'MMM d, yyyy HH:mm')}
                    </span>
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