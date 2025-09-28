import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGmailAuth } from '@/hooks/useGmailAuth';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
const Auth = () => {
  const {
    user,
    session,
    signInWithGoogle
  } = useAuth();
  const {
    hasGmailAccess,
    isChecking,
    needsPermission,
    checkGmailAccess
  } = useGmailAuth();
  const navigate = useNavigate();
  const [isStoringTokens, setIsStoringTokens] = useState(false);
  const [tokenStorageComplete, setTokenStorageComplete] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isConflictError, setIsConflictError] = useState(false);

  // Handle OAuth callback and store tokens
  useEffect(() => {
    const handleTokenStorage = async () => {
      // Check if we have a session with provider tokens (Gmail OAuth) and haven't stored them yet
      if (session?.provider_token && session?.provider_refresh_token && user && !tokenStorageComplete && !isStoringTokens && !storageError) {
        console.log('Processing OAuth tokens and storing them...', {
          hasAccessToken: !!session.provider_token,
          hasRefreshToken: !!session.provider_refresh_token,
          expiresAt: session.expires_at
        });
        
        setIsStoringTokens(true);
        setStorageError(null);
        setIsConflictError(false);
        
        try {
          // Store the tokens securely with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Token storage timeout')), 30000)
          );
          
          const storagePromise = supabase.functions.invoke('gmail-tokens', {
            body: {
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token,
              expires_at: session.expires_at
            }
          });
          
          const { data, error } = await Promise.race([storagePromise, timeoutPromise]) as any;
          
          if (error) {
            console.error('Failed to store Gmail tokens:', error);
            
            // Handle different error types
            if (error.message?.includes('401') || error.message?.includes('INVALID_JWT') || 
                data?.error === 'INVALID_JWT') {
              console.log('Invalid JWT detected, signing out and retrying...');
              await supabase.auth.signOut();
              setStorageError('Authentication expired. Please sign in again.');
              setIsStoringTokens(false);
              return;
            }
            
            // Check if it's a 409 conflict error (Gmail account already connected)
            if (error.message?.includes('409') || data?.error?.includes('already connected')) {
              setIsConflictError(true);
              setStorageError('This Gmail account is already connected to another user account. Please use a different Gmail account or contact support if you believe this is an error.');
            } else {
              setStorageError(error.message || 'Failed to store Gmail tokens. Please try again.');
            }
            
            setIsStoringTokens(false);
            return;
          }
          
          console.log('Gmail tokens stored successfully', data);
          setTokenStorageComplete(true);
          
          // Clean URL of OAuth parameters
          const url = new URL(window.location.href);
          if (url.searchParams.has('code') || url.searchParams.has('state')) {
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.pathname);
          }
          
        } catch (error: any) {
          console.error('Error storing Gmail tokens:', error);
          setStorageError(error.message || 'Unexpected error occurred while storing tokens.');
          setIsStoringTokens(false);
        }
      }
    };
    
    handleTokenStorage();
  }, [session, user, tokenStorageComplete, isStoringTokens, storageError]);

  // Redirect immediately after token storage is complete
  useEffect(() => {
    if (tokenStorageComplete) {
      console.log('Token storage complete, redirecting to analyze...');
      // Small delay to ensure UI updates, then redirect
      setTimeout(() => {
        navigate('/analyze');
      }, 1000);
    }
  }, [tokenStorageComplete, navigate]);
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleManualRefresh = async () => {
    if (user) {
      console.log('Manually refreshing Gmail permissions...');
      // Reset error states
      setStorageError(null);
      setIsConflictError(false);
      setTokenStorageComplete(false);
      
      // Clear any existing tokens first
      try {
        await supabase.functions.invoke('gmail-tokens', {
          body: { clear_tokens: true }
        });
      } catch (error) {
        console.log('No existing tokens to clear');
      }
      // Then re-authenticate
      await signInWithGoogle();
    }
  };

  const handleTryDifferentAccount = async () => {
    console.log('Trying different account...');
    // Reset all states
    setStorageError(null);
    setIsConflictError(false);
    setTokenStorageComplete(false);
    
    // Sign out and re-authenticate
    await signInWithGoogle();
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back to home link */}
        <div className="flex items-center justify-center">
          <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader className="text-center space-y-2">
            <div className="flex flex-col items-center justify-center space-y-4 mb-6">
              <Mail className="h-8 w-8 text-primary py-0" />
              
            </div>
            <CardTitle className="text-2xl py-0">Connect Your Email</CardTitle>
            <CardDescription>
              Sign in with Google to analyze your email conversations and get actionable insights.
              We only read email metadata and never store your actual email content.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Status Messages */}
            {user && <div className="space-y-4">
                {storageError ? <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {storageError}
                    </AlertDescription>
                  </Alert> : isStoringTokens ? <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Storing Gmail permissions securely...
                    </AlertDescription>
                  </Alert> : isChecking ? <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Checking Gmail permissions...
                    </AlertDescription>
                  </Alert> : hasGmailAccess ? <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Gmail access confirmed! Redirecting to analyze...
                    </AlertDescription>
                  </Alert> : needsPermission ? <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Gmail access is required to analyze your emails. Please sign in again to grant permissions.
                    </AlertDescription>
                  </Alert> : null}
              </div>}

            {/* Action Buttons */}
            {!storageError && (
              <Button onClick={handleSignIn} variant="outline" className="w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {user && needsPermission ? 'Grant Gmail Access' : 'Continue with Google'}
              </Button>
            )}
            
            {/* Error Recovery Buttons */}
            {storageError && (
              <div className="space-y-3">
                {isConflictError ? (
                  <Button onClick={handleTryDifferentAccount} variant="outline" className="w-full" size="lg">
                    Try Different Gmail Account
                  </Button>
                ) : (
                  <Button onClick={handleManualRefresh} variant="outline" className="w-full" size="lg">
                    Try Again
                  </Button>
                )}
                <Button onClick={() => window.location.href = 'mailto:support@converso-flow.com'} variant="secondary" className="w-full" size="lg">
                  Contact Support
                </Button>
              </div>
            )}
            
            {/* Manual Refresh Button for stuck users */}
            {user && needsPermission && !storageError && (
              <Button onClick={handleManualRefresh} variant="secondary" className="w-full" size="lg">
                Refresh Permissions
              </Button>
            )}
            
            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy. 
              We adhere to Google API Services User Data Policy requirements.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Auth;