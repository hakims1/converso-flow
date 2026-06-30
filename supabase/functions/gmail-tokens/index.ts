import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption utility: generates an INDEPENDENT random IV per call.
// IMPORTANT: access token and refresh token are encrypted separately, each
// with its own IV. Reusing one IV across both tokens (the previous design)
// caused the refresh token to become undecryptable after an access-token
// refresh overwrote the shared IV -> users were logged out ~hourly.
async function encryptText(text: string, key: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource }, cryptoKey, encoder.encode(text)
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
      
      // Provide more specific error information
      const errorMessage = userError?.message || 'User not found';
      const isJWTError = errorMessage.includes('JWT') || errorMessage.includes('sub claim');
      
      return new Response(
        JSON.stringify({ 
          error: isJWTError ? 'INVALID_JWT' : 'UNAUTHORIZED',
          message: isJWTError ? 'Invalid or expired authentication token' : 'User authentication failed'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { access_token, refresh_token, expires_at, clear_tokens } = requestBody;

    // Handle token clearing request
    if (clear_tokens) {
      console.log(`Clearing Gmail tokens for user ${user.id}`);
      const { error: deleteError } = await supabase
        .from('gmail_tokens')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Failed to clear Gmail tokens:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to clear tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Tokens cleared' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Storing Gmail tokens for user ${user.id}`);

    // Encrypt each token with its OWN independent IV.
    const encryptedRefreshToken = await encryptText(refresh_token, encryptionKey);
    let encryptedAccessToken: { encrypted: string; iv: string } | null = null;
    if (access_token) {
      encryptedAccessToken = await encryptText(access_token, encryptionKey);
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
        const { data: existingConnection, error: checkError } = await supabase
          .from('gmail_tokens')
          .select('user_id, gmail_account_email')
          .eq('gmail_account_email', gmailAccountEmail)
          .neq('user_id', user.id);

        if (checkError) {
          console.error('Error checking existing connections:', checkError);
        } else if (existingConnection && existingConnection.length > 0) {
          console.log(`Gmail account ${gmailAccountEmail} already connected to user: ${existingConnection[0].user_id}`);
          
          // Delete the old connection to allow the current user to connect
          console.log(`Removing old connection for Gmail account ${gmailAccountEmail}`);
          const { error: deleteError } = await supabase
            .from('gmail_tokens')
            .delete()
            .eq('gmail_account_email', gmailAccountEmail)
            .neq('user_id', user.id);
            
          if (deleteError) {
            console.error('Failed to remove old Gmail connection:', deleteError);
            return new Response(
              JSON.stringify({ 
                error: 'FAILED_TO_REMOVE_OLD_CONNECTION',
                message: 'Failed to remove existing Gmail connection. Please contact support.' 
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
          
          console.log(`Old connection removed, proceeding with new connection for ${gmailAccountEmail}`);
        }
      }
    } catch (profileError) {
      console.error('Failed to get Gmail profile:', profileError);
    }

    // Store tokens in database (service role bypasses RLS)
    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        encrypted_access_token: encryptedAccessToken?.encrypted || null,
        access_token_iv: encryptedAccessToken?.iv || null,      // access-token IV
        encrypted_refresh_token: encryptedRefreshToken.encrypted,
        encryption_iv: encryptedRefreshToken.iv,                // refresh-token IV
        token_expires_at: expires_at ? new Date(expires_at * 1000).toISOString() : null,
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

    // Authentication complete - user can now manually sync emails when ready

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