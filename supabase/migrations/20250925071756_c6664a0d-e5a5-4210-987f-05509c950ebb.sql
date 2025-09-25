-- Fix critical security issue: prevent multiple users from connecting same Gmail account

-- First, add a column to store the actual Gmail account email
ALTER TABLE gmail_tokens 
ADD COLUMN gmail_account_email TEXT;

-- Create unique constraint to ensure one Gmail account per user only
-- This prevents multiple users from syncing the same Gmail account
CREATE UNIQUE INDEX idx_gmail_tokens_unique_account 
ON gmail_tokens (gmail_account_email) 
WHERE gmail_account_email IS NOT NULL;

-- Add index for better performance on gmail account lookups
CREATE INDEX idx_gmail_tokens_gmail_account 
ON gmail_tokens (gmail_account_email);

-- Add a function to get the actual Gmail account from the token
CREATE OR REPLACE FUNCTION get_gmail_account_email(user_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gmail_email TEXT;
BEGIN
    -- This will be populated by the Gmail sync function
    -- when it connects to Gmail and gets the actual account email
    SELECT gmail_account_email INTO gmail_email
    FROM gmail_tokens 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN gmail_email;
END;
$$;