import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGmailAuth } from '@/hooks/useGmailAuth';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, session, signInWithGoogle } = useAuth();
  const { hasGmailAccess, isChecking, needsPermission } = useGmailAuth();
  const navigate = useNavigate();

  // Handle OAuth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      
      if (code) {
        console.log('Processing OAuth callback...');
        try {
          await supabase.auth.exchangeCodeForSession(url.href);
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback error:', error);
        }
      }
    };

    handleAuthCallback();
  }, []);

  // Redirect to dashboard when everything is ready
  useEffect(() => {
    if (user && hasGmailAccess) {
      console.log('User authenticated with Gmail access, redirecting...');
      navigate('/dashboard');
    }
  }, [user, hasGmailAccess, navigate]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
              <Mail className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                Email Insight Helper
              </span>
            </div>
            <CardTitle className="text-2xl">Connect Your Email</CardTitle>
            <CardDescription>
              Sign in with Google to analyze your email conversations and get actionable insights.
              We only read email metadata and never store your actual email content.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Status Messages */}
            {user && (
              <div className="space-y-4">
                {isChecking ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Checking Gmail permissions...
                    </AlertDescription>
                  </Alert>
                ) : hasGmailAccess ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Gmail access confirmed! Redirecting to dashboard...
                    </AlertDescription>
                  </Alert>
                ) : needsPermission ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Gmail access is required to analyze your emails. Please sign in again to grant permissions.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            )}

            {/* Sign In Button */}
            <Button 
              onClick={handleSignIn} 
              variant="outline"
              className="w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90" 
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {user && needsPermission ? 'Grant Gmail Access' : 'Continue with Google'}
            </Button>
            
            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy. 
              We adhere to Google API Services User Data Policy requirements.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;