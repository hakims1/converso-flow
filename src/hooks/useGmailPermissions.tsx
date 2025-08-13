import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface GmailPermissionStatus {
  hasPermissions: boolean;
  isChecking: boolean;
  needsReauth: boolean;
  error?: string;
}

export const useGmailPermissions = () => {
  const [status, setStatus] = useState<GmailPermissionStatus>({
    hasPermissions: false,
    isChecking: false,
    needsReauth: false
  });
  
  const { session } = useAuth();

  const checkPermissions = async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));

    try {
      // Always refresh and fetch the freshest session in case we just re-authorized
      try { await supabase.auth.refreshSession(); } catch (e) { console.warn('refreshSession failed (non-fatal):', e); }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Failed to get session:', sessionError);
      }
      const freshSession = sessionData?.session || session;

      if (!freshSession?.access_token) {
        setStatus({
          hasPermissions: false,
          isChecking: false,
          needsReauth: true,
          error: 'Not authenticated. Please sign in again.'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`,
        },
      });

      if (error) {
        if (error.message?.includes('GMAIL_PERMISSIONS_REQUIRED') ||
            (error.details && error.details.includes('403'))) {
          setStatus({
            hasPermissions: false,
            isChecking: false,
            needsReauth: true,
            error: 'Gmail permissions required'
          });
          return;
        }

        setStatus({
          hasPermissions: false,
          isChecking: false,
          needsReauth: true,
          error: error.message || 'Permission check failed'
        });
        return;
      }

      // If we got here, permissions are working
      setStatus({
        hasPermissions: true,
        isChecking: false,
        needsReauth: false
      });

    } catch (error: any) {
      console.error('Permission check error:', error);
      setStatus({
        hasPermissions: false,
        isChecking: false,
        needsReauth: true,
        error: error.message || 'Permission check failed'
      });
    }
  };

  // Auto-check permissions when session/access token changes
  useEffect(() => {
    if (session) {
      checkPermissions();
    }
  }, [session?.access_token]);

  return {
    ...status,
    checkPermissions
  };
};