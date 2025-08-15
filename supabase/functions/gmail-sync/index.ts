import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-google-access-token',
}

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
  }
  internalDate: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user's session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    console.log('Authenticated user:', user.id)

    // Get Google access token from request
    const body = await req.json();
    let accessToken = body.access_token;
    const testOnly = body.test_only === true;
    
    // Fallback: try to get from headers if not in body
    if (!accessToken) {
      const authHeader = req.headers.get('x-google-access-token');
      if (authHeader) {
        accessToken = authHeader;
      }
    }

    if (!accessToken) {
      console.error('No Google access token provided');
      return new Response(
        JSON.stringify({ error: 'Google access token required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`${testOnly ? 'Testing' : 'Fetching'} Gmail access for user:`, user.id);

    // Test Gmail API access with a simple profile request first
    const profileResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Gmail profile API error:', profileResponse.status, errorText);
      
      let errorMessage = `Gmail API access denied (${profileResponse.status}).`;
      
      if (profileResponse.status === 403) {
        errorMessage += ' The user does not have sufficient permissions to access Gmail data. Please re-authorize with Gmail permissions.';
      } else if (profileResponse.status === 401) {
        errorMessage += ' The access token is invalid or expired. Please re-authenticate.';
      } else {
        errorMessage += ` Error: ${errorText}`;
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: profileResponse.status,
        }
      );
    }

    // If this is just a test, return success
    if (testOnly) {
      console.log('✅ Gmail API access test successful');
      return new Response(
        JSON.stringify({ success: true, message: 'Gmail API access verified' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Fetch recent emails from Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail messages API error:', gmailResponse.status, errorText);
      
      if (gmailResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Gmail API access denied. The user does not have sufficient permissions to access Gmail data.' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }
      
      throw new Error(`Gmail API error: ${gmailResponse.status} ${errorText}`);
    }

    const gmailData = await gmailResponse.json()
    console.log('Gmail messages fetched:', gmailData.messages?.length || 0)

    // Fetch detailed information for each message
    const messages = []
    if (gmailData.messages) {
      for (const message of gmailData.messages.slice(0, 5)) { // Limit to 5 for now
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (messageResponse.ok) {
          const messageData: GmailMessage = await messageResponse.json()
          
          // Extract relevant information
          const headers = messageData.payload.headers
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender'
          const date = headers.find(h => h.name === 'Date')?.value || messageData.internalDate

          messages.push({
            id: messageData.id,
            threadId: messageData.threadId,
            subject,
            from,
            date,
            snippet: messageData.snippet,
            labels: messageData.labelIds
          })
        }
      }
    }

    console.log('Processed messages:', messages.length)

    return new Response(
      JSON.stringify({
        success: true,
        messages,
        totalCount: gmailData.resultSizeEstimate || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in gmail-sync function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})