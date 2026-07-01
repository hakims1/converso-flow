import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, Clock, User, AlertTriangle } from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { useGmailAuth } from '@/hooks/useGmailAuth';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useAnalysis } from '@/hooks/useAnalysis';

const GmailSync = () => {
  const {
    messages,
    loading,
    totalCount,
    syncGmail
  } = useGmail();
  const { hasGmailAccess, isChecking, needsPermission, checkGmailAccess } = useGmailAuth();
  const { session, signInWithGoogle } = useAuth();
  const [hasInitialSync, setHasInitialSync] = useState(false);
  const baselineStartedRef = useRef(false);
  const analysis = useAnalysis();
  
  const handleSync = async () => {
    if (needsPermission) {
      console.log('🔄 Re-authenticating with Gmail...');
      await signInWithGoogle();
    } else {
      console.log('📧 Starting Gmail sync...');
      await syncGmail();
      await analysis.analyzeConversations({ sinceLast: true, max: 500 });
      setHasInitialSync(true);
    }
  };

  const handleRefreshPermissions = async () => {
    console.log('🔄 Manually refreshing Gmail permissions...');
    await checkGmailAccess();
  };

  // Auto-run baseline sync + analysis ONCE after permissions are granted.
  // The ref guard is set synchronously before the async begins, so re-renders
  // during the (multi-minute) run can't stack up concurrent sync/analyze loops.
  // (syncGmail/analysis are intentionally NOT in the deps — they're new objects
  // each render and would otherwise re-fire this effect on every render.)
  useEffect(() => {
    if (!session || !hasGmailAccess || needsPermission || isChecking || hasInitialSync) return;
    if (baselineStartedRef.current) return;

    const userId = session.user?.id;
    if (!userId) return;

    const flagKey = `gmail_baseline_synced_${userId}`;
    if (localStorage.getItem(flagKey) === 'true') {
      setHasInitialSync(true);
      return;
    }

    baselineStartedRef.current = true;
    console.log('🚀 Running baseline Gmail sync for last 6 months...');
    (async () => {
      try {
        await syncGmail({ sinceDays: 180, maxThreads: 200, fullHistory: false, silent: true });
        await analysis.analyzeConversations({ sinceLast: true, max: 500 });
        localStorage.setItem(flagKey, 'true');
        setHasInitialSync(true);
      } catch (e) {
        console.error('Baseline Gmail sync failed:', e);
        baselineStartedRef.current = false; // allow a retry on a later mount
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, hasGmailAccess, needsPermission, isChecking, hasInitialSync]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Sync
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to analyze your email conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsPermission && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Gmail permissions are required to sync your emails. Please authenticate to continue.
              </AlertDescription>
            </Alert>
          )}
          
          {isChecking ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Checking Gmail permissions...</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSync}
                disabled={loading || isChecking}
                className="flex-1 gradient-primary text-white border-0"
              >
                {loading || isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isChecking ? 'Checking permissions...' : 'Syncing emails...'}
                  </>
                ) : needsPermission ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Authenticate Gmail
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Sync latest emails
                  </>
                )}
              </Button>
              
              {hasGmailAccess && (
                <Button 
                  onClick={handleRefreshPermissions}
                  disabled={isChecking}
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
              {messages
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(message => (
                  <div key={message.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
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
                        {message.url && (
                          <a
                            href={message.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline mb-2 block"
                            aria-label="View this conversation in Gmail"
                          >
                            View in Gmail
                          </a>
                        )}
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
                          {message.labels.slice(0, 2).map(label => (
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