-- Create email_contents table for encrypted email bodies
CREATE TABLE public.email_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  encrypted_body TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE(conversation_id)
);

-- Enable RLS
ALTER TABLE public.email_contents ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_contents
CREATE POLICY "Users can view their own email contents" 
ON public.email_contents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = email_contents.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "System can insert email contents" 
ON public.email_contents 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = email_contents.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "System can update email contents" 
ON public.email_contents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = email_contents.conversation_id 
  AND conversations.user_id = auth.uid()
));

CREATE POLICY "System can delete email contents" 
ON public.email_contents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM conversations 
  WHERE conversations.id = email_contents.conversation_id 
  AND conversations.user_id = auth.uid()
));

-- Create data_access_logs table for audit logging
CREATE TABLE public.data_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'ingest', 'analyze', 'purge', 'access'
  resource_type TEXT NOT NULL, -- 'conversation', 'email_content', 'analysis'
  resource_count INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for data_access_logs  
CREATE POLICY "Users can view their own access logs" 
ON public.data_access_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert access logs" 
ON public.data_access_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add retention settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_retention_days INTEGER DEFAULT 30,
ADD COLUMN auto_purge_enabled BOOLEAN DEFAULT true;

-- Create index for efficient cleanup queries
CREATE INDEX idx_email_contents_expires_at ON public.email_contents(expires_at);
CREATE INDEX idx_data_access_logs_created_at ON public.data_access_logs(created_at);

-- Remove full_content column from conversations (migrate to encrypted storage)
ALTER TABLE public.conversations DROP COLUMN IF EXISTS full_content;