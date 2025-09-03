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
      return new Response(JSON.stringify({ success: false, error: 'SERVER_MISCONFIGURED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'MISSING_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
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

    const respect_tier = body.respect_tier !== false
    const model = body.model || 'claude-3-5-haiku-20241022'
    const since_last = respect_tier ? false : body.since_last !== false
    const requestedMax = typeof body.max_to_analyze === 'number' ? Math.max(1, Math.min(1000, body.max_to_analyze)) : 1000

    const { data: history } = await supabaseAuthed
      .from('user_processing_history')
      .select('subscription_tier, monthly_limit, conversations_processed')
      .eq('user_id', user.id)
      .maybeSingle()

    const isFree = (history?.subscription_tier ?? 'free') === 'free'

    // For free users: only analyze conversations from last 60 days
    const cutoffDate = isFree ? new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() : null
    
    // Fetch conversations with tier-based filtering - only analyze conversations that exist in user's database
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

    // For free users, analyze ALL conversations within the 60-day window
    // For paid users, use the standard since_last logic
    const toAnalyze = isFree ? conversations.slice(0, requestedMax) : candidates.slice(0, requestedMax)

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

        const input = buildPrompt({...conv, full_content: fullContent}, user.user_metadata?.full_name || user.user_metadata?.name || (user.email?.split('@')[0] ?? 'User'), user.email || '')
        const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            temperature: 0.1,
            messages: [
              { role: 'user', content: input },
            ],
          }),
        })

        if (!aiResp.ok) {
          const txt = await aiResp.text()
          console.error('Anthropic error:', aiResp.status, txt)
          results.push({ conversation_id: conv.id, success: false, error_code: 'MODEL_ERROR', error_message: txt })
          continue
        }

        const data = await aiResp.json()
        const text = data?.content?.[0]?.text || ''
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
      } catch (e: any) {
        console.error('Unexpected analyze error:', e)
        results.push({ conversation_id: conv.id, success: false, error_code: 'UNEXPECTED', error_message: e?.message || String(e) })
      }
    }

    const skipped = toAnalyze.length - processed
    const remaining = Math.max(0, candidates.length - toAnalyze.length)

    return new Response(
      JSON.stringify({ success: true, processed, skipped, remaining, results }),
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
  const content = conv.full_content || conv.snippet || ''
  const subject = conv.subject || ''
  const participants = Array.isArray(conv.participants) ? conv.participants.join(', ') : ''
  const msgCount = conv.message_count || 1

  const systemInstructions = `You are an AI assistant helping users manage their email conversations and identify opportunities that need attention. Your role is to analyze email conversations and help users keep track of important communications that require follow-up or response.

SECURITY GUARDRAIL SYSTEM INSTRUCTIONS:
- NEVER include sensitive personal information (SSN, credit cards, passwords, private keys) in your analysis
- ALWAYS redact or generalize financial amounts, account numbers, and proprietary business details
- FOCUS on communication patterns and action items rather than sensitive content details
- LIMIT suggested responses to professional, non-sensitive topics only
- IF you encounter highly sensitive data, provide only high-level category analysis

ANALYSIS PERSPECTIVE:
- Always analyze from the main user's perspective (the person whose email account is being analyzed)
- Focus on helping the user identify what requires their response or needs follow-up to extract a response from the recipient.
- Provide actionable insights for relationship and opportunity management

RESPONSE GUIDELINES:
- Keep suggestions brief and actionable
- Match the tone of the main user's messages in the conversation
- Always use a human tone
- If uncertain about what to say, use professional but friendly language appropriate for business communications
- Only suggest responses for "need_to_respond" or "needs_followup" status

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON format
- No additional text or explanations outside the JSON
- Follow the exact JSON structure provided
- MINIMIZE sensitive data in output - focus on actionable insights only`

  const analysisPrompt = `Analyze this email conversation and provide insights in JSON format. Follow these specific guidelines:

Analyze these emails as if you are an assistant helping the main user keep track of email conversations that need attention. With many outgoing and incoming emails from several different entities, help the user identify opportunities and communications that haven't been completed.

CRITICAL: MAIN USER IDENTIFICATION
The main user whose perspective we are analyzing is: ${userName} (${userEmail})
- ALL analysis must be from ${userName}'s perspective
- ALL completion status determinations are about what ${userName} needs to do
- ALL suggested responses should be written as if ${userName} is responding
- When determining "need_to_respond" vs "needs_followup", ask: "What does ${userName} need to do next?"

CONVERSATION: ${content}

ANALYSIS INSTRUCTIONS:

Sentiment Analysis Guidelines:
- Focus on the FINAL sentiment of the conversation from the person who sent the most recent email, not all individual emails
- "positive" = agreement, satisfaction, successful resolution, enthusiasm
- "negative" = disagreement, dissatisfaction, complaints, rejection
- "frustrated" = repeated issues, delays, misunderstandings, impatience
- "neutral" = informational, factual, no strong emotion

Topic Guidelines:
Try to summarize the subject of the email in 5 words max, but you can use more words if absolutely necessary.

Category Guidelines:
- product - any communication that revolves around the product or service that the person does
- sales/marketing - any communications that involve selling the product or trying to make money or acquire users or sales
- support - Any communications about the product from external recipients or 3rd parties, particularly users of the product
- solicitations - Unsolicited messages from contacts whom I, as the main user, have never sent an email to
- partnership - attempts to build relationship with someone in order to utilize their skills or community or similar for the businesses' gain
- other - can not be categorized within the other categories

Completion Status Rules:
1. If the most recent message is FROM Matt label as: "needs_followup" , UNLESS: Matt clearly concluded the conversation ("thanks", "confirmed", "done," etc.)

2. If the most recent message was addressed TO Matt (especially if there is a question contained in the message) label as "need_to_respond" , UNLESS: It's clearly just an FYI or pure acknowledgment

3. IF there was a clear conclusion or acknowledgement, then the completion status will be "complete"

CONCLUSION INDICATORS:
- "Thanks!", "Perfect!", "Sounds good!", "Confirmed", "Done", "Great!"
- Statements where Matt commits to future action without asking for response

Number of communications:
This is simply the number of times a communication was made by any participant of the email thread. (I.e. if it's an email that was sent and never replied to, the Number of communications = 1)

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

Example:

Input:
Analyze this email conversation and provide insights in JSON format. Follow these specific guidelines:

Analyze these emails as if you are an assistant helping the main user keep track of email conversations that need attention. With many outgoing and incoming emails from several different entities, help the user identify opportunities and communications that haven't been completed.

CRITICAL: MAIN USER IDENTIFICATION
The main user whose perspective we are analyzing is: Matt Hakimi (matt@peachscore.com)
- ALL analysis must be from Matt's perspective
- ALL completion status determinations are about what MATT needs to do
- ALL suggested responses should be written as if MATT is responding
- When determining "need_to_respond" vs "needs_followup", ask: "What does MATT need to do next?"

CONVERSATION: {
Francisco Arellano

10:32 AM (4 hours ago)
to me, alex@peachscore.com

Hello Matt,

I hope you are doing well.
I will have a principal meeting today, and I will be able to review this opportunity then.



Are you still accepting registrations?



Regards 

Francisco J. Arellano 



El 11 ago 2025, a las 5:44 p.m., Matt Hakimi <matt@peachscore.com> escribió:

Hi Francisco, I am glad to hear that! 

If you have any questions about the program and the benefits you should expect to receive, just ask me - that's what I'm here for!

Looking forward to having you join the Peachscore family,

On Mon, Aug 11, 2025 at 12:18 PM Francisco Arellano <francisco.arellano@franjaconsultoria.com> wrote:
Hi Matt,

Thank you for your follow-up.

I will be in a meeting to review this opportunity, and I expect to have a decision by the end of this week.

I am very interested in this program and look forward to getting back to you soon.

Best regards,


Francisco Arellano 

El 11 ago 2025, a las 12:01 p.m., Matt Hakimi <matt@peachscore.com> escribió:

Hi Francisco Javier, I'm Matt, the Director of Innovation at Peachscore.

I noticed that you started your application and wanted to thank you for your interest. I also wanted to check if you had any questions for me about the program or the application process?

We will be closing out the application for Cohort 22 soon and I wanted to make sure you don't miss the opportunity. You can complete your application by visiting: https://app.peachscore.com/plan    

Looking forward to hearing from you.
}

Output:
{
  "category": "sales/marketing",
  "topic": "Peachscore Cohort 22 Application",
  "sentiment": "positive",
  "completion_status": "need_to_respond",
  "number_of_communications": 4,
  "summary": "Francisco is interested in the Peachscore program and is reviewing the opportunity. He has questions about registration and is expecting to make a decision soon.",
  "action_items": [
    "Francisco to review opportunity in principal meeting",
    "Matt to confirm application registration status"
  ],
  "urgency_score": 6,
  "key_contacts": [
    "Francisco Arellano",
    "Matt Hakimi"
  ],
  "suggested_response": "Hi Francisco, thanks for your update. Yes, we are still accepting registrations for Cohort 22. Please let me know if you have any final questions or need assistance completing your application before we close out the cohort."
}

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
  "suggested_response": "brief suggested reply or null if no response needed"
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
    sentiment: validSentiments.includes(sentiment) ? sentiment : 'neutral',
    category: validCategories.includes(category) ? category : 'other',
    topic: toText(p.topic) || null,
    summary: toText(p.summary) || null,
    completion_status: validCompletionStatuses.includes(completion_status) ? completion_status : 'needs_followup',
    action_items: Array.isArray(p.action_items) ? p.action_items : [],
    key_contacts: toArray(p.key_contacts) || [],
    urgency_score: Math.min(10, Math.max(1, toInt(p.urgency_score) ?? 5)),
    suggested_response: toText(p.suggested_response) || null,
  }
}
