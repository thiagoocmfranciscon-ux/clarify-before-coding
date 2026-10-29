ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_key ON public.invitations(token_hash) WHERE token_hash IS NOT NULL;