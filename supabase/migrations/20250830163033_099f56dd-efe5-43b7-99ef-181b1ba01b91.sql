-- Expand allowed categories and completion_status values to match updated AI prompt
ALTER TABLE public.conversation_analysis DROP CONSTRAINT IF EXISTS conversation_analysis_category_check;
ALTER TABLE public.conversation_analysis
  ADD CONSTRAINT conversation_analysis_category_check CHECK (
    category = ANY (ARRAY[
      'sales'::text,
      'support'::text,
      'internal'::text,
      'partnership'::text,
      'other'::text,
      'product'::text,
      'sales/marketing'::text,
      'solicitations'::text
    ])
  );

ALTER TABLE public.conversation_analysis DROP CONSTRAINT IF EXISTS conversation_analysis_completion_status_check;
ALTER TABLE public.conversation_analysis
  ADD CONSTRAINT conversation_analysis_completion_status_check CHECK (
    completion_status = ANY (ARRAY[
      'complete'::text,
      'pending_response'::text,
      'needs_followup'::text,
      'abandoned'::text,
      'need_to_respond'::text
    ])
  );

-- Allow users to update analysis rows for their own conversations (needed for UPSERT)
DROP POLICY IF EXISTS "Users can update analysis of their conversations" ON public.conversation_analysis;
CREATE POLICY "Users can update analysis of their conversations"
ON public.conversation_analysis
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_analysis.conversation_id
      AND conversations.user_id = auth.uid()
  )
);
