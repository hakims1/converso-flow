import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, MessageSquare, Users, Calendar, Brain, AlertCircle, CheckCircle, Zap, Info, ExternalLink } from "lucide-react";
import { format } from "date-fns";

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
  conversation?: {
    subject: string;
    participants: string[];
    message_count: number;
    thread_id: string;
    last_message_date: string;
  };
}

interface AnalysisAttempt {
  id: string;
  conversation_id: string;
  attempt_number: number;
  status: 'pending' | 'success' | 'failed' | 'rate_limited';
  error_message?: string;
  error_code?: string;
  claude_request_id?: string;
  processing_time_ms?: number;
  created_at: string;
  completed_at?: string;
  conversation?: {
    subject: string;
    participants: string[];
    message_count: number;
    thread_id: string;
    last_message_date: string;
  };
}

export function DebugConversations() {
  const [analyses, setAnalyses] = useState<ConversationAnalysis[]>([]);
  const [attempts, setAttempts] = useState<AnalysisAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const { loading: analyzing, analyzeConversations, lastResult } = useAnalysis();
  const { user, session } = useAuth();
  const { toast } = useToast();

  // Sorting helper functions
  const getMessageGroup = (messageCount: number): number => {
    if (messageCount >= 50) return 1;
    if (messageCount >= 25) return 2; 
    if (messageCount >= 5) return 3;
    if (messageCount >= 2) return 4;
    return 5;
  };

  const sortConversationsByPriority = (analyses: ConversationAnalysis[]): ConversationAnalysis[] => {
    return [...analyses].sort((a, b) => {
      const aMessageCount = a.conversation?.message_count || 1;
      const bMessageCount = b.conversation?.message_count || 1;
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
      const aDate = new Date(a.conversation?.last_message_date || a.processed_at);
      const bDate = new Date(b.conversation?.last_message_date || b.processed_at);
      return bDate.getTime() - aDate.getTime();
    });
  };

  const fetchAnalyses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch successful analyses
      const { data: analysisData, error: fetchError } = await supabase
        .from('conversation_analysis')
        .select(`
          *,
          conversation:conversations(subject, participants, message_count, thread_id, last_message_date)
        `)
        .order('processed_at', { ascending: false });
        
      if (fetchError) {
        throw fetchError;
      }
      
      // Fetch all analysis attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('conversation_analysis_attempts')
        .select(`
          *,
          conversation:conversations(subject, participants, message_count, thread_id, last_message_date)
        `)
        .order('created_at', { ascending: false });
        
      if (attemptsError) {
        throw attemptsError;
      }
      
      // Sort by message count (descending), then urgency, then date
      const sorted = sortConversationsByPriority(analysisData || []);
      setAnalyses(sorted);
      setAttempts(attemptsData || []);
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

  const handleFetchAndAnalyze = async () => {
    console.log('Starting fetch and analysis workflow...');
    
    // First fetch latest emails from Gmail
    const gmailResponse = await supabase.functions.invoke('gmail-sync', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: { 
        access_token: session?.provider_token,
        since_days: 7, // Fetch emails from last 7 days
        max_threads: 100
      }
    });
    
    if (gmailResponse.error) {
      toast({
        title: 'Gmail sync failed',
        description: gmailResponse.error.message || 'Failed to fetch latest emails',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('Gmail sync complete, starting analysis...');
    
    // Then analyze conversations (focusing on recent ones for free users)
    await analyzeConversations({ max: 100, sinceLast: true });
    // Auto-refresh after analysis completes
    setTimeout(() => fetchAnalyses(), 3000);
  };

  const handleReanalyzeAll = async () => {
    await analyzeConversations({ max: 5000, sinceLast: false });
    setTimeout(() => fetchAnalyses(), 2000);
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            onClick={handleFetchAndAnalyze}
            disabled={analyzing}
            variant="default"
            size="sm"
          >
            {analyzing ? 'Processing...' : 'Fetch Latest & Analyze'}
          </Button>
          
          <Button 
            onClick={handleReanalyzeAll}
            disabled={analyzing}
            variant="secondary"
            size="sm"
          >
            {analyzing ? 'Analyzing...' : 'Refresh (Re-analyze all)'}
          </Button>
          
          <Button 
            onClick={fetchAnalyses}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Loading...' : 'Refresh List'}
          </Button>
          
          <Button 
            onClick={() => setShowAttempts(!showAttempts)}
            variant="outline"
            size="sm"
          >
            {showAttempts ? 'Show Analyses' : 'Show All Attempts'}
          </Button>
        </div>
        
        <div className="bg-muted p-3 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Successful:</span> {analyses.length}
            </div>
            <div>
              <span className="font-medium">Total Attempts:</span> {attempts.length}
            </div>
            <div>
              <span className="font-medium">Failed:</span> {attempts.filter(a => a.status === 'failed').length}
            </div>
            <div>
              <span className="font-medium">Rate Limited:</span> {attempts.filter(a => a.status === 'rate_limited').length}
            </div>
          </div>
        </div>

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

        {loading && <p className="text-muted-foreground">Loading data...</p>}
        
        {!loading && !error && !showAttempts && analyses.length === 0 && (
          <p className="text-muted-foreground">No successful analyses found. Click "Fetch Latest & Analyze" to process your conversations.</p>
        )}
        
        {!loading && !error && showAttempts && attempts.length === 0 && (
          <p className="text-muted-foreground">No analysis attempts found.</p>
        )}
        
        {!loading && !error && !showAttempts && analyses.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Successful Analyses ({analyses.length})</h3>
            {analyses.map((analysis) => (
              <div key={analysis.id} className="border rounded-lg p-4 space-y-3 bg-background/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">
                        {analysis.conversation?.subject || 'No Subject'}
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
                         {analysis.conversation?.participants?.join(', ') || 'No participants'}
                       </span>
                       <MessageSquare className="h-3 w-3 ml-2" />
                       <span>{analysis.conversation?.message_count || 1} messages</span>
                       <Badge 
                         variant="secondary" 
                         className="ml-2 text-xs"
                       >
                         Group {getMessageGroup(analysis.conversation?.message_count || 1)}
                       </Badge>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(analysis.processed_at), 'MMM d, yyyy HH:mm')}</span>
                    {analysis.conversation?.thread_id && (
                      <Button asChild variant="outline" size="sm" className="ml-2">
                        <a
                          href={`https://mail.google.com/mail/u/0/?authuser=${encodeURIComponent(user?.email || '')}#inbox/${analysis.conversation.thread_id}`}
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
        
        {!loading && !error && showAttempts && (
          <div className="space-y-4">
            <h3 className="font-medium text-lg">All Analysis Attempts ({attempts.length})</h3>
            {attempts.map((attempt) => (
              <div key={attempt.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      {attempt.conversation?.subject || `Conversation ${attempt.conversation_id.slice(0, 8)}`}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Participants: {attempt.conversation?.participants?.join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      attempt.status === 'success' ? 'default' : 
                      attempt.status === 'pending' ? 'secondary' :
                      attempt.status === 'rate_limited' ? 'outline' : 'destructive'
                    }>
                      {attempt.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {attempt.conversation?.message_count || 0} msgs
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Created: {new Date(attempt.created_at).toLocaleString()}</div>
                  {attempt.completed_at && (
                    <div>Completed: {new Date(attempt.completed_at).toLocaleString()}</div>
                  )}
                  {attempt.processing_time_ms && (
                    <div>Processing Time: {attempt.processing_time_ms}ms</div>
                  )}
                  {attempt.claude_request_id && (
                    <div>Claude Request ID: {attempt.claude_request_id}</div>
                  )}
                </div>
                
                {attempt.error_message && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded p-2">
                    <p className="text-sm text-destructive">
                      <strong>{attempt.error_code}:</strong> {attempt.error_message}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}