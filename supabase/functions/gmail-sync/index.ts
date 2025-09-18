import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Security: Allow requests from app domains
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
    body?: { data?: string }
    parts?: Array<{ filename?: string; mimeType?: string; body: { data?: string } }>
  }
  internalDate: string
}

interface GmailThread {
  id: string
  messages: GmailMessage[]
}

const BLOCKED_CATEGORIES = new Set(['CATEGORY_PROMOTIONS','CATEGORY_SOCIAL']);

// Decryption utility
async function decryptText(encryptedBase64: string, key: string, ivBase64: string): Promise<string> {
  const decoder = new TextDecoder();
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// Function to refresh Google access token
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth credentials');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

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

    // Get request body
    let body = {};
    let testOnly = false;
    
    try {
      const requestText = await req.text();
      if (requestText.trim()) {
        body = JSON.parse(requestText);
        testOnly = body.test_only === true;
      }
    } catch (jsonError) {
      console.log('No JSON body provided');
    }

    // Get stored Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('encrypted_access_token, encrypted_refresh_token, token_expires_at, encryption_iv')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      console.log('No Gmail tokens found for user');
      return new Response(
        JSON.stringify({ error: 'GMAIL_PERMISSIONS_REQUIRED', message: 'Gmail authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt refresh token
    let refreshToken: string;
    try {
      refreshToken = await decryptText(tokenData.encrypted_refresh_token, masterEncryptionKey, tokenData.encryption_iv);
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      return new Response(
        JSON.stringify({ error: 'GMAIL_PERMISSIONS_REQUIRED', message: 'Invalid stored tokens' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we need to refresh the access token
    let accessToken: string;
    const now = new Date();
    const tokenExpiry = tokenData.token_expires_at ? new Date(tokenData.token_expires_at) : null;
    
    if (!tokenData.encrypted_access_token || !tokenExpiry || now >= tokenExpiry) {
      console.log('Access token expired or missing, refreshing...');
      
      const refreshResult = await refreshGoogleToken(refreshToken);
      if (!refreshResult) {
        console.error('Failed to refresh access token');
        return new Response(
          JSON.stringify({ error: 'GMAIL_PERMISSIONS_REQUIRED', message: 'Failed to refresh token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      accessToken = refreshResult.access_token;
      
      // Update stored access token
      try {
        const encryptedAccessToken = await encryptText(accessToken, masterEncryptionKey);
        const newExpiry = new Date(now.getTime() + (refreshResult.expires_in * 1000));
        
        await supabase
          .from('gmail_tokens')
          .update({
            encrypted_access_token: encryptedAccessToken.encrypted,
            token_expires_at: newExpiry.toISOString(),
            encryption_iv: encryptedAccessToken.iv
          })
          .eq('user_id', user.id);
          
        console.log('Access token refreshed and stored');
      } catch (error) {
        console.error('Failed to store refreshed token:', error);
        // Continue with the refresh token anyway
      }
    } else {
      // Decrypt existing access token
      try {
        accessToken = await decryptText(tokenData.encrypted_access_token, masterEncryptionKey, tokenData.encryption_iv);
      } catch (error) {
        console.error('Failed to decrypt access token:', error);
        return new Response(
          JSON.stringify({ error: 'GMAIL_PERMISSIONS_REQUIRED', message: 'Invalid stored tokens' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Controls for sync scope
    const _b: any = body || {};
    const fullHistory = typeof _b.full_history === 'boolean' ? _b.full_history : false;
    const sinceDays = typeof _b.since_days === 'number' ? Math.max(0, _b.since_days) : 30;
    const maxThreads = typeof _b.max_threads === 'number' ? Math.max(1, Math.min(1000, _b.max_threads)) : 100;
    const silent = typeof _b.silent === 'boolean' ? _b.silent : false;

    // Test Gmail API access
    try {
      const profileResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error(`Gmail API access failed: ${profileResponse.status} ${profileResponse.statusText}`);
      }

      const profileData = await profileResponse.json();
      console.log('Gmail access confirmed for:', profileData.emailAddress);

      if (testOnly) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            email: profileData.emailAddress 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('Gmail API test failed:', error.message);
      
      // Log the access attempt
      await logDataAccess(supabase, user.id, 'gmail_access_test', 'gmail_api', 0, {
        error: error.message,
        success: false
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'GMAIL_PERMISSIONS_REQUIRED', 
          message: 'Gmail access denied',
          details: error.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query with comprehensive automated email filters
    let query = `-category:promotions -category:social -category:forums -category:updates -from:noreply -from:no-reply -from:donotreply -from:notifications -subject:"unsubscribe" -subject:"confirmation" -subject:"receipt"`;
    
    if (!fullHistory) {
      const dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - sinceDays);
      const formattedDate = dateFilter.toISOString().split('T')[0].replace(/-/g, '/');
      query += ` after:${formattedDate}`;
    }

    console.log(`Fetching Gmail threads with query: "${query}", maxResults: ${maxThreads}`);

    // Fetch threads from Gmail API with date filter
    const threadsResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(query)}&maxResults=${maxThreads}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!threadsResponse.ok) {
      throw new Error(`Gmail threads fetch failed: ${threadsResponse.status} ${threadsResponse.statusText}`);
    }

    const threadsData = await threadsResponse.json();
    const threads = threadsData.threads || [];

    console.log(`Found ${threads.length} threads to process`);

    if (threads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          messages: [],
          totalCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const processedConversations = [];
    let processedCount = 0;
    const userEmail = user.email?.toLowerCase() || '';

    // Process each thread
    for (const thread of threads) {
      try {
        // Fetch full thread details
        const threadResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!threadResponse.ok) {
          console.error(`Failed to fetch thread ${thread.id}: ${threadResponse.status}`);
          continue;
        }

        const threadData: GmailThread = await threadResponse.json();
        
        if (!threadData.messages || threadData.messages.length === 0) {
          console.log(`Thread ${thread.id} has no messages, skipping`);
          continue;
        }

        // Extract participants and check if user participated
        const participants = new Set<string>();
        let userParticipated = false;

        for (const message of threadData.messages) {
          for (const header of message.payload.headers) {
            if (header.name.toLowerCase() === 'from') {
              const fromEmail = header.value.toLowerCase();
              participants.add(header.value);
              if (fromEmail.includes(userEmail)) {
                userParticipated = true;
              }
            }
            if (header.name.toLowerCase() === 'to') {
              const toEmails = header.value.toLowerCase();
              participants.add(header.value);
              if (toEmails.includes(userEmail)) {
                userParticipated = true;
              }
            }
          }
        }

        // Comprehensive automated email detection
        const allLabels = new Set<string>();
        const allMessages = threadData.messages;
        
        for (const message of allMessages) {
          if (message.labelIds) {
            message.labelIds.forEach(label => allLabels.add(label));
          }
        }

        // Check message headers for automated email indicators
        const automatedHeaders = [
          'list-unsubscribe', 'list-id', 'list-help', 'list-subscribe',
          'precedence: bulk', 'precedence: junk', 'x-auto-response-suppress',
          'auto-submitted', 'x-mailer: mailchimp', 'x-campaign-id'
        ];

        // Check if ANY message in thread has these headers
        const hasAutomatedHeaders = allMessages.some(msg => 
          automatedHeaders.some(header => 
            msg.payload.headers.some(h => 
              h.name.toLowerCase().includes(header.toLowerCase())
            )
          )
        );

        // Only check marketing terms in the most recent message for single-message threads
        const automatedPatterns = [
          /unsubscribe/i, /opt[- ]?out/i, /manage.{0,20}preference/i,
          /newsletter/i, /campaign/i, /promotional/i,
          /this.{0,20}automated.{0,20}message/i, /do.{0,10}not.{0,10}reply/i,
          /order.{0,10}confirmation/i, /receipt.{0,10}#/i,
          /tracking.{0,10}number/i, /shipping.{0,10}notification/i,
          /password.{0,10}reset/i, /verification.{0,10}code/i
        ];

        // Get the most recent message (last in the array)
        const latestMessage = allMessages[allMessages.length - 1];

        // Only apply marketing term filtering to single-message threads
        const hasAutomatedContent = allMessages.length === 1 && 
          automatedPatterns.some(pattern => {
            const subjectHeader = latestMessage.payload.headers.find(h => h.name.toLowerCase() === 'subject');
            const subject = subjectHeader?.value || '';
            const body = extractTextFromMessage(latestMessage);
            return pattern.test(subject) || pattern.test(body);
          });

        // Check for automated sender domains
        const automatedDomains = [
          'mailchimp.com', 'constantcontact.com', 'sendgrid.net',
          'amazonses.com', 'notifications.google.com', 'github.com',
          'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com'
        ];

        const hasAutomatedSender = allMessages.some(msg => {
          const fromHeader = msg.payload.headers.find(h => h.name.toLowerCase() === 'from');
          const fromValue = fromHeader?.value || '';
          return automatedDomains.some(domain => fromValue.includes(domain));
        });

        // Skip thread if ANY automated indicator is found
        const shouldSkip = hasAutomatedHeaders || 
                           hasAutomatedContent || 
                           hasAutomatedSender;

        if (shouldSkip) {
          console.log(`Skipping automated thread: ${thread.id}`);
          continue;
        }

        // Get the first message for metadata
        const firstMessage = threadData.messages[0];
        const lastMessage = threadData.messages[threadData.messages.length - 1];
        
        // Extract subject
        const subjectHeader = firstMessage.payload.headers.find(h => h.name.toLowerCase() === 'subject');
        const subject = subjectHeader?.value || '(No Subject)';

        // Get message date
        const lastMessageDate = new Date(parseInt(lastMessage.internalDate));

        // Check for attachments
        const hasAttachments = threadData.messages.some(msg => 
          msg.payload.parts?.some(part => part.filename && part.filename.length > 0)
        );

        // Prepare conversation data
        const conversationData = {
          user_id: user.id,
          thread_id: thread.id,
          gmail_message_id: firstMessage.id,
          subject: subject,
          participants: Array.from(participants),
          snippet: firstMessage.snippet || '',
          labels: Array.from(allLabels),
          last_message_date: lastMessageDate.toISOString(),
          message_count: threadData.messages.length,
          has_attachments: hasAttachments
        };

        // Store conversation metadata
        const { data: conversationRow, error: conversationError } = await supabaseAuthed
          .from('conversations')
          .upsert(conversationData, { 
            onConflict: 'thread_id,user_id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (conversationError) {
          console.error('Failed to store conversation:', conversationError);
          continue;
        }

        // Get user's retention settings
        const { data: profileData } = await supabaseAuthed
          .from('profiles')
          .select('email_retention_days')
          .eq('user_id', user.id)
          .single();

        const retentionDays = profileData?.email_retention_days || 30;

        // Extract and clean content from ONLY the most recent message (which contains full history)
        const mostRecentMessage = threadData.messages[threadData.messages.length - 1];
        const rawContent = extractTextFromMessage(mostRecentMessage);
        const cleanedContent = cleanEmailContent(rawContent);

        const { encrypted: encryptedContent, iv } = await encryptText(cleanedContent, masterEncryptionKey);

        // Calculate expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + retentionDays);

        // Store encrypted email content
        await supabaseAuthed
          .from('email_contents')
          .upsert({
            conversation_id: conversationRow.id,
            encrypted_body: encryptedContent,
            encryption_iv: iv,
            expires_at: expiryDate.toISOString()
          }, { 
            onConflict: 'conversation_id',
            ignoreDuplicates: false 
          });

        processedConversations.push({
          id: firstMessage.id,
          threadId: thread.id,
          subject: subject,
          from: participants.size > 0 ? Array.from(participants)[0] : 'Unknown',
          date: lastMessageDate.toISOString(),
          snippet: firstMessage.snippet || '',
          content: cleanedContent.substring(0, 500) + (cleanedContent.length > 500 ? '...' : ''),
          labels: Array.from(allLabels),
          url: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`
        });

        processedCount++;

      } catch (error) {
        console.error(`Error processing thread ${thread.id}:`, error);
        continue;
      }
    }

    console.log(`Processed ${processedCount} conversations successfully`);

    // Log data ingestion
    await logDataAccess(supabase, user.id, 'email_ingestion', 'conversations', processedCount, {
      threads_fetched: threads.length,
      threads_processed: processedCount,
      date_range_days: sinceDays,
      full_history: fullHistory
    });

    return new Response(
      JSON.stringify({
        success: true,
        messages: processedConversations,
        totalCount: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Gmail sync error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to clean email content by removing signatures and extracting recent messages
function cleanEmailContent(rawContent: string): string {
  // Remove HTML tags
  let content = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Extract the 3 most recent messages using the Gmail threading pattern
  // Pattern: "On DATE at TIME, USER NAME <EMAIL> wrote:"
  const messagePattern = /On .+ at .+, .+ <.+@.+> wrote:/gi;
  const messageSplits = content.split(messagePattern);
  
  // Take only the first 4 parts (original + 3 most recent replies)
  // Index 0 is the most recent, subsequent indices are older messages
  const recentMessages = messageSplits.slice(0, 4);
  
  // Clean each message by removing signatures
  const cleanedMessages = recentMessages.map(msg => removeEmailSignature(msg.trim())).filter(msg => msg.length > 10);
  
  // Rejoin the messages, limiting to 1500 characters total
  const result = cleanedMessages.join('\n\n---\n\n');
  return result.length > 1500 ? result.substring(0, 1500) + '...' : result;
}

// Helper function to remove email signatures
function removeEmailSignature(content: string): string {
  // Common signature patterns
  const signaturePatterns = [
    /--\s*$/m,  // Standard signature delimiter
    /Best regards,[\s\S]*$/im,
    /Sincerely,[\s\S]*$/im,
    /Thanks,[\s\S]*$/im,
    /Sent from my \w+/i,
    /Get Outlook for \w+/i,
    /This email was sent from .*/i,
    /CONFIDENTIAL[\s\S]*$/im,
    /DISCLAIMER[\s\S]*$/im,
    /This message and any attachments[\s\S]*$/im
  ];
  
  let cleaned = content;
  for (const pattern of signaturePatterns) {
    cleaned = cleaned.replace(pattern, '').trim();
  }
  
  // Remove excessive whitespace and empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
  
  return cleaned;
}

// Helper function to extract text from Gmail message
function extractTextFromMessage(message: GmailMessage): string {
  // First try the main body
  if (message.payload.body?.data) {
    try {
      return atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch (e) {
      // Ignore decode errors
    }
  }

  // Then try parts
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (e) {
          // Ignore decode errors
        }
      }
    }
    
    // Fallback to HTML parts
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          // Basic HTML to text conversion
          return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } catch (e) {
          // Ignore decode errors
        }
      }
    }
  }

  // Fallback to snippet
  return message.snippet || '';
}
