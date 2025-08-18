-- Fix security linter: set immutable search_path on functions

-- 1) Update update_updated_at_column with fixed search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) Update initialize_user_processing_history with fixed search_path
CREATE OR REPLACE FUNCTION public.initialize_user_processing_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_processing_history (user_id, subscription_tier, conversations_processed, monthly_limit)
  VALUES (NEW.user_id, 'free', 0, 50)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;