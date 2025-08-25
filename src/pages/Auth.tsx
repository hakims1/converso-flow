import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGmailPermissions } from '@/hooks/useGmailPermissions';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionStatus, setShowPermissionStatus] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [hasTriggeredInitialCheck, setHasTriggeredInitialCheck] = useState(false);
  const {
    signInWithGoogle,
    user,
    session
  } = useAuth();
  const gmailPermissions = useGmailPermissions();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Track user state and redirect when permissions are granted
  useEffect(() => {
    if (user && session) {
      console.log('✅ User authenticated:', user.email);
      console.log('📋 Session data:', {
        access_token: !!session.access_token,
        provider_token: !!session.provider_token,
        provider_refresh_token: !!session.provider_refresh_token
      });
      
      setShowPermissionStatus(true);
      
      // Check if this user has previously attempted OAuth
      const hasAttemptedOAuth = localStorage.getItem('gmail_oauth_attempted') === 'true';
      setIsFirstTimeUser(!hasAttemptedOAuth);
      
      // If we already have Gmail permissions, redirect to dashboard immediately
      if (gmailPermissions.hasPermissions) {
        console.log('🎉 Gmail permissions confirmed, redirecting to dashboard');
        localStorage.removeItem('gmail_oauth_attempted'); // Clean up
        navigate('/dashboard');
      } else if (hasAttemptedOAuth && !hasTriggeredInitialCheck && !gmailPermissions.hasPermissions) {
        // If user has attempted OAuth but doesn't have permissions and we haven't checked yet, trigger a check
        console.log('🔍 User previously attempted OAuth, checking permissions...');
        setHasTriggeredInitialCheck(true);
        gmailPermissions.checkPermissions();
      }
    } else {
      setShowPermissionStatus(false);
      setIsFirstTimeUser(true);
    }
  }, [user, session, gmailPermissions.hasPermissions, navigate, hasTriggeredInitialCheck]);

  // Separate effect to react to permission changes and redirect
  useEffect(() => {
    if (gmailPermissions.hasPermissions && user && session) {
      console.log('🎯 Gmail permissions granted, redirecting to dashboard');
      localStorage.removeItem('gmail_oauth_attempted');
      localStorage.removeItem('gmail_reauth_for_permissions');
      navigate('/dashboard');
    }
  }, [gmailPermissions.hasPermissions, user, session, navigate]);

  // Handle OAuth callback with improved session handling
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        console.log('🔗 OAuth callback detected');
        
        try {
          // Wait a moment for Supabase to process the OAuth callback
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the latest session after OAuth
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession?.provider_token) {
            console.log('✅ OAuth session established with provider token');
            
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Clear OAuth attempt flag since we got a valid session
            localStorage.removeItem('gmail_oauth_attempted');
            
            console.log('🔍 Testing Gmail permissions after OAuth...');
            // Always check permissions after OAuth to validate scopes
            await gmailPermissions.checkPermissions();
            
          } else {
            console.log('❌ OAuth callback but no provider token found');
            localStorage.removeItem('gmail_oauth_attempted');
            localStorage.removeItem('gmail_reauth_for_permissions');
          }
        } catch (error) {
          console.error('❌ OAuth callback error:', error);
          localStorage.removeItem('gmail_oauth_attempted');
          localStorage.removeItem('gmail_reauth_for_permissions');
        }
      }
    };

    handleAuthCallback();
  }, [gmailPermissions]);

  const handleGoogleSignIn = async () => {
    console.log('🚀 Google sign-in initiated');
    
    try {
      // Always mark that we're attempting OAuth
      localStorage.setItem('gmail_oauth_attempted', 'true');
      
      // If user exists but permissions failed, force re-auth to get new scopes
      if (user && !gmailPermissions.hasPermissions) {
        console.log('🔄 Re-authentication for Gmail permissions');
        localStorage.setItem('gmail_reauth_for_permissions', 'true');
        await signInWithGoogle(true); // Force re-auth with fresh consent
      } else {
        // First-time sign-in or no existing user
        console.log('👋 Initial Google sign-in');
        await signInWithGoogle(false);
      }
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      // Clean up flags on error
      localStorage.removeItem('gmail_oauth_attempted');
      localStorage.removeItem('gmail_reauth_for_permissions');
    }
  };

  const handleCheckPermissions = async () => {
    console.log('🔍 Manual permission check triggered');
    try {
      await gmailPermissions.checkPermissions();
      // The separate useEffect will handle redirection when permissions are granted
    } catch (error) {
      console.error('❌ Manual permission check error:', error);
    }
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
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Mail className="h-8 w-8 text-primary-light" />
              <span className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                EmAil Insight Helper
              </span>
            </div>
            <CardTitle className="text-2xl">Connect Your Email Inbox</CardTitle>
            <CardDescription>We never read, share, or store your actual email content. Our AI simply analyzes conversation patterns to create insights that only you can see. Your data is encrypted, secure, and you can revoke access anytime.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Gmail Permission Status for Authenticated Users */}
            {showPermissionStatus && user && (
              <div className="space-y-4">
                {gmailPermissions.isChecking ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Checking Gmail permissions...
                    </AlertDescription>
                  </Alert>
                ) : gmailPermissions.hasPermissions ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Gmail permissions verified! Redirecting to dashboard...
                    </AlertDescription>
                  </Alert>
                ) : gmailPermissions.needsReauth ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Gmail permissions required. Please click "Grant Gmail Access" below to allow our app to read your email insights. We never read, share, or store your actual email content.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            )}

            {/* Google OAuth Sign In */}
            <div className="space-y-3">
              <Button 
                onClick={handleGoogleSignIn} 
                disabled={isLoading} 
                className="w-full" 
                size="lg"
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {user && gmailPermissions.needsReauth ? 'Grant Gmail Access' : (isFirstTimeUser ? 'Continue with Google' : 'Re-authorize with Google')}
              </Button>
              {gmailPermissions.needsReauth && user && (
                <Button
                  variant="secondary"
                  onClick={handleCheckPermissions}
                  disabled={gmailPermissions.isChecking}
                  className="w-full"
                  size="sm"
                >
                  {gmailPermissions.isChecking ? 'Rechecking…' : 'Recheck permissions'}
                </Button>
              )}
            </div>
            
            {/* Footer text */}
            <div className="text-center text-xs text-muted-foreground">InboxIQ's use and transfer of information received from Google's APIs to other apps required to operate our service will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Auth;