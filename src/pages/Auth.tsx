import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
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
            {/* Google Sign In Button */}
            <Button 
              onClick={handleGoogleSignIn} 
              disabled={isLoading} 
              className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm" 
              size="lg"
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            {/* Footer text */}
            <div className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Auth;