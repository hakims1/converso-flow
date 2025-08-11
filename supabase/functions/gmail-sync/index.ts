import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get the user's Google access token from their session
    const { data: session } = await supabase.auth.getSession()
    const accessToken = session.session?.provider_token

    if (!accessToken) {
      throw new Error('No Google access token found. Please re-authenticate with Google.')
    }

    console.log('Found access token, fetching Gmail messages...')

    // Fetch recent emails from Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      console.error('Gmail API error:', errorText)
      throw new Error(`Gmail API error: ${gmailResponse.status} ${errorText}`)
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