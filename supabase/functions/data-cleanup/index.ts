import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupResult {
  duplicateTokensRemoved: number;
  conversationsReassigned: number;
  orphanedConversations: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    console.log('Starting data cleanup for user:', user.id);

    const result: CleanupResult = {
      duplicateTokensRemoved: 0,
      conversationsReassigned: 0,
      orphanedConversations: 0
    };

    // Step 1: Find and remove duplicate Gmail token connections
    // Keep only the most recent connection for each Gmail account
    const { data: duplicateTokens } = await supabase
      .from('gmail_tokens')
      .select('user_id, gmail_account_email, created_at')
      .not('gmail_account_email', 'is', null)
      .order('gmail_account_email, created_at', { ascending: false });

    if (duplicateTokens) {
      const seenAccounts = new Set<string>();
      const tokensToRemove: string[] = [];

      for (const token of duplicateTokens) {
        if (seenAccounts.has(token.gmail_account_email)) {
          tokensToRemove.push(token.user_id);
        } else {
          seenAccounts.add(token.gmail_account_email);
        }
      }

      if (tokensToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('gmail_tokens')
          .delete()
          .in('user_id', tokensToRemove);

        if (!deleteError) {
          result.duplicateTokensRemoved = tokensToRemove.length;
        }
      }
    }

    // Step 2: Find conversations that belong to wrong users based on Gmail account
    // This is a read-only analysis for this user
    const { data: userToken } = await supabase
      .from('gmail_tokens')
      .select('gmail_account_email')
      .eq('user_id', user.id)
      .single();

    if (userToken?.gmail_account_email) {
      const gmailAccount = userToken.gmail_account_email;
      
      // Find conversations that should belong to this user but are assigned to others
      const { data: misassignedConversations } = await supabase
        .from('conversations')
        .select('id, user_id, participants')
        .neq('user_id', user.id)
        .like('participants', `%${gmailAccount}%`);

      if (misassignedConversations) {
        result.orphanedConversations = misassignedConversations.length;
        
        // Log the misassigned conversations for analysis
        console.log(`Found ${misassignedConversations.length} conversations that may belong to user ${user.id} but are assigned to other users`);
        
        for (const conv of misassignedConversations) {
          console.log(`Conversation ${conv.id} assigned to ${conv.user_id} but contains ${gmailAccount}`);
        }
      }
    }

    console.log('Data cleanup completed:', result);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        message: 'Data cleanup analysis completed. Manual intervention may be required for conversation reassignment.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Data cleanup error:', error);
    return new Response(
      JSON.stringify({
        error: (error as Error)?.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
