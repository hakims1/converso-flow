import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, Clock, User, AlertTriangle } from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

const GmailSync = () => {
  const { messages, loading, totalCount, needsReauth, syncGmail } = useGmail();
  const { session, signInWithGoogle } = useAuth();
  const [hasInitialSync, setHasInitialSync] = useState(false);
  
  // Check if user has Gmail permissions
  // We can't reliably detect Gmail permissions from token presence alone
  // We need to try calling the Gmail API to know for sure
  const hasGmailPermissions = session?.provider_token && !needsReauth;
  const showReauthButton = !session?.provider_token || needsReauth;

  const handleSync = async () => {
    await syncGmail();
    setHasInitialSync(true);
  };

  // Auto-check Gmail permissions on component mount if user is authenticated
  useEffect(() => {
    if (session?.provider_token && !hasInitialSync && !needsReauth) {
      // Automatically try to sync to detect permission issues
      syncGmail();
    }
  }, [session, hasInitialSync, needsReauth, syncGmail]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect and sync your Gmail inbox to get AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showReauthButton ? (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {needsReauth 
                  ? 'Gmail read permissions are missing or expired. Please re-authorize to continue syncing emails.'
                  : 'Gmail permissions are required to sync your emails and get AI insights. Please authorize access to your Gmail to use this feature.'
                }
              </AlertDescription>
            </Alert>
          ) : null}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showReauthButton ? (
                <Button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {needsReauth ? 'Re-authorize Gmail Access' : 'Authorize Gmail Access'}
                </Button>
              ) : (
                <Button
                  onClick={handleSync}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Syncing...' : hasInitialSync ? 'Refresh Emails' : 'Sync Gmail'}
                </Button>
              )}
              {totalCount > 0 && (
                <Badge variant="secondary">
                  {totalCount} total emails
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Emails</CardTitle>
            <CardDescription>
              Your latest Gmail messages (showing {messages.length} most recent)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {message.from}
                        </span>
                      </div>
                      <h4 className="font-medium text-foreground mb-2 truncate">
                        {message.subject}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.snippet}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(message.date)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {message.labels.slice(0, 2).map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GmailSync;