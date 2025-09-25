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
const model = body.model || 'claude-3-5-haiku-20241022'
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
    
    // For free users, analyze recent conversations within limit
    // For paid users, use the standard since_last logic
    const toAnalyze = isFree ? conversations.slice(0, effectiveMax) : candidates.slice(0, effectiveMax)
    
    console.log(`Found ${conversations.length} conversations, ${candidates.length} candidates, analyzing ${toAnalyze.length} conversations`)

    const results: AnalysisResult[] = []
    let processed = 0

    // Audit log the analysis start
    await logDataAccess(supabase, user.id, 'analyze', 'conversation', toAnalyze.length, { 
      free_user: isFree,
      since_last: since_last,
      model: model 
    });

    for (const conv of toAnalyze) {
      try {
        // Decrypt email content for analysis
        let fullContent = '';
        if (MASTER_ENCRYPTION_KEY) {
          try {
            const { data: encryptedContent } = await supabase
              .from('email_contents')
              .select('encrypted_body, encryption_iv')
              .eq('conversation_id', conv.id)
              .single();

            if (encryptedContent) {
              fullContent = await decryptText(encryptedContent.encrypted_body, encryptedContent.encryption_iv, MASTER_ENCRYPTION_KEY);
            }
          } catch (decError) {
            console.error(`Failed to decrypt content for conversation ${conv.id}:`, decError);
            fullContent = conv.snippet || '';
          }
        } else {
          fullContent = conv.snippet || '';
        }

        // Detect if this is a single outgoing email from main user
        // Get all user email addresses (Gmail sync email + business emails)
        const userEmails = [user.email || ''].filter(Boolean);
        
        // For Matt Hakimi specifically, add known business email patterns
        // This logic can be expanded for other users as needed
        const primaryEmail = user.email || '';
        if (primaryEmail.includes('matt.hakims@gmail.com')) {
          userEmails.push('matt@peachscore.com'); // Known business email
        }
        
        // Also check participants array for patterns where user appears as sender
        const additionalUserEmails = conv.participants
          ?.filter((p: string) => p.toLowerCase().includes('matt') && p.includes('@'))
          .map((p: string) => {
            const emailMatch = p.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            return emailMatch ? emailMatch[1] : null;
          })
          .filter(Boolean) || [];
        
        userEmails.push(...additionalUserEmails);
        
        const isSimpleOutreach = isSingleOutgoingEmail(fullContent, userEmails, conv.message_count || 1, conv.participants || []);
        console.log(`Conversation ${conv.id}: isSimpleOutreach=${isSimpleOutreach}, messageCount=${conv.message_count}, userEmails=${JSON.stringify(userEmails)}, participants=${JSON.stringify(conv.participants)}`)

        const input = isSimpleOutreach 
          ? buildSimplifiedPrompt({ ...conv, full_content: fullContent }, user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] ?? 'User'), userEmails)
          : buildPrompt({ ...conv, full_content: fullContent }, user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] ?? 'User'), user.email || '')

// Log token usage for debugging
const estimatedTokens = Math.ceil(input.length / 4) // Rough estimate: 4 chars per token
console.log(`Conversation ${conv.id}: prompt length=${input.length} chars, estimated=${estimatedTokens} tokens`)

// Retry with exponential backoff for rate limits / transient errors
let aiData: any = null
let attempt = 0
const startTime = Date.now()
while (attempt < 3) {
  attempt++
  console.log(`Attempting Claude API call for conversation ${conv.id} (attempt ${attempt}/3)`)
  
  const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      temperature: 0.1,
      messages: [
        { role: 'user', content: input },
      ],
    }),
  })

  if (aiResp.status === 429 || aiResp.status >= 500) {
    const waitMs = 1000 * Math.pow(2, attempt - 1)
    const txt = await aiResp.text()
    console.error(`Anthropic error (attempt ${attempt}):`, aiResp.status, txt)
    await new Promise((r) => setTimeout(r, waitMs))
    continue
  }

  if (!aiResp.ok) {
    const txt = await aiResp.text()
    console.error(`Anthropic error for conversation ${conv.id} (attempt ${attempt}):`, aiResp.status, txt)
    
    // If this is the final attempt, record the failure and continue to next conversation
    if (attempt >= 3) {
      results.push({ conversation_id: conv.id, success: false, error_code: 'MODEL_ERROR', error_message: txt })
      break
    }
    continue // Retry
  }

  aiData = await aiResp.json()
  const responseTime = Date.now() - startTime
  console.log(`Claude API response for conversation ${conv.id}: ${responseTime}ms, usage: ${JSON.stringify(aiData.usage || {})}`)
  break
}

if (!aiData) {
  continue
}

const text = aiData?.content?.[0]?.text || ''
        const parsed = safeParseJSON(text)
        if (!parsed) {
          results.push({ conversation_id: conv.id, success: false, error_code: 'JSON_PARSE_ERROR', error_message: 'Model did not return valid JSON' })
          continue
        }

        const row = mapToRow(conv.id, parsed)

        const upsertRow = { ...row, processed_at: new Date().toISOString() }

        const { error: upsertErr } = await supabaseAuthed
          .from('conversation_analysis')
          .upsert(upsertRow, { onConflict: 'conversation_id' })

        if (upsertErr) {
          console.error('Upsert error:', upsertErr)
          results.push({ conversation_id: conv.id, success: false, error_code: 'DB_WRITE_ERROR', error_message: upsertErr.message })
          continue
        }

        results.push({ conversation_id: conv.id, success: true })
        processed += 1
        console.log(`Successfully analyzed conversation ${conv.id} (${processed}/${toAnalyze.length})`)
        
        // Throttle to respect model token-per-minute limits (reduced for better UX)
        await new Promise((r) => setTimeout(r, 300))
      } catch (e: any) {
        console.error('Unexpected analyze error:', e)
        results.push({ conversation_id: conv.id, success: false, error_code: 'UNEXPECTED', error_message: e?.message || String(e) })
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
3. SHOW YOUR REASONING: In your analysis, explain who sent the most recent message and why you chose the completion status

COMPLETION STATUS LOGIC:

1. "needs_followup" --> Most recent message is FROM ${userName} (${userEmail}) 
   - ${userName} sent the last message and is waiting for a response
   - UNLESS: ${userName} clearly concluded the conversation (thanks, confirmed, done, etc.)

2. "need_to_respond" --> Most recent message TO ${userName} (from someone else)  
   - Someone else sent the last message and ${userName} should respond
   - ESPECIALLY if there's a question, request, or call-to-action
   - UNLESS: It's clearly just an FYI or pure acknowledgment

3. "complete" -->Either case with clear resolution 

FALLBACK RULE: If you're uncertain about who sent the most recent message, default to "need_to_respond" to ensure important messages aren't missed.

CONCLUSION INDICATORS:
- "Thanks!", "Perfect!", "Sounds good!", "Confirmed", "Done", "Great!"
- Statements where ${userName} commits to future action without asking for response
- Clear project completion or deal closure statements

DEBUGGING REQUIREMENT: 
In your analysis reasoning, briefly explain: "Most recent message from [sender name/email] shows [completion status] because [reason]"

Action Items Detection:
- Only include specific, actionable tasks with clear ownership
- Include deadlines if mentioned
- Format: "Person to do X by Y date" or "Person to do X"
- Exclude vague statements like "let's stay in touch"

Urgency Scoring Criteria:
- 9-10: Immediate deadlines, angry customers, urgent problems
- 7-8: Time-sensitive opportunities, important decisions pending
- 5-6: Standard follow-ups, routine business
- 3-4: Informational, non-urgent requests
- 1-2: General networking, casual conversations

Key Contacts Rules:
- Include people who: made decisions, have authority, mentioned budget/timeline, expressed strong interest
- Exclude: CC'd people who didn't participate, automated senders

Provide your analysis in exactly this JSON format:

OUTPUT FORMAT:
{
  "category": "one of: product, sales/marketing, support, solicitations, partnership, other",
  "topic": "specific subject in 2-5 words",
  "sentiment": "one of: positive, neutral, negative, frustrated",
  "completion_status": "one of: complete, need_to_respond, needs_followup",
  "number_of_communications": ${msgCount},
  "summary": "2-3 sentence overview focusing on key outcomes and next steps",
  "action_items": ["specific task 1", "specific task 2"],
  "urgency_score": 5,
  "key_contacts": ["name1", "name2"],
  "suggested_response": "brief suggested reply or null if no response needed",
  "reasoning": "Most recent message from [sender] shows [completion_status] because [brief explanation]"
}`

  return `${systemInstructions}\n\n${analysisPrompt}`
}

function isSingleOutgoingEmail(fullContent: string, userEmails: string[], messageCount: number, participants: string[]): boolean {
  // Must have exactly 1 message
  if (messageCount !== 1) return false;
  
  console.log(`Checking single outgoing email: messageCount=${messageCount}, userEmails=${JSON.stringify(userEmails)}`);
  
  // Check if user appears as sender in participants array
  // In Gmail, participants array format: ["Sender Name <sender@email.com>", "recipient@email.com"]
  // For outgoing emails, user should be first participant (sender)
  if (participants && participants.length >= 1) {
    const firstParticipant = participants[0];
    console.log(`Checking first participant: ${firstParticipant}`);
    
    // Check if any of the user's emails appears in the first participant (sender)
    for (const userEmail of userEmails) {
      if (userEmail && firstParticipant.toLowerCase().includes(userEmail.toLowerCase())) {
        console.log(`✓ User email ${userEmail} identified as sender (outgoing)`);
        return true;
      }
    }
    
    console.log(`❌ None of user emails found as sender in: ${firstParticipant}`);
  }
  
  // Fallback: Extract From header from email content
  const fromHeaderMatch = fullContent.match(/From:\s*([^\n\r]+)/i);
  if (fromHeaderMatch) {
    const fromHeader = fromHeaderMatch[1];
    console.log(`Checking From header: ${fromHeader}`);
    
    for (const userEmail of userEmails) {
      if (userEmail && fromHeader.toLowerCase().includes(userEmail.toLowerCase())) {
        console.log(`✓ User email ${userEmail} found in From header (outgoing)`);
        return true;
      }
    }
  }
  
  console.log(`❌ Could not identify any user email as sender`);
  return false;
}

function buildSimplifiedPrompt(conv: any, userName: string, userEmails: string[]): string {
  const rawContent = conv.full_content || conv.snippet || ''
  const MAX_CONTENT_CHARS = 1500
  const content = rawContent.length > MAX_CONTENT_CHARS ? `${rawContent.slice(0, MAX_CONTENT_CHARS)}\n[TRUNCATED]` : rawContent
  const msgCount = conv.message_count || 1

  const systemInstructions = `You are analyzing a single outgoing email from ${userName}

ANALYSIS REQUIREMENTS:
- This is a cold outreach email that has received no response yet
- completion_status is automatically "needs_followup" 
- Only analyze: category, topic, urgency_score
- Keep analysis brief and focused

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON format
- No additional explanations outside the JSON`

  const analysisPrompt = `Analyze this single outgoing email and provide basic insights in JSON format:

CONVERSATION: ${content}

ANALYSIS INSTRUCTIONS:

Category Guidelines:
- sales/marketing - trying to make money, acquire users, promote services
- partnership - building relationships for business gain  
- product - about the product/service offered
- other - anything else

Topic Guidelines: Summarize the email subject in 2-5 words

Urgency Scoring:
- 7-8: Time-sensitive opportunities, important prospects
- 5-6: Standard outreach, routine business  
- 3-4: General networking, non-urgent outreach
- 1-2: Casual, low-priority communications

OUTPUT FORMAT:
{
  "category": "one of: sales/marketing, partnership, product, other",
  "topic": "2-5 word summary",  
  "urgency_score": 5,
  "completion_status": "needs_followup",
  "number_of_communications": ${msgCount},
  "summary": "Brief 1 sentence summary of outreach purpose",
  "key_contacts": ["recipient name if identifiable"]
}`

  return `${systemInstructions}\n\n${analysisPrompt}`
}

function safeParseJSON(text: string): any | null {
  if (!text) return null
  const match = text.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : text
  try {
    return JSON.parse(candidate)
  } catch {
    return null
  }
}

function mapToRow(conversation_id: string, p: any) {
  const toText = (v: any) => (typeof v === 'string' ? v : null)
  const toInt = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const toArray = (v: any) => (Array.isArray(v) ? v : null)

  // Validate and constrain values to match database constraints
  const validCategories = ['product', 'sales/marketing', 'support', 'solicitations', 'partnership', 'other']
  const validSentiments = ['positive', 'neutral', 'negative', 'frustrated']
  const validCompletionStatuses = ['complete', 'need_to_respond', 'needs_followup']

  const category = toText(p.category)
  const sentiment = toText(p.sentiment) 
  const completion_status = toText(p.completion_status)

  return {
    conversation_id,
    sentiment: validSentiments.includes(sentiment || '') ? (sentiment || 'neutral') : 'neutral',
    category: validCategories.includes(category || '') ? (category || 'other') : 'other',
    topic: toText(p.topic) || null,
    summary: toText(p.summary) || null,
    completion_status: validCompletionStatuses.includes(completion_status || '') ? (completion_status || 'needs_followup') : 'needs_followup',
    action_items: Array.isArray(p.action_items) ? p.action_items : [],
    key_contacts: toArray(p.key_contacts) || [],
    urgency_score: Math.min(10, Math.max(1, toInt(p.urgency_score) ?? 5)),
    suggested_response: toText(p.suggested_response) || null,
  }
}
