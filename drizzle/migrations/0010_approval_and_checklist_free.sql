ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_by uuid;
UPDATE public.organization_members SET approved_at = coalesce(created_at, now()) WHERE approved_at IS NULL;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS customer_name text;
UPDATE public.checklist_templates SET needs_validation = false;
GRANT DELETE ON public.checklists TO authenticated;
CREATE POLICY checklists_delete ON public.checklists FOR DELETE TO authenticated
USING (public.has_any_role(organization_id, array['admin','gestor','almoxarife','tecnico']::public.app_role[]));