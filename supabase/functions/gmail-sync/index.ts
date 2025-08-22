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
    body?: { data?: string }
    parts?: Array<{ filename?: string; mimeType?: string; body: { data?: string } }>
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

const BLOCKED_CATEGORIES = new Set(['CATEGORY_PROMOTIONS','CATEGORY_SOCIAL','CATEGORY_UPDATES','CATEGORY_FORUMS']);

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

    // Create a Supabase client that carries the caller's JWT for RLS-aware DB access
    const supabaseAuthed = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

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
    // Controls for sync scope
    const _b: any = body || {};
    const fullHistory = typeof _b.full_history === 'boolean' ? _b.full_history : true;
    const sinceDays = typeof _b.since_days === 'number' ? Math.max(0, _b.since_days) : 0;
    const maxThreads = typeof _b.max_threads === 'number' ? Math.max(0, _b.max_threads) : 0;

    // Fallback: try to get from headers if not in body
    if (!accessToken) {
      const tokenHeader = req.headers.get('x-google-access-token');
      if (tokenHeader) {
        accessToken = tokenHeader;
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

    // Parse profile for user's primary email
    const profile = await profileResponse.json();
    const userEmail = (profile?.emailAddress || user.email || '').toLowerCase();

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

    // Build query scope for threads
    const now = Date.now();
    const defaultDays = 30;
    const days = fullHistory ? 0 : (sinceDays > 0 ? sinceDays : defaultDays);
    const afterUnix = days > 0 ? Math.floor((now - days * 24 * 60 * 60 * 1000) / 1000) : 0;

    // Paginate through all threads
    const threads: Array<{ id: string }> = [];
    let pageToken: string | undefined = undefined;
    const perPage = 100;
    const cap = maxThreads > 0 ? maxThreads : 5000; // safety cap

    do {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
      url.searchParams.set('maxResults', String(perPage));
      if (afterUnix > 0) url.searchParams.set('q', `after:${afterUnix}`);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const resp = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Gmail threads API error:', resp.status, errorText);
        if (resp.status === 403) {
          return new Response(
            JSON.stringify({ 
              error: 'GMAIL_PERMISSIONS_REQUIRED',
              message: 'Gmail API access denied. Please re-authorize with Gmail permissions.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
        throw new Error(`Gmail threads API error: ${resp.status} ${errorText}`);
      }

      const data = await resp.json();
      if (Array.isArray(data.threads)) {
        for (const t of data.threads) {
          threads.push({ id: t.id });
          if (threads.length >= cap) break;
        }
      }
      pageToken = data.nextPageToken && threads.length < cap ? data.nextPageToken : undefined;
      if (threads.length % 500 === 0 && threads.length > 0) {
        await new Promise((r) => setTimeout(r, 500)); // brief pause to avoid rate limits
      }
    } while (pageToken);

    console.log('Gmail threads fetched total:', threads.length);

    const conversations = []
    let processedCount = 0

    if (threads.length > 0) {
      // Process threads with rate limiting
      for (const thread of threads) {
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

          // Get the most recent message in the thread (sorted by internalDate)
          const sortedMessages = [...threadData.messages].sort((a, b) => Number(a.internalDate) - Number(b.internalDate))
          const lastMessage = sortedMessages[sortedMessages.length - 1]
          const headers = lastMessage.payload.headers || []

          // Thread-level filtering: skip only if ALL messages are promotional/social/updates/forums or automated
          const threadHasOnlyBlocked = threadData.messages.every((m) => {
            const lbl = (m.labelIds || [])
            const hdrs = (m.payload.headers || [])
            const hasBlocked = lbl.some((id) => BLOCKED_CATEGORIES.has(id))
            const hasListUnsubscribe = hdrs.some((h) => (h.name || '').toLowerCase() === 'list-unsubscribe')
            return hasBlocked || hasListUnsubscribe
          })
          if (threadHasOnlyBlocked) {
            console.log(`Skipping thread ${threadData.id} because all messages are in blocked categories or automated`)
            continue
          }

          // Collect participants across the entire thread
          const participantsSet = new Set<string>()
          for (const m of threadData.messages) {
            const h = m.payload.headers || []
            const fromH = h.find((x) => x.name === 'From')?.value || ''
            const toH = h.find((x) => x.name === 'To')?.value || ''
            const ccH = h.find((x) => x.name === 'Cc')?.value || ''
            const pushList = (val: string) => {
              if (!val) return
              val.split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => participantsSet.add(p))
            }
            if (fromH) participantsSet.add(fromH)
            pushList(toH)
            pushList(ccH)
          }
          const participants = Array.from(participantsSet)

          // Ingestion heuristic: ensure the user is part of the thread; don't over-filter
          const isNoReply = (s: string) => /no[\-\s]?reply|donotreply|do[\-\s]?not[\-\s]?reply|notification|mailer-daemon|noreply/i.test(s)
          const lowerParts = participants.map((p) => p.toLowerCase())
          const includesUser = userEmail ? lowerParts.some((p) => p.includes(userEmail)) : true
          if (!includesUser) {
            console.log(`Skipping thread ${threadData.id} because it doesn't include the user`)
            continue
          }
          
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'

          // Build content from the last few messages for better context
          let fullContent = ''
          const recent = sortedMessages.slice(Math.max(0, sortedMessages.length - 3))
          for (const msg of recent) {
            let piece = msg.snippet || ''
            try {
              if (msg.payload?.body?.data) {
                piece = atob(msg.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')) || piece
              }
            } catch (_) { /* noop */ }
            if (msg.payload?.parts) {
              for (const part of msg.payload.parts) {
                if (part?.body?.data) {
                  try {
                    const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
                    if (decoded && decoded.length > piece.length) piece = decoded
                  } catch (_) { /* noop */ }
                }
              }
            }
            if (piece) {
              if (fullContent.length > 0) fullContent += '\n----\n'
              fullContent += piece
            }
            if (fullContent.length > 10000) break
          }
          if (!fullContent) {
            fullContent = lastMessage.snippet || ''
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
      const { error: upsertError } = await supabaseAuthed
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

    // Ingestion complete; not updating processing quotas here (reserved for analysis).

    return new Response(
      JSON.stringify({
        success: true,
        messages: conversations.map(c => ({
          id: c.gmail_message_id,
          threadId: c.thread_id,
          subject: c.subject,
          from: c.participants[0] || '',
          date: c.last_message_date,
          snippet: c.snippet,
          labels: c.labels || []
        })),
        totalCount: processedCount,
        message: `Successfully processed ${processedCount} email conversations`
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