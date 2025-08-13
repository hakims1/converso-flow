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
    if (!session?.provider_token) {
      setStatus({
        hasPermissions: false,
        isChecking: false,
        needsReauth: true,
        error: 'Missing Gmail access token'
      });
      return;
    }

    setStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
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

  // Auto-check permissions when session changes
  useEffect(() => {
    if (session?.provider_token) {
      checkPermissions();
    } else if (session && !session.provider_token) {
      setStatus({
        hasPermissions: false,
        isChecking: false,
        needsReauth: true,
        error: 'No Gmail access token found'
      });
    }
  }, [session?.provider_token]);

  return {
    ...status,
    checkPermissions
  };
};