-- Fix: store a separate IV for the access token so refreshing it no longer
-- corrupts the refresh token's IV (root cause of hourly Gmail re-auth).
ALTER TABLE public.gmail_tokens
  ADD COLUMN IF NOT EXISTS access_token_iv TEXT;

-- Any tokens encrypted under the old shared-IV scheme are ambiguous; clearing
-- them forces a clean re-auth that writes both IVs correctly. Safe: refresh
-- tokens are re-obtainable via the OAuth consent flow.
DELETE FROM public.gmail_tokens;
