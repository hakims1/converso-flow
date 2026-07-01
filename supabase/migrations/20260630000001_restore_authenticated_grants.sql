-- Fix: the consolidated SOC2 hardening also stripped DML from the `authenticated`
-- role on every table, leaving the per-user RLS policies dangling (an RLS policy
-- grants nothing without the underlying table privilege). gmail-sync writes
-- `conversations` through the user-context (authenticated) client, so every insert
-- was denied -> 200 threads fetched, 0 processed, dashboard shows only mock data.
--
-- Restore standard authenticated DML on user-facing tables. RLS is enabled with
-- auth.uid() = user_id policies on all of them, so rows stay scoped per user.
-- gmail_tokens and email_contents are intentionally EXCLUDED so they remain
-- server-side only (service_role can reach them; authenticated/anon cannot).
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.conversations,
  public.conversation_analysis,
  public.conversation_analysis_attempts,
  public.contact_avatars,
  public.profiles,
  public.user_processing_history
TO authenticated;

-- Audit trail: users may read their own entries, but never write/alter them
-- (writes happen server-side via service_role).
GRANT SELECT ON public.data_access_logs TO authenticated;
