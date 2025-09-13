-- Clear corrupted Gmail tokens to force fresh authentication
DELETE FROM gmail_tokens WHERE user_id = '57e89dbb-6271-446b-8b6c-8f91320dd932';