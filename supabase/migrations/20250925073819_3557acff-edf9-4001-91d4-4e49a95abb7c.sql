-- Create table to track all analysis attempts (successful and failed)
CREATE TABLE public.conversation_analysis_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'rate_limited')),
  error_message TEXT,
  error_code TEXT,
  claude_request_id TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE public.conversation_analysis_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis attempts" 
ON public.conversation_analysis_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert analysis attempts" 
ON public.conversation_analysis_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update analysis attempts" 
ON public.conversation_analysis_attempts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_conversation_analysis_attempts_conversation_id ON public.conversation_analysis_attempts(conversation_id);
CREATE INDEX idx_conversation_analysis_attempts_user_id ON public.conversation_analysis_attempts(user_id);
CREATE INDEX idx_conversation_analysis_attempts_status ON public.conversation_analysis_attempts(status);

-- Add updated_at trigger
CREATE TRIGGER update_conversation_analysis_attempts_updated_at
BEFORE UPDATE ON public.conversation_analysis_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();