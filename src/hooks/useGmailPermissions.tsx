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
      try { 
        await supabase.auth.refreshSession(); 
      } catch (e) { 
        console.warn('refreshSession failed (non-fatal):', e); 
      }
      
      // Wait a bit for the refresh to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Failed to get session:', sessionError);
      }
      const freshSession = sessionData?.session || session;

      console.log('Fresh session data:', {
        hasAccessToken: !!freshSession?.access_token,
        hasProviderToken: !!freshSession?.provider_token,
        timestamp: new Date().toISOString()
      });

      if (!freshSession?.access_token) {
        setStatus({
          hasPermissions: false,
          isChecking: false,
          needsReauth: true,
          error: 'Not authenticated. Please sign in again.'
        });
        return;
      }

      if (!freshSession?.provider_token) {
        console.warn('No provider token found in session');
        setStatus({
          hasPermissions: false,
          isChecking: false,
          needsReauth: true,
          error: 'Google authentication required. Please re-authorize with Gmail permissions.'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${freshSession.access_token}`,
          'x-google-access-token': freshSession.provider_token,
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

  // Only check permissions manually - no auto-checking
  // useEffect(() => {
  //   if (session) {
  //     checkPermissions();
  //   }
  // }, [session?.access_token]);

  return {
    ...status,
    checkPermissions
  };
};