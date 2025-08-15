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
    console.log('🔍 Starting Gmail permission check...');
    setStatus({ hasPermissions: false, isChecking: true, needsReauth: false });
    
    try {
      // Get current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      console.log('📋 Session check:', {
        hasSession: !!currentSession,
        hasAccessToken: !!currentSession?.access_token,
        hasProviderToken: !!currentSession?.provider_token,
        provider: currentSession?.user?.app_metadata?.provider
      });

      if (!currentSession?.access_token) {
        console.log('❌ No access token - user not authenticated');
        setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        return;
      }

      // Check if we have the provider_token (Google OAuth token)
      if (!currentSession?.provider_token) {
        console.log('❌ No provider token - need Google OAuth');
        setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        return;
      }

      console.log('📨 Testing Gmail API access...');

      // Test actual Gmail API access by calling our edge function
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
        body: { 
          access_token: currentSession.provider_token,
          test_only: true // Just test permissions, don't sync
        }
      });

      console.log('📡 Edge function response:', { data, error });

      // Handle network/function errors
      if (error) {
        console.error('❌ Gmail API test failed with error:', error);
        
        // If it's a 403 or scope error, we need re-auth
        if (error.message?.includes('403') || error.message?.includes('insufficient') || 
            error.message?.includes('scope') || error.message?.includes('permission')) {
          console.log('🔄 Scope/permission error detected, need re-auth');
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        } else {
          // Other errors - still allow re-auth as fallback
          console.log('🔄 Other error, allowing re-auth as fallback');
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true, error: error.message });
        }
        return;
      }

      // Handle response data errors
      if (data?.error) {
        console.error('❌ Gmail sync function returned error:', data.error);
        
        // Check for permission/scope related errors
        if (data.error.includes('403') || data.error.includes('insufficient') || 
            data.error.includes('scope') || data.error.includes('permission') ||
            data.error.includes('The user does not have sufficient permissions')) {
          console.log('🔄 Permission error in response, need re-auth');
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        } else {
          console.log('🔄 Other error in response, allowing re-auth');
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true, error: data.error });
        }
        return;
      }

      // Success - we can access Gmail API
      console.log('✅ Gmail permissions verified successfully');
      setStatus({ hasPermissions: true, isChecking: false, needsReauth: false });
      
    } catch (error: any) {
      console.error('❌ Permission check caught exception:', error);
      // Always allow re-auth on exceptions
      setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
    }
  };

  return {
    ...status,
    checkPermissions
  };
};
