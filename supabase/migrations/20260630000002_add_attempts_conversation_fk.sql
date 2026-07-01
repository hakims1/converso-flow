-- conversation_analysis_attempts.conversation_id had no foreign key to
-- conversations, so PostgREST could not resolve the embedded join the
-- "Claude Analysis Results" panel uses:
--   conversation_analysis_attempts?select=*,conversation:conversations(...)
-- -> PGRST200 "Could not find a relationship ... in the schema cache"
-- -> the whole fetchAnalyses() throws -> "Failed to fetch analyses".
-- Its sibling conversation_analysis already has this FK; add the matching one.
-- (Verified 0 orphaned rows, so the constraint applies cleanly.)
ALTER TABLE public.conversation_analysis_attempts
  ADD CONSTRAINT conversation_analysis_attempts_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Make the new relationship embeddable immediately.
NOTIFY pgrst, 'reload schema';
