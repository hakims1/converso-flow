import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

    const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

    const since_last = body.since_last !== false
    const requestedMax = typeof body.max_to_analyze === 'number' ? Math.max(1, Math.min(50, body.max_to_analyze)) : 10
    const respect_tier = body.respect_tier !== false
    const model = body.model || 'claude-3-5-haiku-20241022'

    const { data: history } = await supabaseAuthed
      .from('user_processing_history')
      .select('subscription_tier, monthly_limit, conversations_processed')
      .eq('user_id', user.id)
      .single()

    let tierLimit = 50
    if (respect_tier && history) {
      const remaining = Math.max(0, (history.monthly_limit ?? 50) - (history.conversations_processed ?? 0))
      tierLimit = Math.max(0, remaining)
    }

    const maxToAnalyze = Math.min(requestedMax, tierLimit || requestedMax)
    if (maxToAnalyze <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'TIER_LIMIT_REACHED' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Fetch recent conversations (cap to 200 to compute freshness)
    const { data: conversations, error: convErr } = await supabaseAuthed
      .from('conversations')
      .select('id, subject, participants, snippet, full_content, last_message_date, message_count')
      .order('last_message_date', { ascending: false })
      .limit(200)

    if (convErr) {
      console.error('Error fetching conversations:', convErr)
      return new Response(JSON.stringify({ success: false, error: 'DB_READ_ERROR' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'NO_CONVERSATIONS' }), {
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

    const toAnalyze = candidates.slice(0, maxToAnalyze)

    const results: AnalysisResult[] = []
    let processed = 0

    for (const conv of toAnalyze) {
      try {
        const input = buildPrompt(conv)
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

        const { error: insertErr } = await supabaseAuthed
          .from('conversation_analysis')
          .insert(row)

        if (insertErr) {
          console.error('Insert error:', insertErr)
          results.push({ conversation_id: conv.id, success: false, error_code: 'DB_WRITE_ERROR', error_message: insertErr.message })
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

function buildPrompt(conv: any): string {
  const content = conv.full_content || conv.snippet || ''
  const subject = conv.subject || ''
  const participants = Array.isArray(conv.participants) ? conv.participants.join(', ') : ''
  const msgCount = conv.message_count || 1

  const systemInstructions = `You are an AI assistant helping users manage their email conversations and identify opportunities that need attention. Your role is to analyze email conversations and help users keep track of important communications that require follow-up or response.

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
- Follow the exact JSON structure provided`

  const analysisPrompt = `Analyze this email conversation and provide insights in JSON format. Follow these specific guidelines:

Analyze these emails as if you are an assistant helping the main user keep track of email conversations that need attention. With many outgoing and incoming emails from several different entities, help the user identify opportunities and communications that haven't been completed.

CRITICAL: MAIN USER IDENTIFICATION
The main user whose perspective we are analyzing is: Matt Hakimi (matt@peachscore.com)
- ALL analysis must be from Matt's perspective
- ALL completion status determinations are about what MATT needs to do
- ALL suggested responses should be written as if MATT is responding
- When determining "need_to_respond" vs "needs_followup", ask: "What does MATT need to do next?"

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

Category Guidelines (must use EXACT values from this list):
- "sales" - any communications that involve selling the product or trying to make money or acquire users or sales  
- "support" - Any communications about the product from external recipients or 3rd parties, particularly users of the product
- "internal" - any communication that revolves around the product or service that the person does, or internal business communications
- "other" - Unsolicited messages, partnerships, or anything that cannot be categorized within the other categories

Completion Status Rules:
SIMPLIFIED COMPLETION STATUS RULES:
1. Most recent message FROM Matt → "needs_followup" 
   UNLESS: Matt clearly concluded the conversation (thanks, confirmed, done, etc.)

2. Most recent message TO Matt (especially if there is a question contained in the message) → "need_to_respond"
   UNLESS: It's clearly just an FYI or pure acknowledgment

3. Either case with clear resolution → "complete"

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

OUTPUT FORMAT:
{
  "category": "one of: sales, support, internal, other",
  "topic": "specific subject in 2-5 words",
  "sentiment": "one of: positive, neutral, negative, frustrated",
  "completion_status": "one of: complete, pending_response, needs_followup, abandoned",
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
  const validCategories = ['sales', 'support', 'internal', 'other']
  const validSentiments = ['positive', 'neutral', 'negative', 'frustrated']
  const validCompletionStatuses = ['complete', 'pending_response', 'needs_followup', 'abandoned']

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
