DO $m$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.wo_transition(uuid, public.wo_status, integer, text, boolean)'::regprocedure) INTO d;
  d := replace(d, '(select status from work_order_status_events', '(select to_status from work_order_status_events');
  EXECUTE d;
  SELECT pg_get_functiondef('public.tg_audit()'::regprocedure) INTO d;
  d := replace(d, '_org := (_new->>''organization_id'')::uuid;', '_org := coalesce((_new->>''organization_id'')::uuid, case when tg_table_name = ''organizations'' then (_new->>''id'')::uuid end);
  if _org is null then return new; end if;');
  EXECUTE d;
END $m$;

CREATE OR REPLACE FUNCTION public.tg_technician_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare _n bigint; _org uuid := coalesce(new.organization_id, public.my_org());
begin
  if coalesce(trim(new.code),'') <> '' then return new; end if;
  insert into org_counters(organization_id, key, value)
  values (_org, 'tech', greatest(1, (select count(*)+1 from technicians where organization_id = _org)))
  on conflict (organization_id, key) do update set value = org_counters.value + 1 returning value into _n;
  loop
    exit when not exists (select 1 from technicians where organization_id = _org and code = 'TEC-' || lpad(_n::text,3,'0'));
    update org_counters set value = value + 1 where organization_id = _org and key = 'tech' returning value into _n;
  end loop;
  new.code := 'TEC-' || lpad(_n::text, 3, '0');
  return new;
end $$;
DROP TRIGGER IF EXISTS tg_a_code ON public.technicians;
CREATE TRIGGER tg_a_code BEFORE INSERT ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.tg_technician_code();
REVOKE EXECUTE ON FUNCTION public.tg_technician_code() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;