ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
ALTER TABLE public.attachments ADD CONSTRAINT attachments_entity_type_check CHECK (entity_type = ANY (ARRAY['work_order','equipment','vehicle','checklist']));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text CHECK (phone IS NULL OR length(phone) <= 20);