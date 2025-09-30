import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGmailAuth } from '@/hooks/useGmailAuth';
import { supabase } from '@/integrations/supabase/client';
import { GmailPermissions } from '@/components/GmailPermissions';
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
            
            // Check if it's a specific error type
            if (data?.error === 'FAILED_TO_REMOVE_OLD_CONNECTION') {
              setIsConflictError(true);
              setStorageError('There was an issue connecting your Gmail account. Please contact support for assistance.');
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
  // Show loading states as overlays when needed
  const showStatusOverlay = user && (isStoringTokens || isChecking || hasGmailAccess || (storageError && !isConflictError));
  
  return (
    <div className="relative">
      <GmailPermissions 
        onBack={() => window.location.href = '/'}
        onContinue={handleSignIn}
      />
      
      {/* Status overlay */}
      {showStatusOverlay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center space-y-4">
            {storageError ? (
              <>
                <Alert variant="destructive" className="text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{storageError}</AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <button 
                    onClick={handleManualRefresh}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => window.location.href = 'mailto:support@converso-flow.com'}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Contact Support
                  </button>
                </div>
              </>
            ) : isStoringTokens ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-700">Storing Gmail permissions securely...</p>
              </>
            ) : isChecking ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-700">Checking Gmail permissions...</p>
              </>
            ) : hasGmailAccess ? (
              <>
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                <p className="text-gray-700">Gmail access confirmed! Redirecting to analyze...</p>
              </>
            ) : null}
          </div>
        </div>
      )}
      
      {/* Error overlay for conflict errors */}
      {storageError && isConflictError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center space-y-4">
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{storageError}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <button 
                onClick={handleTryDifferentAccount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Different Account
              </button>
              <button 
                onClick={() => window.location.href = 'mailto:support@converso-flow.com'}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Auth;