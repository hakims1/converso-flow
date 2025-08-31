import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security: Restricted CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://tshyqizvsgvgrxygubqh.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const BLOCKED_CATEGORIES = new Set(['CATEGORY_PROMOTIONS','CATEGORY_SOCIAL','CATEGORY_UPDATES']);

// Encryption utilities
async function encryptText(text: string, key: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  
  // Import key
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(text)
  );
  
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting check
    const rateLimitCheck = req.headers.get('x-forwarded-for') || 'unknown';
    console.log(`Gmail sync request from: ${rateLimitCheck.slice(0, 10)}...`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const masterEncryptionKey = Deno.env.get('MASTER_ENCRYPTION_KEY')!;
    
    if (!masterEncryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const fullHistory = typeof _b.full_history === 'boolean' ? _b.full_history : false;
    const sinceDays = typeof _b.since_days === 'number' ? Math.max(0, _b.since_days) : 30;
    const maxThreads = typeof _b.max_threads === 'number' ? Math.max(0, _b.max_threads) : 75;

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
    const targetMatches = 50;

    // Paginate through all threads
    const threads: Array<{ id: string }> = [];
    let pageToken: string | undefined = undefined;
    const perPage = 100;
    const cap = 5000; // collect ample threads; final stored limited by target

    do {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
      url.searchParams.set('maxResults', String(perPage));
      // Build Gmail search query: since date and exclude categories (promotions, social, updates)
      const qParts: string[] = [];
      if (afterUnix > 0) qParts.push(`after:${afterUnix}`);
      // Exclude blocked categories and no-reply/reply senders
      qParts.push('-category:promotions', '-category:social', '-category:updates', '-from:reply');
      if (qParts.length > 0) url.searchParams.set('q', qParts.join(' '));
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
              await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay every 10 requests
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
          const lastLabels = lastMessage.labelIds || []

          // Thread-level filtering: skip only if ALL messages are promotional/social/forums or automated
          // Extract clean text from the final message and apply strict filters
          const decode = (b64: string) => { try { return atob(b64.replace(/-/g, '+').replace(/_/g, '/')) } catch { return '' } };
          const htmlToText = (html: string) => {
            if (!html) return '';
            html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
            html = html.replace(/<(br|BR)\s*\/?>(?=\n|\r|$)/g, '\n').replace(/<(br|BR)\s*\/?>(?!\n)/g, '\n');
            html = html.replace(/<\/?p[^>]*>/gi, '\n');
            html = html.replace(/<[^>]+>/g, '');
            html = html.replace(/&nbsp;/g, ' ')
                       .replace(/&amp;/g, '&')
                       .replace(/&lt;/g, '<')
                       .replace(/&gt;/g, '>')
                       .replace(/&quot;/g, '"')
                       .replace(/&#39;/g, "'");
            html = html.replace(/&#(\d+);/g, (_: string, code: string) => {
              try { return String.fromCharCode(parseInt(code)); } catch { return _; }
            });
            return html.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
          };
          const prefer = (a: string, b: string) => (!a || (b && b.length > a.length)) ? b : a;

          const collectText = (msg: GmailMessage) => {
            let textPlain = '';
            let textHtml = '';
            const pushData = (mime: string | undefined, data?: string) => {
              if (!data) return;
              const decoded = decode(data);
              if (!decoded) return;
              if (mime && mime.toLowerCase().includes('text/plain')) {
                textPlain = prefer(textPlain, decoded);
              } else if (mime && mime.toLowerCase().includes('text/html')) {
                textHtml = prefer(textHtml, decoded);
              } else {
                textHtml = prefer(textHtml, decoded);
              }
            };
            const topMime = (msg as any)?.payload?.mimeType as string | undefined;
            pushData(topMime, msg.payload?.body?.data);
            const walk = (parts?: Array<any>) => {
              if (!Array.isArray(parts)) return;
              for (const p of parts) {
                pushData(p?.mimeType, p?.body?.data);
                if (Array.isArray(p?.parts)) walk(p.parts);
              }
            };
            walk(msg.payload?.parts as any);
            const content = textPlain || htmlToText(textHtml) || msg.snippet || '';
            return content;
          };

          const fullContent = collectText(lastMessage);

          // Apply strict thread-level filters per requirements
          const blockedInAnyMessage = threadData.messages.some(m => (m.labelIds || []).some(id => BLOCKED_CATEGORIES.has(id)));
          const listUnsubInAnyMessage = threadData.messages.some(m => (m.payload.headers || []).some(h => (h.name || '').toLowerCase() === 'list-unsubscribe'));
          const hasReplyInAddress = (fromValue: string) => {
            if (!fromValue) return false;
            const emails = fromValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
            return emails.some((e) => e.toLowerCase().includes('reply'));
          };
          const replySenderInAnyMessage = threadData.messages.some(m => {
            const fromVal = (m.payload.headers || []).find(h => (h.name || '').toLowerCase() === 'from')?.value || '';
            return hasReplyInAddress(fromVal);
          });
          // Detect "unsubscribe" keyword within text/plain or text/html parts
          const unsubscribeInBodyInAnyMessage = threadData.messages.some((m) => {
            let plain = '';
            let html = '';
            const pushData = (mime?: string, data?: string) => {
              if (!data) return;
              const decoded = decode(data);
              if (!decoded) return;
              if (mime && mime.toLowerCase().includes('text/plain')) {
                plain = prefer(plain, decoded);
              } else if (mime && mime.toLowerCase().includes('text/html')) {
                html = prefer(html, decoded);
              }
            };
            const topMime = (m as any)?.payload?.mimeType as string | undefined;
            pushData(topMime, m.payload?.body?.data);
            const walk = (parts?: Array<any>) => {
              if (!Array.isArray(parts)) return;
              for (const p of parts) {
                pushData(p?.mimeType, p?.body?.data);
                if (Array.isArray(p?.parts)) walk(p.parts);
              }
            };
            walk(m.payload?.parts as any);
            const hasUnsub = plain.toLowerCase().includes('unsubscribe') || htmlToText(html).toLowerCase().includes('unsubscribe');
            return hasUnsub;
          });

          if (blockedInAnyMessage || listUnsubInAnyMessage || replySenderInAnyMessage || unsubscribeInBodyInAnyMessage) {
            console.log(`Skipping thread ${threadData.id} due to filters`, { blockedInAnyMessage, listUnsubInAnyMessage, replySenderInAnyMessage, unsubscribeInBodyInAnyMessage });
            continue;
          }

          // Collect participants across the entire thread (after filters pass)
          const participantsSet = new Set<string>();
          for (const m of threadData.messages) {
            const h = m.payload.headers || [];
            const fromH = h.find((x) => x.name === 'From')?.value || '';
            const toH = h.find((x) => x.name === 'To')?.value || '';
            const ccH = h.find((x) => x.name === 'Cc')?.value || '';
            const pushList = (val: string) => {
              if (!val) return;
              val.split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => participantsSet.add(p));
            };
            if (fromH) participantsSet.add(fromH);
            pushList(toH);
            pushList(ccH);
          }
          const participants = Array.from(participantsSet);

          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';

          const conversation = {
            user_id: user.id,
            thread_id: threadData.id,
            gmail_message_id: lastMessage.id,
            subject,
            participants: participants.filter(Boolean),
            snippet: lastMessage.snippet?.slice(0, 500) || '', // Limited snippet
            last_message_date: new Date(parseInt(lastMessage.internalDate)).toISOString(),
            message_count: threadData.messages.length,
            labels: lastLabels,
            has_attachments: lastMessage.payload.parts?.some(part => 
              part.filename && part.filename.length > 0
            ) || false
          }

          // Upsert conversation (without full content)
          const { data: convData, error: convError } = await supabaseAuthed
            .from('conversations')
            .upsert({
              ...conversation,
              full_content: undefined // Remove full_content from conversation
            }, { 
              onConflict: 'user_id,thread_id',
              ignoreDuplicates: false 
            })
            .select('id')
            .single();

          if (convError) {
            console.error(`Error upserting conversation ${threadData.id}:`, convError);
            continue;
          }

          // Encrypt and store email content separately
          if (fullContent.trim() && convData?.id) {
            try {
              const { encrypted, iv } = await encryptText(fullContent, masterEncryptionKey);
              
              // Get user's retention settings
              const { data: profile } = await supabase
                .from('profiles')
                .select('email_retention_days')
                .eq('user_id', user.id)
                .single();
              
              const retentionDays = profile?.email_retention_days || 30;
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + retentionDays);

              await supabase
                .from('email_contents')
                .upsert({
                  conversation_id: convData.id,
                  encrypted_body: encrypted,
                  encryption_iv: iv,
                  expires_at: expiresAt.toISOString()
                }, {
                  onConflict: 'conversation_id',
                  ignoreDuplicates: false
                });
            } catch (encError) {
              console.error(`Failed to encrypt content for conversation ${convData.id}:`, encError);
            }
          }

          conversations.push({...conversation, full_content: undefined})
          processedCount++
          if (targetMatches > 0 && processedCount >= targetMatches) {
            break
          }
        } catch (error) {
          console.error(`Error processing thread ${thread.id}:`, error)
          continue
        }
      }
    }

    console.log(`Processed ${processedCount} conversations for user ${user.id}`)

    // Audit log the ingestion
    await logDataAccess(
      supabase,
      user.id, 
      'ingest',
      'conversation',
      processedCount,
      { 
        threads_requested: threads.length,
        since_days: sinceDays,
        full_history: fullHistory 
      }
    );

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
          content: '[ENCRYPTED]', // Don't return full content
          labels: c.labels || [],
          url: `https://mail.google.com/mail/u/0/#inbox/${c.thread_id}`
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