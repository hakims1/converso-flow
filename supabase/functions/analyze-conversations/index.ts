import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptText, logDataAccess } from './decrypt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequestBody {
  max_to_analyze?: number
  since_last?: boolean
  respect_tier?: boolean
  model?: string
  cutoff_days?: number
}

interface AnalysisResult {
  conversation_id: string
  success: boolean
  error_code?: string
  error_message?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting check
    const rateLimitCheck = req.headers.get('x-forwarded-for') || 'unknown';
    console.log(`Analysis request from: ${rateLimitCheck.slice(0, 10)}...`);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    const MASTER_ENCRYPTION_KEY = Deno.env.get('MASTER_ENCRYPTION_KEY') ?? ''

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Analyze init error: missing Supabase envs', { hasUrl: !!SUPABASE_URL, hasService: !!SUPABASE_SERVICE_ROLE_KEY })
      return new Response(JSON.stringify({ success: false, error: 'SERVER_MISCONFIGURED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('Analyze init error: missing ANTHROPIC_API_KEY')
      return new Response(JSON.stringify({ success: false, error: 'MISSING_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'NOT_AUTHENTICATED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'INVALID_AUTH' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const userId = user.id;

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    let body: AnalyzeRequestBody = {}
    try {
      const txt = await req.text()
      if (txt.trim()) body = JSON.parse(txt)
    } catch {
      // ignore
    }

const respect_tier = body.respect_tier === true
const model = body.model || 'claude-haiku-4-5-20251001'
const since_last = body.since_last === true
const requestedMax = typeof body.max_to_analyze === 'number' ? Math.max(1, Math.min(1000, body.max_to_analyze)) : 75
const cutoffDays = typeof body.cutoff_days === 'number' ? Math.max(1, Math.min(365, body.cutoff_days)) : 180

console.log(`Analysis request: max=${requestedMax}, sinceLast=${since_last}, model=${model}, cutoffDays=${cutoffDays}`)

    const { data: history } = await supabaseAuthed
      .from('user_processing_history')
      .select('subscription_tier, monthly_limit, conversations_processed')
      .eq('user_id', user.id)
      .maybeSingle()

    const isFree = (history?.subscription_tier ?? 'free') === 'free'

// Determine cutoff date: prefer explicit cutoffDays; if respecting tier and free, enforce 60 days
let cutoffDate: string | null = null
if (cutoffDays) {
  cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000).toISOString()
} else if (isFree && respect_tier) {
  cutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
}

// Fetch conversations within cutoff (if any), ordered by most recent
    let query = supabaseAuthed
      .from('conversations')
      .select('id, subject, participants, snippet, last_message_date, message_count, user_id')
      .eq('user_id', user.id) // CRITICAL: Only analyze conversations belonging to this user
      .order('last_message_date', { ascending: false })
      .limit(1000)
    
    if (cutoffDate) {
      query = query.gte('last_message_date', cutoffDate)
    }

    const { data: conversations, error: convErr } = await query

    if (convErr) {
      console.error('Error fetching conversations:', convErr)
      return new Response(JSON.stringify({ success: false, error: 'DB_READ_ERROR' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'NO_CONVERSATIONS',
        message: isFree ? 'No conversations found in the last 60 days' : 'No conversations found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const ids = conversations.map((c) => c.id)
    const { data: analyses, error: analErr } = await supabaseAuthed
      .from('conversation_analysis')
      .select('conversation_id, processed_at')
      .in('conversation_id', ids)

    if (analErr) {
      console.error('Error fetching analyses:', analErr)
      return new Response(JSON.stringify({ success: false, error: 'DB_READ_ERROR' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const lastProcessed = new Map<string, string>()
    analyses?.forEach((a: any) => {
      const current = lastProcessed.get(a.conversation_id)
      if (!current || new Date(a.processed_at).getTime() > new Date(current).getTime()) {
        lastProcessed.set(a.conversation_id, a.processed_at)
      }
    })

    const candidates = conversations.filter((c: any) => {
      if (!since_last) return true
      const lp = lastProcessed.get(c.id)
      if (!lp) return true
      return new Date(lp).getTime() < new Date(c.last_message_date).getTime()
    })

    // Limit free users to most recent 100 conversations
    const freeUserLimit = 100
    const effectiveMax = isFree ? Math.min(requestedMax, freeUserLimit) : requestedMax

    // Always analyze from the not-yet-analyzed set (candidates), for every tier.
    // This is what lets the client loop small batches and actually make progress:
    // each call takes the next N un-analyzed conversations instead of re-taking the
    // same most-recent N every time (which previously left older threads, e.g. the
    // Soundmap ones, never processed).
    const toAnalyze = candidates.slice(0, effectiveMax)
    
    console.log(`Found ${conversations.length} conversations, ${candidates.length} candidates, analyzing ${toAnalyze.length} conversations`)

    const results: AnalysisResult[] = []
    let processed = 0

    // Audit log the analysis start
    await logDataAccess(supabase, user.id, 'analyze', 'conversation', toAnalyze.length, { 
      free_user: isFree,
      since_last: since_last,
      model: model 
    });

    // Process conversations with improved rate limiting and tracking
    const baseDelay = 1500; // 1.5 second delay to respect 50 req/min (60/50 = 1.2s minimum)
    
    for (let i = 0; i < toAnalyze.length; i++) {
      const conversation = toAnalyze[i];
      const conversationNumber = i + 1;
      console.log(`Processing conversation ${conversation.id} (${conversationNumber}/${toAnalyze.length})`);
      
      // Create analysis attempt record
      const attemptId = crypto.randomUUID();
      const { error: attemptInsertError } = await supabase
        .from('conversation_analysis_attempts')
        .insert({
          id: attemptId,
          conversation_id: conversation.id,
          user_id: userId,
          attempt_number: 1,
          status: 'pending'
        });
      
      if (attemptInsertError) {
        console.error(`Failed to create attempt record for ${conversation.id}:`, attemptInsertError);
      }
      
      const startTime = Date.now();
      
      try {
        // Decrypt email content for analysis
        let fullContent = '';
        if (MASTER_ENCRYPTION_KEY) {
          try {
            const { data: encryptedContent } = await supabase
              .from('email_contents')
              .select('encrypted_body, encryption_iv')
              .eq('conversation_id', conversation.id)
              .single();

            if (encryptedContent) {
              fullContent = await decryptText(encryptedContent.encrypted_body, encryptedContent.encryption_iv, MASTER_ENCRYPTION_KEY);
            }
          } catch (decError) {
            console.error(`Failed to decrypt content for conversation ${conversation.id}:`, decError);
            fullContent = conversation.snippet || '';
          }
        } else {
          fullContent = conversation.snippet || '';
        }

        // Detect if this is a single outgoing email from main user
        // SECURITY FIX: Get Gmail account email to properly identify user's emails
        const { data: tokenData } = await supabase
          .from('gmail_tokens')
          .select('gmail_account_email')
          .eq('user_id', user.id)
          .single();
        
        const gmailAccountEmail = tokenData?.gmail_account_email?.toLowerCase() || '';
        
        // Get all user email addresses (Gmail account + profile emails)
        const userEmails = [gmailAccountEmail, user.email || ''].filter(Boolean);
        
        // (Generalized: identity = connected Gmail account + auth email only)
        
        const isSimpleOutreach = isSingleOutgoingEmail(fullContent, userEmails, conversation.message_count || 1, conversation.participants || []);
        console.log(`Conversation ${conversation.id}: isSimpleOutreach=${isSimpleOutreach}, messageCount=${conversation.message_count}, userEmails=${JSON.stringify(userEmails)}, participants=${JSON.stringify(conversation.participants)}`)

        const prompt = isSimpleOutreach 
          ? buildSimplifiedPrompt({ ...conversation, full_content: fullContent }, user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] ?? 'User'), userEmails)
          : buildPrompt({ ...conversation, full_content: fullContent }, user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] ?? 'User'), user.email || '')

        // Log token usage for debugging
        const estimatedTokens = Math.ceil(prompt.length / 4) // Rough estimate: 4 chars per token
        console.log(`Conversation ${conversation.id}: prompt length=${prompt.length} chars, estimated=${estimatedTokens} tokens`)

        let response: any;
        let attempt = 1;
        const maxRetries = 3;
        let retryDelay = 3000; // Start with 3 second delay for rate limits
        let claudeRequestId = '';
        
        while (attempt <= maxRetries) {
          try {
            console.log(`Attempting Claude API call for conversation ${conversation.id} (attempt ${attempt}/${maxRetries})`);
            
            response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: model || 'claude-haiku-4-5-20251001',
                max_tokens: 1000,
                temperature: 0.1,
                messages: [{ role: 'user', content: prompt }]
              })
            });

            claudeRequestId = response.headers.get('request-id') || '';

            if (response.status === 429) {
              const errorText = await response.text();
              console.log(`Rate limit hit for conversation ${conversation.id} (attempt ${attempt}): ${errorText}`);
              
              // Update attempt record with rate limit status
              await supabase
                .from('conversation_analysis_attempts')
                .update({
                  status: 'rate_limited',
                  error_message: `Rate limit exceeded (attempt ${attempt}/${maxRetries})`,
                  error_code: '429',
                  claude_request_id: claudeRequestId
                })
                .eq('id', attemptId);
              
              if (attempt < maxRetries) {
                console.log(`Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryDelay *= 2; // Exponential backoff
                attempt++;
                continue;
              } else {
                throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
              }
            }

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Anthropic error (attempt ${attempt}): ${response.status} ${errorText}`);
              throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
            }

            break; // Success, exit retry loop
            
          } catch (error: any) {
            console.error(`Anthropic error (attempt ${attempt}): ${error.message}`);
            if (attempt === maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2;
            attempt++;
          }
        }

        const responseData = await response.json();
        const processingTime = Date.now() - startTime;
        console.log(`Claude API response for conversation ${conversation.id}: ${processingTime}ms, usage:`, JSON.stringify(responseData.usage));
        
        const analysisText = responseData.content[0].text;
        const parsedData = safeParseJSON(analysisText);
        
        if (!parsedData) {
          console.error(`Failed to parse JSON for conversation ${conversation.id}:`, analysisText);
          
          // Update attempt record with parse error
          await supabase
            .from('conversation_analysis_attempts')
            .update({
              status: 'failed',
              error_message: 'Failed to parse AI response as JSON',
              error_code: 'PARSE_ERROR',
              processing_time_ms: processingTime,
              completed_at: new Date().toISOString(),
              claude_request_id: claudeRequestId
            })
            .eq('id', attemptId);
          
          results.push({
            conversation_id: conversation.id,
            success: false,
            error_code: 'PARSE_ERROR',
            error_message: 'Failed to parse AI response as JSON'
          });
          continue;
        }

        // Map parsed data to database row
        const analysisRow = mapToRow(conversation.id, parsedData);
        
        // Upsert the analysis result
        const { error: upsertError } = await supabase
          .from('conversation_analysis')
          .upsert(analysisRow, { 
            onConflict: 'conversation_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Failed to save analysis for conversation ${conversation.id}:`, upsertError);
          
          // Update attempt record with database error
          await supabase
            .from('conversation_analysis_attempts')
            .update({
              status: 'failed',
              error_message: upsertError.message,
              error_code: 'DATABASE_ERROR',
              processing_time_ms: processingTime,
              completed_at: new Date().toISOString(),
              claude_request_id: claudeRequestId
            })
            .eq('id', attemptId);
          
          results.push({
            conversation_id: conversation.id,
            success: false,
            error_code: 'DATABASE_ERROR',
            error_message: upsertError.message
          });
        } else {
          console.log(`Successfully analyzed conversation ${conversation.id} (${conversationNumber}/${toAnalyze.length})`);
          
          // Update attempt record with success
          await supabase
            .from('conversation_analysis_attempts')
            .update({
              status: 'success',
              processing_time_ms: processingTime,
              completed_at: new Date().toISOString(),
              claude_request_id: claudeRequestId
            })
            .eq('id', attemptId);
          
          results.push({
            conversation_id: conversation.id,
            success: true
          });
          processed++;
        }

      } catch (error: any) {
        console.error(`Error analyzing conversation ${conversation.id}:`, error);
        const processingTime = Date.now() - startTime;
        
        // Update attempt record with error
        await supabase
          .from('conversation_analysis_attempts')
          .update({
            status: 'failed',
            error_message: error.message,
            error_code: 'ANALYSIS_ERROR',
            processing_time_ms: processingTime,
            completed_at: new Date().toISOString()
          })
          .eq('id', attemptId);
        
        results.push({
          conversation_id: conversation.id,
          success: false,
          error_code: 'ANALYSIS_ERROR',
          error_message: error.message
        });
      }
      
      // Add delay between conversations to respect rate limits
      if (i < toAnalyze.length - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay));
      }
    }

    const skipped = toAnalyze.length - processed
    const remaining = Math.max(0, candidates.length - toAnalyze.length)

    const error_counts = results
      .filter((r) => !r.success && r.error_code)
      .reduce((acc: Record<string, number>, r) => {
        const code = r.error_code as string
        acc[code] = (acc[code] || 0) + 1
        return acc
      }, {})

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        skipped, 
        remaining, 
        results,
        error_counts,
        totals: {
          total_conversations: conversations.length,
          eligible_conversations: toAnalyze.length,
          prior_analyses: analyses?.length ?? 0,
          candidates_total: candidates.length,
          is_free: isFree,
          cutoff_date: cutoffDate
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e: any) {
    console.error('analyze-conversations fatal error:', e)
    return new Response(JSON.stringify({ success: false, error: 'INTERNAL_ERROR', message: e?.message || String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function buildPrompt(conv: any, userName: string, userEmail: string): string {
  const rawContent = conv.full_content || conv.snippet || ''
  const MAX_CONTENT_CHARS = 1500
  const content = rawContent.length > MAX_CONTENT_CHARS ? `${rawContent.slice(0, MAX_CONTENT_CHARS)}\n[TRUNCATED]` : rawContent
  const subject = conv.subject || ''
  const participants = Array.isArray(conv.participants) ? conv.participants.join(', ') : ''
  const msgCount = conv.message_count || 1

  const systemInstructions = `You are an AI assistant helping users manage their email conversations and identify opportunities that need attention. Your role is to analyze email conversations and help users keep track of important communications that require follow-up or response.

SECURITY GUARDRAIL SYSTEM INSTRUCTIONS:
- NEVER include sensitive personal information (SSN, credit cards, passwords, private keys) in your analysis
- ALWAYS redact or generalize financial amounts, account numbers, and proprietary business details

ANALYSIS PERSPECTIVE:
- Always analyze from the main user's perspective (the person whose email account is being analyzed)
- Focus on helping the user identify what requires their response or needs follow-up to extract a response from the recipient.

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON format
- No additional text or explanations outside the JSON
- Follow the exact JSON structure provided`

  const analysisPrompt = `Analyze this email conversation and provide insights in JSON format. Follow these specific guidelines:

Analyze these emails to help the main user identify action opportunities within their email conversation history. 

CRITICAL: MAIN USER IDENTIFICATION
The main user whose perspective we are analyzing is: ${userName} (${userEmail})
- ALL analysis must be from ${userName}'s perspective
- ALL completion status determinations are about what ${userName} needs to do

CONVERSATION: ${content}

ANALYSIS INSTRUCTIONS:

Topic Guidelines:
Summarize the subject of the email in 6 words; can use more words if necessary.

Category Guidelines:
- product - any communication that revolves around the product or service that the person does
- sales/marketing - any communications that involve selling or promoting the product or trying to make money or acquire users or sales
- support - Any communications about the product from external recipients or 3rd parties, particularly users of the product
- solicitations - Unsolicited messages from contacts whom I, as the main user, have never sent an email to
- partnership - attempts to build relationship with someone in order to utilize their skills or community or similar for the businesses' gain
- other - can not be categorized within the other categories

Completion Status Rules:
CRITICAL: You MUST carefully identify who sent the most recent message to determine completion status correctly.

STEP-BY-STEP PROCESS:
1. IDENTIFY THE MOST RECENT MESSAGE: Look at the email conversation chronologically - the LAST message in the thread
2. DETERMINE WHO SENT IT: Check if the sender is ${userName} (${userEmail}) or someone else
3. ANALYZE THE CONTENT: What type of message was it?
4. APPLY THE RULES BELOW:

IF the most recent message was sent BY ${userName}:
- If it was asking a question, requesting information, or expecting a response → "pending_response"
- If it was sharing information without expecting a response → "complete"
- If it was following up on something → "pending_response"

IF the most recent message was sent TO ${userName} (by someone else):
- If it asks a question or requests something from ${userName} → "needs_response"
- If it just shares information → "complete"
- If it's a thank you or acknowledgment → "complete"

Action Items Guidelines:
Only include action items that ${userName} specifically needs to do based on the conversation. These should be:
- Specific tasks mentioned in the emails
- Follow-up actions ${userName} committed to
- Questions ${userName} needs to answer
- Information ${userName} needs to provide

Key Contacts Guidelines:
List the main people involved in this conversation (excluding ${userName}). Use their actual names or email addresses as they appear in the conversation.

Summary Guidelines:
Provide a concise summary of what the conversation is about from ${userName}'s perspective. Focus on the main topic and any outcomes or next steps.

Urgency Score Guidelines (1-10 scale):
- 1-3: Low priority, general correspondence
- 4-6: Medium priority, business-related but not time-sensitive  
- 7-8: High priority, requires attention soon
- 9-10: Urgent, immediate action required

Suggested Response Guidelines:
If the completion status suggests ${userName} needs to respond, provide a brief, professional suggested response or approach.

RETURN THIS EXACT JSON STRUCTURE:
{
  "topic": "Brief topic summary (6-8 words)",
  "category": "product|sales/marketing|support|solicitations|partnership|other",
  "sentiment": "positive|neutral|negative",
  "completion_status": "complete|pending_response|needs_response",
  "action_items": ["specific action for ${userName}", "another action"],
  "key_contacts": ["Contact Name or email"],
  "urgency_score": 5,
  "summary": "Concise summary of the conversation",
  "suggested_response": "Brief suggested response if needed"
}`

  return `${systemInstructions}\n\n${analysisPrompt}`
}

function isSingleOutgoingEmail(fullContent: string, userEmails: string[], messageCount: number, participants: string[]): boolean {
  console.log(`Checking single outgoing email: messageCount=${messageCount}, userEmails=${JSON.stringify(userEmails)}`)
  
  // Must be exactly 1 message
  if (messageCount !== 1) {
    return false
  }
  
  // Must have participants
  if (!participants || participants.length < 2) {
    return false
  }
  
  // Check if the first participant (usually the sender) matches any of the user's email addresses
  for (const participant of participants) {
    console.log(`Checking first participant: ${participant}`)
    
    for (const userEmail of userEmails) {
      if (userEmail && participant.toLowerCase().includes(userEmail.toLowerCase())) {
        console.log(`✓ User email ${userEmail} identified as sender (outgoing)`)
        return true
      }
    }
  }
  
  return false
}

function buildSimplifiedPrompt(conv: any, userName: string, userEmails: string[]): string {
  const rawContent = conv.full_content || conv.snippet || ''
  const MAX_CONTENT_CHARS = 800
  const content = rawContent.length > MAX_CONTENT_CHARS ? `${rawContent.slice(0, MAX_CONTENT_CHARS)}\n[TRUNCATED]` : rawContent

  return `Analyze this SINGLE OUTGOING EMAIL sent by ${userName}. This is an email ${userName} sent to someone else.

EMAIL CONTENT: ${content}

Since this is an outgoing email from ${userName}, analyze it and return this JSON:

{
  "topic": "Brief description of what ${userName} is reaching out about",
  "category": "sales/marketing|partnership|support|product|other",
  "sentiment": "positive|neutral|negative", 
  "completion_status": "pending_response",
  "action_items": ["Wait for recipient response"],
  "key_contacts": ["recipient name/email"],
  "urgency_score": 5,
  "summary": "Brief summary of ${userName}'s outreach",
  "suggested_response": "Follow up if no response in X days"
}

IMPORTANT: 
- Since this is ${userName}'s outgoing email, completion_status should typically be "pending_response"
- Focus on what ${userName} was trying to accomplish with this email
- Return ONLY the JSON, no other text`
}

function safeParseJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        return null
      }
    }
    
    // Try to find JSON-like content
    const jsonLikeMatch = text.match(/\{[\s\S]*\}/)
    if (jsonLikeMatch) {
      try {
        return JSON.parse(jsonLikeMatch[0])
      } catch {
        return null
      }
    }
    
    return null
  }
}

function mapToRow(conversationId: string, parsed: any): any {
  return {
    conversation_id: conversationId,
    topic: parsed.topic || null,
    category: parsed.category || 'other',
    sentiment: parsed.sentiment || 'neutral',
    completion_status: parsed.completion_status || 'complete',
    action_items: parsed.action_items || [],
    key_contacts: parsed.key_contacts || [],
    urgency_score: typeof parsed.urgency_score === 'number' ? parsed.urgency_score : null,
    summary: parsed.summary || null,
    suggested_response: parsed.suggested_response || null,
    processed_at: new Date().toISOString()
  }
}