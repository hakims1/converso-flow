import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface GmailPermissionStatus {
  hasPermissions: boolean;
  isChecking: boolean;
  needsReauth: boolean;
  error?: string;
  lastChecked?: string;
}

interface PermissionCache {
  hasPermissions: boolean;
  timestamp: number;
  conversationCount: number;
}

const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const CACHE_KEY = 'gmail_permissions_cache';

export const useGmailPermissions = () => {
  const [status, setStatus] = useState<GmailPermissionStatus>({
    hasPermissions: false,
    isChecking: false,
    needsReauth: false
  });
  
  const { session } = useAuth();

  // Check if we have cached permission status
  const getCachedPermissions = (): PermissionCache | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data = JSON.parse(cached) as PermissionCache;
      const now = Date.now();
      
      // Return cached data if it's still valid
      if (now - data.timestamp < CACHE_DURATION) {
        return data;
      }
    } catch (error) {
      console.warn('Failed to parse cached permissions:', error);
    }
    return null;
  };

  // Cache permission status
  const setCachedPermissions = (hasPermissions: boolean, conversationCount = 0) => {
    try {
      const cache: PermissionCache = {
        hasPermissions,
        timestamp: Date.now(),
        conversationCount
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache permissions:', error);
    }
  };

  // Check if user has existing conversations in database
  const checkExistingConversations = async (): Promise<number> => {
    try {
      const { count } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    } catch (error) {
      console.warn('Failed to check existing conversations:', error);
      return 0;
    }
  };

  // Smart permission checking with caching and conversation history
  const checkPermissions = async (forceCheck = false) => {
    console.log('🔍 Starting smart Gmail permission check...', { forceCheck });
    setStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      // Get current session first
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token) {
        console.log('❌ No access token - user not authenticated');
        setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        return;
      }

      // Check for existing conversations first
      const conversationCount = await checkExistingConversations();
      console.log('📊 Found existing conversations:', conversationCount);

      // If we have conversations, assume permissions were granted previously
      if (conversationCount > 0 && !forceCheck) {
        console.log('✅ User has existing conversations, assuming permissions are valid');
        setCachedPermissions(true, conversationCount);
        setStatus({ 
          hasPermissions: true, 
          isChecking: false, 
          needsReauth: false,
          lastChecked: new Date().toISOString()
        });
        return;
      }

      // Check cache if not forcing
      if (!forceCheck) {
        const cached = getCachedPermissions();
        if (cached) {
          console.log('📦 Using cached permission status:', cached.hasPermissions);
          setStatus({ 
            hasPermissions: cached.hasPermissions, 
            isChecking: false, 
            needsReauth: !cached.hasPermissions,
            lastChecked: new Date(cached.timestamp).toISOString()
          });
          return;
        }
      }

      // Check if we have the provider_token (Google OAuth token)
      if (!currentSession?.provider_token) {
        console.log('❌ No provider token - need Google OAuth');
        setCachedPermissions(false, conversationCount);
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

      // Handle network/function errors more intelligently
      if (error) {
        console.error('❌ Gmail API test failed with error:', error);
        
        // Only force re-auth for genuine permission/scope errors
        const isPermissionError = error.message?.includes('403') || 
                                  error.message?.includes('insufficient') || 
                                  error.message?.includes('scope') || 
                                  error.message?.includes('permission');
        
        if (isPermissionError) {
          console.log('🔄 Genuine permission error detected, need re-auth');
          setCachedPermissions(false, conversationCount);
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        } else {
          // For network errors, assume permissions are still valid if we have conversations
          if (conversationCount > 0) {
            console.log('🌐 Network error but user has conversations, assuming permissions valid');
            setCachedPermissions(true, conversationCount);
            setStatus({ hasPermissions: true, isChecking: false, needsReauth: false, error: 'Network error, but permissions assumed valid' });
          } else {
            console.log('🔄 Network error and no conversations, prompting re-auth');
            setStatus({ hasPermissions: false, isChecking: false, needsReauth: true, error: error.message });
          }
        }
        return;
      }

      // Handle response data errors
      if (data?.error) {
        console.error('❌ Gmail sync function returned error:', data.error);
        
        // Check for permission/scope related errors
        const isPermissionError = data.error.includes('403') || 
                                  data.error.includes('insufficient') || 
                                  data.error.includes('scope') || 
                                  data.error.includes('permission') ||
                                  data.error.includes('The user does not have sufficient permissions');
        
        if (isPermissionError) {
          console.log('🔄 Permission error in response, need re-auth');
          setCachedPermissions(false, conversationCount);
          setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        } else {
          // For other errors, check if we have conversations
          if (conversationCount > 0) {
            console.log('⚠️ Other error but user has conversations, assuming permissions valid');
            setCachedPermissions(true, conversationCount);
            setStatus({ hasPermissions: true, isChecking: false, needsReauth: false, error: 'API error, but permissions assumed valid' });
          } else {
            console.log('🔄 Other error and no conversations, prompting re-auth');
            setStatus({ hasPermissions: false, isChecking: false, needsReauth: true, error: data.error });
          }
        }
        return;
      }

      // Success - we can access Gmail API
      console.log('✅ Gmail permissions verified successfully');
      setCachedPermissions(true, conversationCount);
      setStatus({ 
        hasPermissions: true, 
        isChecking: false, 
        needsReauth: false,
        lastChecked: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Permission check caught exception:', error);
      
      // Check conversation count to decide fallback behavior
      const conversationCount = await checkExistingConversations();
      if (conversationCount > 0) {
        console.log('🛡️ Exception occurred but user has conversations, assuming permissions valid');
        setCachedPermissions(true, conversationCount);
        setStatus({ hasPermissions: true, isChecking: false, needsReauth: false, error: 'Check failed, but permissions assumed valid' });
      } else {
        console.log('🔄 Exception occurred and no conversations, prompting re-auth');
        setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
      }
    }
  };

  // Soft check that only validates basic session without API calls
  const softCheckPermissions = async () => {
    console.log('🔍 Performing soft permission check...');
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.access_token || !currentSession?.provider_token) {
        console.log('❌ Missing tokens in soft check');
        setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
        return;
      }

      // Check cache first
      const cached = getCachedPermissions();
      if (cached) {
        console.log('📦 Soft check using cache:', cached.hasPermissions);
        setStatus({ 
          hasPermissions: cached.hasPermissions, 
          isChecking: false, 
          needsReauth: !cached.hasPermissions,
          lastChecked: new Date(cached.timestamp).toISOString()
        });
        return;
      }

      // Check existing conversations
      const conversationCount = await checkExistingConversations();
      if (conversationCount > 0) {
        console.log('✅ Soft check: user has conversations, assuming permissions valid');
        setCachedPermissions(true, conversationCount);
        setStatus({ 
          hasPermissions: true, 
          isChecking: false, 
          needsReauth: false,
          lastChecked: new Date().toISOString()
        });
        return;
      }

      // If no cache and no conversations, we need to check but don't fail hard
      console.log('🤷 Soft check inconclusive, assuming permissions needed');
      setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
      
    } catch (error) {
      console.error('❌ Soft check failed:', error);
      setStatus({ hasPermissions: false, isChecking: false, needsReauth: true });
    }
  };

  return {
    ...status,
    checkPermissions,
    softCheckPermissions
  };
};
