-- Create conversations table to store email thread data
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL, -- Array of email addresses
  snippet TEXT,
  full_content TEXT, -- Full email thread content
  last_message_date TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER DEFAULT 1,
  has_attachments BOOLEAN DEFAULT false,
  labels TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Create conversation_analysis table for LLM results
CREATE TABLE public.conversation_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('sales', 'support', 'internal', 'partnership', 'other')),
  topic TEXT,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative', 'frustrated', 'satisfied')),
  completion_status TEXT NOT NULL CHECK (completion_status IN ('complete', 'pending_response', 'needs_followup', 'abandoned')),
  summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  urgency_score INTEGER CHECK (urgency_score >= 1 AND urgency_score <= 10),
  key_contacts TEXT[],
  suggested_response TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Create user_processing_history table for tracking limits
CREATE TABLE public.user_processing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
  conversations_processed INTEGER DEFAULT 0,
  last_processing_date TIMESTAMP WITH TIME ZONE,
  monthly_limit INTEGER DEFAULT 50, -- Free tier limit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_processing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for conversation_analysis
CREATE POLICY "Users can view analysis of their conversations" 
ON public.conversation_analysis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = conversation_analysis.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert analysis results" 
ON public.conversation_analysis 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE conversations.id = conversation_analysis.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- RLS Policies for user_processing_history
CREATE POLICY "Users can view their own processing history" 
ON public.user_processing_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing history" 
ON public.user_processing_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing history" 
ON public.user_processing_history 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_thread_id ON public.conversations(thread_id);
CREATE INDEX idx_conversations_last_message_date ON public.conversations(last_message_date DESC);
CREATE INDEX idx_conversation_analysis_conversation_id ON public.conversation_analysis(conversation_id);
CREATE INDEX idx_user_processing_history_user_id ON public.user_processing_history(user_id);

-- Create updated_at trigger for conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for user_processing_history
CREATE TRIGGER update_user_processing_history_updated_at
BEFORE UPDATE ON public.user_processing_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize user processing history
CREATE OR REPLACE FUNCTION public.initialize_user_processing_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_processing_history (user_id, subscription_tier, conversations_processed, monthly_limit)
  VALUES (NEW.user_id, 'free', 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize processing history when profile is created
CREATE TRIGGER on_profile_created_init_processing_history
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_processing_history();