import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Security: Restricted CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tshyqizvsgvgrxygubqh.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Audit logging function
async function logDataAccess(
  supabase: any, 
  userId: string, 
  action: string, 
  resourceType: string, 
  resourceCount?: number, 
  metadata?: any
) {
  try {
    await supabase.from('data_access_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_count: resourceCount,
      metadata: metadata ? { ...metadata, timestamp: new Date().toISOString() } : null
    });
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
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

    // Authentication check for manual purge
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let isScheduledRun = false;

    if (authHeader) {
      // Manual user-initiated purge
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        );
      }
      user = authUser;
    } else {
      // Scheduled automatic purge (no auth required)
      isScheduledRun = true;
    }

    const { purgeAll = false, userId = null } = await req.json().catch(() => ({}));

    let purgedCount = 0;
    let purgedUsers = new Set();

    if (purgeAll && user) {
      // User-initiated complete data purge
      console.log(`User ${user.id} initiated complete data purge`);
      
      // Delete all email contents for this user
      const { data: emailContents, error: fetchError } = await supabase
        .from('email_contents')
        .select('id, conversation_id');
      
      const { data: userConversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);
      
      const conversationIds = userConversations?.map(c => c.id) || [];
      
      if (!fetchError && emailContents && conversationIds.length > 0) {
        const filteredEmailContents = emailContents.filter(ec => 
          conversationIds.includes(ec.conversation_id)
        );

        if (filteredEmailContents.length > 0) {
          const { error: deleteError } = await supabase
            .from('email_contents')
            .delete()
            .in('id', filteredEmailContents.map(ec => ec.id));

          if (!deleteError) {
            purgedCount = filteredEmailContents.length;
            purgedUsers.add(user.id);
          }
        }
      }

      // Also delete conversations and analysis
      const { data: userConversationsForDeletion } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);
      
      const conversationIdsForDeletion = userConversationsForDeletion?.map(c => c.id) || [];
      
      if (conversationIdsForDeletion.length > 0) {
        await supabase
          .from('conversation_analysis')
          .delete()
          .in('conversation_id', conversationIdsForDeletion);
        
        await supabase
          .from('conversations')
          .delete()
          .eq('user_id', user.id);
      }

      // Log the complete purge
      await logDataAccess(
        supabase,
        user.id,
        'purge',
        'email_content',
        purgedCount,
        { type: 'complete_user_purge', manual: true }
      );

    } else if (userId && user && user.id === userId) {
      // User-initiated partial purge (just expired content)
      const { data: expiredContent, error: fetchError } = await supabase
        .from('email_contents')
        .select('id, conversation_id')
        .lt('expires_at', new Date().toISOString());
      
      const { data: userConversationsForExpired } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId);
      
      const conversationIdsForExpired = userConversationsForExpired?.map(c => c.id) || [];
      
      if (!fetchError && expiredContent && expiredContent.length > 0 && conversationIdsForExpired.length > 0) {
        const filteredExpiredContent = expiredContent.filter(ec => 
          conversationIdsForExpired.includes(ec.conversation_id)
        );

        if (filteredExpiredContent.length > 0) {
          const { error: deleteError } = await supabase
            .from('email_contents')
            .delete()
            .in('id', filteredExpiredContent.map(c => c.id));

          if (!deleteError) {
            purgedCount = filteredExpiredContent.length;
            purgedUsers.add(userId);
          }
        }
      }

      // Log the partial purge
      await logDataAccess(
        supabase,
        userId,
        'purge',
        'email_content',
        purgedCount,
        { type: 'expired_content_purge', manual: true }
      );

    } else if (isScheduledRun) {
      // Scheduled automatic purge of expired content
      console.log('Running scheduled email content purge...');
      
      const { data: expiredContent, error: fetchError } = await supabase
        .from('email_contents')
        .select('id, conversation_id')
        .lt('expires_at', new Date().toISOString());

      if (!fetchError && expiredContent && expiredContent.length > 0) {
        const { error: deleteError } = await supabase
          .from('email_contents')
          .delete()
          .in('id', expiredContent.map(c => c.id));

        if (!deleteError) {
          purgedCount = expiredContent.length;
          
          // Track affected users
          const { data: conversations } = await supabase
            .from('conversations')
            .select('user_id')
            .in('id', expiredContent.map(c => c.conversation_id));
          
          conversations?.forEach(c => purgedUsers.add(c.user_id));
        }
      }

      // Log the scheduled purge (system action)
      if (purgedCount > 0) {
        console.log(`Scheduled purge completed: ${purgedCount} expired email contents removed`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        purged: purgedCount,
        affected_users: purgedUsers.size,
        message: `Successfully purged ${purgedCount} email contents for ${purgedUsers.size} users`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Email purge error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error)?.message || 'Purge operation failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});