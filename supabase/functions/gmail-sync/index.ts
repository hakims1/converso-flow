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
    parts?: Array<{ body: { data?: string } }>
  }
  internalDate: string
}

interface GmailThread {
  id: string
  messages: GmailMessage[]
}

// Get last 30 days timestamp
const getThirtyDaysAgo = () => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return Math.floor(thirtyDaysAgo.getTime() / 1000)
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

    // Get Google access token from request with proper error handling
    let body = {};
    let accessToken = '';
    let testOnly = false;
    
    try {
      const requestText = await req.text();
      if (requestText.trim()) {
        body = JSON.parse(requestText);
        accessToken = body.access_token || '';
        testOnly = body.test_only === true;
      }
    } catch (jsonError) {
      console.log('No JSON body provided, checking headers for token');
    }
    
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

    // Check user's quota before processing
    const { data: userHistory, error: historyError } = await supabase
      .from('user_processing_history')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (historyError && historyError.code !== 'PGRST116') {
      throw new Error(`Failed to get user processing history: ${historyError.message}`)
    }

    // Initialize history if doesn't exist
    if (!userHistory) {
      const { error: insertError } = await supabase
        .from('user_processing_history')
        .insert({
          user_id: user.id,
          subscription_tier: 'free',
          conversations_processed: 0,
          monthly_limit: 50
        })
      
      if (insertError) {
        throw new Error(`Failed to initialize user history: ${insertError.message}`)
      }
    }

    const currentLimit = userHistory?.monthly_limit || 50
    const currentProcessed = userHistory?.conversations_processed || 0

    // Fetch threads from last 30 days with proper quota limiting
    const thirtyDaysAgo = getThirtyDaysAgo()
    const maxResults = Math.min(100, currentLimit - currentProcessed) // Don't exceed user's remaining quota
    
    if (maxResults <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Monthly conversation processing limit reached',
          quota: { processed: currentProcessed, limit: currentLimit }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      )
    }

    console.log(`Fetching up to ${maxResults} threads for user ${user.id} (quota: ${currentProcessed}/${currentLimit})`)
    
    // Fetch threads from last 30 days
    const threadsResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=${maxResults}&q=after:${thirtyDaysAgo}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!threadsResponse.ok) {
      const errorText = await threadsResponse.text()
      console.error('Gmail threads API error:', threadsResponse.status, errorText)
      
      if (threadsResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'GMAIL_PERMISSIONS_REQUIRED',
            message: 'Gmail API access denied. Please re-authorize with Gmail permissions.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        )
      }
      
      throw new Error(`Gmail threads API error: ${threadsResponse.status} ${errorText}`)
    }

    const threadsData = await threadsResponse.json()
    console.log('Gmail threads fetched:', threadsData.threads?.length || 0)

    const conversations = []
    let processedCount = 0

    if (threadsData.threads) {
      // Process threads with rate limiting
      for (const thread of threadsData.threads) {
        try {
          // Add delay to avoid rate limiting
          if (processedCount > 0 && processedCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay every 10 requests
          }

          // Fetch full thread details
          const threadResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (!threadResponse.ok) {
            console.error(`Failed to fetch thread ${thread.id}:`, threadResponse.status)
            continue
          }

          const threadData: GmailThread = await threadResponse.json()
          
          if (!threadData.messages || threadData.messages.length === 0) {
            continue
          }

          // Get the most recent message in the thread
          const lastMessage = threadData.messages[threadData.messages.length - 1]
          const headers = lastMessage.payload.headers
          
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
          const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender'
          const to = headers.find(h => h.name === 'To')?.value || ''
          const cc = headers.find(h => h.name === 'Cc')?.value || ''
          
          // Extract participants (from, to, cc)
          const participants = []
          if (from) participants.push(from)
          if (to) participants.push(...to.split(',').map(p => p.trim()))
          if (cc) participants.push(...cc.split(',').map(p => p.trim()))
          
          // Get message content (try body first, then parts)
          let fullContent = lastMessage.snippet || ''
          
          // Try to get fuller content from body or parts
          if (lastMessage.payload.parts) {
            for (const part of lastMessage.payload.parts) {
              if (part.body?.data) {
                try {
                  const decodedContent = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
                  if (decodedContent.length > fullContent.length) {
                    fullContent = decodedContent
                  }
                } catch (e) {
                  // Ignore decoding errors
                }
              }
            }
          }

          const conversation = {
            user_id: user.id,
            thread_id: threadData.id,
            gmail_message_id: lastMessage.id,
            subject,
            participants: participants.filter(Boolean),
            snippet: lastMessage.snippet,
            full_content: fullContent.substring(0, 10000), // Limit to 10k chars
            last_message_date: new Date(parseInt(lastMessage.internalDate)).toISOString(),
            message_count: threadData.messages.length,
            labels: lastMessage.labelIds || [],
            has_attachments: lastMessage.payload.parts?.some(part => 
              part.filename && part.filename.length > 0
            ) || false
          }

          conversations.push(conversation)
          processedCount++
          
        } catch (error) {
          console.error(`Error processing thread ${thread.id}:`, error)
          continue
        }
      }
    }

    console.log(`Processed ${processedCount} conversations for user ${user.id}`)

    // Store conversations in database (upsert by user_id + thread_id)
    if (conversations.length > 0) {
      const { error: upsertError } = await supabase
        .from('conversations')
        .upsert(conversations, { 
          onConflict: 'user_id,thread_id',
          ignoreDuplicates: false 
        })
      
      if (upsertError) {
        console.error('Error upserting conversations:', upsertError)
        throw new Error(`Failed to store conversations: ${upsertError.message}`)
      }
    }

    // Update user processing history
    const newProcessedCount = currentProcessed + processedCount
    const { error: updateError } = await supabase
      .from('user_processing_history')
      .upsert({
        user_id: user.id,
        conversations_processed: newProcessedCount,
        last_processing_date: new Date().toISOString(),
        subscription_tier: userHistory?.subscription_tier || 'free',
        monthly_limit: currentLimit
      }, { onConflict: 'user_id' })
    
    if (updateError) {
      console.error('Error updating user history:', updateError)
      // Don't throw - we got the data, just logging failed
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversations_processed: processedCount,
        total_conversations: conversations.length,
        quota: {
          processed: newProcessedCount,
          limit: currentLimit,
          remaining: currentLimit - newProcessedCount
        },
        message: `Successfully processed ${processedCount} email conversations from the last 30 days`
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