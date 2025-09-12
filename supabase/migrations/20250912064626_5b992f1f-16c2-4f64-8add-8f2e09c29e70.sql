-- Create contact_avatars table for caching contact images
CREATE TABLE public.contact_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + '24 hours'::interval),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.contact_avatars ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own contact avatars" 
ON public.contact_avatars 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact avatars" 
ON public.contact_avatars 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact avatars" 
ON public.contact_avatars 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact avatars" 
ON public.contact_avatars 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_contact_avatars_updated_at
BEFORE UPDATE ON public.contact_avatars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();