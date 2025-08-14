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
      // Force multiple session refreshes to ensure provider token is available
      let freshSession = session;
      let attempts = 0;
      const maxAttempts = 5;
      
      // Keep trying to get a session with provider_token
      while (attempts < maxAttempts) {
        try {
          await supabase.auth.refreshSession();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait longer
          
          const { data: sessionData } = await supabase.auth.getSession();
          freshSession = sessionData?.session || session;
          
          console.log(`Attempt ${attempts + 1} - Session data:`, {
            hasAccessToken: !!freshSession?.access_token,
            hasProviderToken: !!freshSession?.provider_token,
            providerTokenStart: freshSession?.provider_token?.substring(0, 10),
            timestamp: new Date().toISOString()
          });
          
          // If we have both tokens, break out of the loop
          if (freshSession?.access_token && freshSession?.provider_token) {
            break;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (e) {
          console.warn(`Session refresh attempt ${attempts + 1} failed:`, e);
          attempts++;
        }
      }

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
        console.warn('No provider token found after all attempts');
        setStatus({
          hasPermissions: false,
          isChecking: false,
          needsReauth: true,
          error: 'Google authentication required. Please re-authorize with Gmail permissions.'
        });
        return;
      }

      console.log('Invoking gmail-sync with provider token:', freshSession.provider_token.substring(0, 10));
      
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