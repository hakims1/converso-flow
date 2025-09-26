-- Add last sync timestamp to profiles for tracking incremental syncs
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sync_timestamp timestamp with time zone;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_date 
ON public.conversations(user_id, last_message_date DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_analysis_processed_at 
ON public.conversation_analysis(processed_at DESC);