import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface GmailAuthState {
  hasGmailAccess: boolean;
  isChecking: boolean;
  needsPermission: boolean;
  error?: string;
}

export const useGmailAuth = () => {
  const { session, user } = useAuth();
  const [state, setState] = useState<GmailAuthState>({
    hasGmailAccess: false,
    isChecking: false,
    needsPermission: false
  });

  // Check if user has Gmail access
  const checkGmailAccess = async () => {
    if (!user) {
      setState({ hasGmailAccess: false, isChecking: false, needsPermission: true });
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      // Test Gmail API access via server-side token management
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { 
          test_only: true
        }
      });

      // Handle different error types
      if (error) {
        console.log('Gmail access check failed:', error);
        
        // Check if this is an authentication error (401/403)
        if (error.message?.includes('401') || error.message?.includes('403') || 
            error.message?.includes('Unauthorized') || error.message?.includes('JWT')) {
          console.log('Authentication error detected, user may need to re-authenticate');
          // Clear invalid session
          await supabase.auth.signOut();
          setState({ 
            hasGmailAccess: false, 
            isChecking: false, 
            needsPermission: true,
            error: 'Authentication expired. Please sign in again.'
          });
          return;
        }
        
        setState({ 
          hasGmailAccess: false, 
          isChecking: false, 
          needsPermission: true,
          error: error.message || 'Gmail access check failed'
        });
      } else if (data?.error && data.error === 'GMAIL_PERMISSIONS_REQUIRED') {
        console.log('Gmail permissions required');
        setState({ 
          hasGmailAccess: false, 
          isChecking: false, 
          needsPermission: true,
          error: data?.message || 'Gmail permissions required'
        });
      } else {
        console.log('Gmail access confirmed');
        setState({ hasGmailAccess: true, isChecking: false, needsPermission: false });
      }
    } catch (err) {
      console.error('Gmail check error:', err);
      setState({ 
        hasGmailAccess: false, 
        isChecking: false, 
        needsPermission: true,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };

  // Auto-check when session changes
  useEffect(() => {
    if (user && session) {
      checkGmailAccess();
    } else {
      setState({ hasGmailAccess: false, isChecking: false, needsPermission: false });
    }
  }, [user, session]);

  return {
    ...state,
    checkGmailAccess
  };
};