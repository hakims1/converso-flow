import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactAvatar {
  email: string;
  avatar_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { emails } = await req.json()
    if (!emails || !Array.isArray(emails)) {
      return new Response(
        JSON.stringify({ error: 'Invalid emails parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching avatars for ${emails.length} emails for user ${user.id}`)

    // Check for cached avatars that are still valid
    const { data: cachedAvatars } = await supabase
      .from('contact_avatars')
      .select('email, avatar_url')
      .eq('user_id', user.id)
      .in('email', emails)
      .gt('expires_at', new Date().toISOString())

    const cachedEmails = new Set(cachedAvatars?.map(a => a.email) || [])
    const emailsToFetch = emails.filter(email => !cachedEmails.has(email))

    let newAvatars: ContactAvatar[] = []

    // Fetch new avatars from Google People API if needed
    if (emailsToFetch.length > 0) {
      // Get Gmail tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('gmail_tokens')
        .select('encrypted_access_token, encryption_iv')
        .eq('user_id', user.id)
        .single()

      if (tokenError || !tokenData) {
        console.error('Token error:', tokenError)
        return new Response(
          JSON.stringify({ error: 'Gmail tokens not found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Decrypt access token
      const masterKey = Deno.env.get('MASTER_ENCRYPTION_KEY')!
      const keyBuffer = new Uint8Array(32)
      keyBuffer.set(new TextEncoder().encode(masterKey).slice(0, 32))
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      )

      const encryptedData = Uint8Array.from(atob(tokenData.encrypted_access_token), c => c.charCodeAt(0))
      const iv = Uint8Array.from(atob(tokenData.encryption_iv), c => c.charCodeAt(0))
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encryptedData
      )
      
      const accessToken = new TextDecoder().decode(decryptedData)

      // Fetch contact data from Google People API
      for (const email of emailsToFetch) {
        try {
          const response = await fetch(
            `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(email)}&readMask=photos`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            let avatarUrl = null

            if (data.results && data.results.length > 0) {
              const contact = data.results[0].person
              if (contact.photos && contact.photos.length > 0) {
                avatarUrl = contact.photos[0].url
              }
            }

            newAvatars.push({ email, avatar_url: avatarUrl })
          } else {
            console.log(`No contact found for ${email}`)
            newAvatars.push({ email, avatar_url: null })
          }
        } catch (error) {
          console.error(`Error fetching avatar for ${email}:`, error)
          newAvatars.push({ email, avatar_url: null })
        }
      }

      // Cache the new avatars
      if (newAvatars.length > 0) {
        const avatarsToInsert = newAvatars.map(avatar => ({
          user_id: user.id,
          email: avatar.email,
          avatar_url: avatar.avatar_url,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }))

        await supabase
          .from('contact_avatars')
          .upsert(avatarsToInsert, {
            onConflict: 'user_id, email'
          })
      }
    }

    // Combine cached and new avatars
    const allAvatars = [
      ...(cachedAvatars || []),
      ...newAvatars
    ]

    console.log(`Returning ${allAvatars.length} avatars`)

    return new Response(
      JSON.stringify({ avatars: allAvatars }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in fetch-contact-avatars:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})