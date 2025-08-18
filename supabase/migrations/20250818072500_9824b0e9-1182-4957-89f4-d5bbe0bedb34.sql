-- Phase 2 prep: indexes for efficient upserts and queries
-- 1) Ensure unique thread per user for conversations
CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_thread_uidx
  ON public.conversations (user_id, thread_id);

-- 2) Helpful index for sorting/filtering by recency per user
CREATE INDEX IF NOT EXISTS conversations_user_last_message_date_idx
  ON public.conversations (user_id, last_message_date DESC);

-- 3) Ensure single processing history row per user (needed for clean updates)
ALTER TABLE public.user_processing_history
  ADD CONSTRAINT user_processing_history_user_id_key UNIQUE (user_id);
