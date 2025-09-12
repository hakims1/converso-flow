import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption utility
async function encryptText(text: string, key: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Ensure key is exactly 32 bytes for AES-256-GCM
  const keyData = encoder.encode(key);
  const keyBuffer = new Uint8Array(32);
  keyBuffer.set(keyData.slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
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

    // Encrypt tokens
    const encryptedRefreshToken = await encryptText(refresh_token, encryptionKey);
    let encryptedAccessToken = null;
    
    if (access_token) {
      encryptedAccessToken = await encryptText(access_token, encryptionKey);
    }

    // Store tokens in database
    const { error: upsertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: user.id,
        encrypted_access_token: encryptedAccessToken?.encrypted || null,
        encrypted_refresh_token: encryptedRefreshToken.encrypted,
        token_expires_at: expires_at ? new Date(expires_at * 1000).toISOString() : null,
        encryption_iv: encryptedRefreshToken.iv // Using same IV for both tokens for simplicity
      });

    if (upsertError) {
      console.error('Failed to store Gmail tokens:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store tokens' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gmail tokens stored successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in gmail-tokens function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});