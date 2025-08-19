import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, Clock, User, AlertTriangle } from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { useGmailPermissions } from '@/hooks/useGmailPermissions';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
const GmailSync = () => {
  const {
    messages,
    loading,
    totalCount,
    syncGmail
  } = useGmail();
  const gmailPermissions = useGmailPermissions();
  const {
    session,
    signInWithGoogle
  } = useAuth();
  const [hasInitialSync, setHasInitialSync] = useState(false);

  // Use centralized permission checking
  const showReauthButton = gmailPermissions.needsReauth;
  const handleSync = async () => {
    await syncGmail();
    setHasInitialSync(true);
  };

  // Check permissions on initial load
  useEffect(() => {
    if (session && !gmailPermissions.isChecking) {
      console.log('📧 Checking Gmail permissions on component mount...');
      gmailPermissions.checkPermissions();
    }
  }, [session]);

  // Auto-sync when permissions are available
  useEffect(() => {
    if (gmailPermissions.hasPermissions && !hasInitialSync && !loading) {
      console.log('🚀 Auto-syncing Gmail conversations...');
      syncGmail();
      setHasInitialSync(true);
    }
  }, [gmailPermissions.hasPermissions, hasInitialSync, loading, syncGmail]);

  // Re-check permissions when returning from OAuth (focus/visibility)
  useEffect(() => {
    const onFocus = () => {
      if (gmailPermissions.needsReauth) {
        gmailPermissions.checkPermissions();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [gmailPermissions.needsReauth]);
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, {
        addSuffix: true
      });
    } catch {
      return 'Unknown date';
    }
  };
  return <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Sync
            </CardTitle>
            <CardDescription>
              Sync your Gmail conversations to analyze them
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showReauthButton && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Gmail permissions need to be renewed. Please re-authenticate to continue syncing.
                </AlertDescription>
              </Alert>
            )}
            
            {gmailPermissions.isChecking ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Checking Gmail permissions...</p>
              </div>
            ) : showReauthButton ? (
              <Button onClick={() => signInWithGoogle(true)} className="w-full">
                Re-authenticate with Gmail
              </Button>
            ) : (
              <Button 
                onClick={handleSync} 
                disabled={loading || !session}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Syncing Gmail...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Gmail Conversations
                  </>
                )}
              </Button>
            )}
            
            {totalCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Total emails processed: {totalCount}
              </p>
            )}
          </CardContent>
        </Card>

      {messages.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Recent Emails</CardTitle>
            <CardDescription>
              Your latest Gmail messages (showing {messages.length} most recent)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {messages.map(message => <div key={message.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
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
                        {message.labels.slice(0, 2).map(label => <Badge key={label} variant="outline" className="text-xs">
                            {label.toLowerCase()}
                          </Badge>)}
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
};
export default GmailSync;