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

  return `You are an assistant that analyzes email conversations and returns STRICT JSON only. No prose. 
Return a JSON object with keys exactly as follows:
{
  "sentiment": "positive|neutral|negative",
  "category": "Sales|Support|Internal|Other",
  "topic": "string or null",
  "summary": "1-2 sentence concise summary",
  "completion_status": "complete|needs_follow_up|awaiting_response",
  "action_items": [{"text": "string", "owner": "me|other|unknown", "due": "ISO date or null"}],
  "key_contacts": ["emails or names"],
  "urgency_score": 0-100,
  "suggested_response": "string or null"
}

Context:
Subject: ${subject}
Participants: ${participants}
Message Count: ${msgCount}
Content:
${content}
`
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
  const toJSON = (v: any) => (v && typeof v === 'object' ? v : [])

  return {
    conversation_id,
    sentiment: toText(p.sentiment) || 'neutral',
    category: toText(p.category) || 'Other',
    topic: toText(p.topic) || null,
    summary: toText(p.summary) || null,
    completion_status: toText(p.completion_status) || 'needs_follow_up',
    action_items: Array.isArray(p.action_items) ? p.action_items : [],
    key_contacts: toArray(p.key_contacts) || [],
    urgency_score: toInt(p.urgency_score) ?? null,
    suggested_response: toText(p.suggested_response) || null,
  }
}
