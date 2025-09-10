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

      if (error || (data?.error && data.error === 'GMAIL_PERMISSIONS_REQUIRED')) {
        console.log('Gmail access check failed:', error || data?.error);
        setState({ 
          hasGmailAccess: false, 
          isChecking: false, 
          needsPermission: true,
          error: error?.message || data?.message || 'Gmail permissions required'
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