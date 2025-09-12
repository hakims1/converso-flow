import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Search, Filter, MessageSquare, Calendar, User, Clock, RefreshCw, Zap } from "lucide-react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from 'date-fns';

export function Conversations() {
  const analysis = useAnalysis();
  const { conversations, loading, error, refetch } = useConversations();
  const { session } = useAuth();
  const { toast } = useToast();
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
    
    // Refresh conversations list to show new ones
    await refetch();
    
    // Then analyze conversations (focusing on recent ones)
    await analysis.analyzeConversations({ max: 75, sinceLast: true });
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
          <p className="text-muted-foreground">
            View and analyze your email conversations with AI insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gradient-primary text-white border-0" onClick={handleFetchAndAnalyze} disabled={analysis.loading}>
            {analysis.loading ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-pulse" />
                Fetching & Analyzing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Fetch Latest & Analyze
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => analysis.analyzeConversations({ max: 5000, sinceLast: false })}
            disabled={analysis.loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh (Re-analyze all)
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Find specific conversations quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9"
                disabled
              />
            </div>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            {conversations.length > 0 
              ? `Showing ${conversations.length} recent email conversations`
              : 'Your most recent email conversations'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Conversations</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={refetch} variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your Gmail account to see your conversations here. 
                We'll analyze your recent emails and provide AI-powered insights.
              </p>
              <Button className="gradient-primary text-white border-0">
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={conversation.participant_avatars?.[conversation.participants[0]] || undefined} 
                          alt={conversation.participants[0] || 'Contact'} 
                        />
                        <AvatarFallback>
                          {conversation.participants[0] 
                            ? conversation.participants[0].charAt(0).toUpperCase()
                            : 'U'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{conversation.participants[0] || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {conversation.participants.length > 1 
                            ? `+${conversation.participants.length - 1} others`
                            : conversation.participants[0]
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">Email</Badge>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message_date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium mb-1">{conversation.subject}</div>
                    <div className="text-muted-foreground line-clamp-2">
                      {conversation.snippet}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>{conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>Thread ID: {conversation.thread_id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Conversation Preview (for demo) */}
      <Card className="gradient-card shadow-card opacity-50">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Preview: What you'll see</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>C{i}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Sample Contact {i}</div>
                      <div className="text-sm text-muted-foreground">contact{i}@example.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Sales</Badge>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">2 days ago</span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Subject: Product Demo Request</div>
                  <div className="text-muted-foreground">
                    Hi, I'm interested in learning more about your product features and pricing...
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>3 messages</span>
                  <span>•</span>
                  <span>Avg response: 2h 15m</span>
                  <span>•</span>
                  <span>2 action items detected</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}