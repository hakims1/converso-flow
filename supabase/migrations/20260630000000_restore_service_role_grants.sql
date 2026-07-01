-- Fix: the consolidated SOC2 hardening revoked ALL DML from service_role on every
-- public table. Because every edge function runs as service_role, this denied all
-- reads/writes (e.g. gmail-tokens' upsert into gmail_tokens -> "permission denied"
-- -> the "Edge Function returned a non-2xx status code" seen on Gmail connect).
--
-- SOC2 least-privilege applies to anon/authenticated. service_role is the trusted
-- backend identity (BYPASSRLS) and must retain DML. This grants nothing to
-- anon/authenticated, so gmail_tokens and email_contents remain server-side only.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Keep future tables/sequences working without another manual grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
