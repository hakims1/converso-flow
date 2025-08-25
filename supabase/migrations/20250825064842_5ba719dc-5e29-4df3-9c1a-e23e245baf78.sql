-- Add unique constraint for upsert on conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'conversations_user_thread_unique'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_user_thread_unique UNIQUE (user_id, thread_id);
  END IF;
END $$;

-- Helpful index for fetching latest conversations per user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_conversations_user_last_date'
  ) THEN
    CREATE INDEX idx_conversations_user_last_date
    ON public.conversations (user_id, last_message_date DESC);
  END IF;
END $$;