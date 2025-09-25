import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption utility with shared IV
async function encryptTextWithIV(text: string, key: string, iv: Uint8Array): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Use same key derivation as gmail-sync for consistency
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    cryptoKey,
    data
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Gmail tokens function called');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const encryptionKey = Deno.env.get('MASTER_ENCRYPTION_KEY');

    if (!supabaseUrl || !supabaseKey || !encryptionKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, refresh_token, expires_at } = await req.json();

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Storing Gmail tokens for user ${user.id}`);

    // Encrypt tokens using shared IV for consistent decryption
    const sharedIV = crypto.getRandomValues(new Uint8Array(12));
    const sharedIVBase64 = btoa(String.fromCharCode(...sharedIV));
    
    const encryptedRefreshToken = await encryptTextWithIV(refresh_token, encryptionKey, sharedIV);
    let encryptedAccessToken = null;
    
    if (access_token) {
      encryptedAccessToken = await encryptTextWithIV(access_token, encryptionKey, sharedIV);
    }

    // Get Gmail account email to check for existing connections
    let gmailAccountEmail: string = '';
    try {
      const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        gmailAccountEmail = profileData.emailAddress?.toLowerCase() || '';
        
        // SECURITY CHECK: Ensure this Gmail account isn't already connected to another user
        const { data: existingConnection } = await supabase
          .from('gmail_tokens')
          .select('user_id')
          .eq('gmail_account_email', gmailAccountEmail)
          .neq('user_id', user.id)
          .single();

        if (existingConnection) {
          return new Response(
            JSON.stringify({ 
              error: 'GMAIL_ACCOUNT_ALREADY_CONNECTED',
              message: `Gmail account ${gmailAccountEmail} is already connected to another user account` 
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    } catch (profileError) {
      console.error('Failed to get Gmail profile:', profileError);
    }

    // Store tokens in database with conflict resolution
    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        encrypted_access_token: encryptedAccessToken?.encrypted || null,
        encrypted_refresh_token: encryptedRefreshToken.encrypted,
        token_expires_at: expires_at ? new Date(expires_at * 1000).toISOString() : null,
        encryption_iv: sharedIVBase64, // Shared IV for both tokens
        gmail_account_email: gmailAccountEmail
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) {
      console.error('Failed to store Gmail tokens:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gmail tokens stored successfully for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gmail-tokens function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error)?.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});