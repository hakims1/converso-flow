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
    if (gmailPermissions.needsReauth) {
      console.log('🔄 Re-authenticating with Gmail...');
      await signInWithGoogle(true); // Force re-auth
    } else {
      console.log('📧 Starting Gmail sync...');
      await syncGmail();
      setHasInitialSync(true);
    }
  };

  const handleRefreshPermissions = async () => {
    console.log('🔄 Manually refreshing Gmail permissions...');
    await gmailPermissions.checkPermissions(true); // Force check
  };

  // Perform soft check on component mount to avoid aggressive re-auth
  useEffect(() => {
    if (session) {
      console.log('🔄 Performing initial soft permission check...');
      gmailPermissions.softCheckPermissions();
    }
  }, [session]);

  // Only check permissions occasionally if there are actual issues
  useEffect(() => {
    // Only set up periodic checking if we don't have permissions and need reauth
    if (session && gmailPermissions.needsReauth) {
      console.log('⏰ Setting up periodic permission check due to reauth needed');
      const interval = setInterval(() => {
        if (!gmailPermissions.isChecking) {
          gmailPermissions.softCheckPermissions();
        }
      }, 10 * 60 * 1000); // Check every 10 minutes only if we need reauth

      return () => clearInterval(interval);
    }
  }, [session, gmailPermissions.needsReauth, gmailPermissions.isChecking]);

  // Re-check permissions when returning from OAuth (focus/visibility)
  useEffect(() => {
    const onFocus = () => {
      if (gmailPermissions.needsReauth) {
        console.log('🔄 Window focus detected, soft checking permissions...');
        gmailPermissions.softCheckPermissions();
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
              Connect your Gmail account to analyze your email conversations
              {gmailPermissions.lastChecked && (
                <div className="text-xs text-muted-foreground mt-1">
                  Last checked: {formatDate(gmailPermissions.lastChecked)}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showReauthButton && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p>Gmail permissions need to be renewed. Please re-authenticate to continue syncing.</p>
                  {gmailPermissions.error && (
                    <p className="text-xs text-muted-foreground">Error: {gmailPermissions.error}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {gmailPermissions.isChecking ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Checking Gmail permissions...</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleSync}
                  disabled={loading || gmailPermissions.isChecking}
                  className="flex-1 gradient-primary text-white border-0"
                >
                  {loading || gmailPermissions.isChecking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {gmailPermissions.isChecking ? 'Checking permissions...' : 'Syncing emails...'}
                    </>
                  ) : gmailPermissions.needsReauth ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Re-authenticate Gmail
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Sync Gmail
                    </>
                  )}
                </Button>
                
                {gmailPermissions.hasPermissions && (
                  <Button 
                    onClick={handleRefreshPermissions}
                    disabled={gmailPermissions.isChecking}
                    variant="outline"
                    size="sm"
                    className="px-3"
                    title="Refresh Gmail permissions"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
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
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {message.content}
                      </div>
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