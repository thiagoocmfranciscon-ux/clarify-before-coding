ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS requester_name text,
  ADD COLUMN IF NOT EXISTS requester_sector text,
  ADD COLUMN IF NOT EXISTS consultant text,
  ADD COLUMN IF NOT EXISTS contact text,
  ADD COLUMN IF NOT EXISTS fleet_number text,
  ADD COLUMN IF NOT EXISTS equipment_year integer,
  ADD COLUMN IF NOT EXISTS equipment_kind text,
  ADD COLUMN IF NOT EXISTS technician_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS services_amount numeric;

CREATE OR REPLACE FUNCTION public.create_work_order_manual(p jsonb)
RETURNS public.work_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _org uuid := public.my_org(); _cust uuid; _eq uuid; _tech uuid; _wo public.work_orders;
  _cname text := nullif(trim(p->>'customer_name'),''); _serial text := nullif(trim(p->>'serial'),'');
  _hour numeric := nullif(p->>'hour_meter','')::numeric; _eqc uuid;
begin
  if _org is null or not public.has_any_role(_org, array['admin','gestor']::public.app_role[]) then
    raise exception 'sem permissão para abrir OS' using errcode='42501'; end if;
  _cust := nullif(p->>'customer_id','')::uuid;
  if _cust is null then
    if _cname is null or length(_cname) < 2 then raise exception 'informe o cliente' using errcode='22023'; end if;
    select id into _cust from customers where organization_id=_org and lower(legal_name)=lower(_cname) and archived_at is null limit 1;
    if _cust is null then
      insert into customers(organization_id, legal_name, status, created_by) values (_org, _cname, 'ativo', auth.uid()) returning id into _cust;
    end if;
  end if;
  _eq := nullif(p->>'equipment_id','')::uuid;
  if _eq is null then
    if _serial is null then raise exception 'informe o chassi / nº de série' using errcode='22023'; end if;
    select id, customer_id into _eq, _eqc from equipment where organization_id=_org and serial=_serial;
    if _eq is not null and _eqc <> _cust then raise exception 'este nº de série já está cadastrado para outro cliente' using errcode='22023'; end if;
    if _eq is null then
      insert into equipment(organization_id, customer_id, manufacturer, model, type, serial, status, created_by)
      values (_org, _cust, coalesce(nullif(trim(p->>'brand'),''),'—'), coalesce(nullif(trim(p->>'model'),''),'—'),
        coalesce(nullif(trim(p->>'equipment_kind'),''),'Empilhadeira'), _serial, 'operacional', auth.uid()) returning id into _eq;
    end if;
  end if;
  _wo := public.create_work_order(_cust, _eq, (p->>'type')::wo_type, (p->>'priority')::wo_priority, p->>'description',
    nullif(p->>'due_date','')::date, nullif(p->>'technician_id','')::uuid, _hour, nullif(p->>'parent_id','')::uuid);
  update work_orders set requester_name=nullif(trim(p->>'requester_name'),''), requester_sector=nullif(trim(p->>'requester_sector'),''),
    consultant=nullif(trim(p->>'consultant'),''), contact=nullif(trim(p->>'contact'),''), fleet_number=nullif(trim(p->>'fleet_number'),''),
    equipment_year=nullif(p->>'year','')::integer, equipment_kind=nullif(p->>'equipment_kind',''), technician_name=nullif(trim(p->>'technician_name'),''),
    notes=nullif(trim(p->>'notes'),''), items=coalesce(p->'items','[]'::jsonb), services_amount=nullif(p->>'services_amount','')::numeric,
    opened_at=coalesce(nullif(p->>'entry_date','')::date::timestamptz + interval '12 hours', opened_at)
  where id=_wo.id returning * into _wo;
  return _wo;
end $$;
REVOKE ALL ON FUNCTION public.create_work_order_manual(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_work_order_manual(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_equipment(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare _org uuid := public.my_org();
begin
  if _org is null or not public.has_any_role(_org, array['admin','gestor']::public.app_role[]) then
    raise exception 'sem permissão para excluir equipamento' using errcode='42501'; end if;
  if not exists (select 1 from equipment where id=p_id and organization_id=_org) then raise exception 'equipamento não encontrado' using errcode='22023'; end if;
  if exists (select 1 from work_orders where equipment_id=p_id) or exists (select 1 from checklists where equipment_id=p_id) then
    raise exception 'Este equipamento tem histórico; use Arquivar' using errcode='22023'; end if;
  delete from equipment_readings where equipment_id=p_id;
  delete from maintenance_plans where equipment_id=p_id;
  delete from attachments where entity_type='equipment' and entity_id=p_id;
  delete from equipment where id=p_id;
  insert into audit_events(organization_id, actor_id, action, entity, entity_id) values (_org, auth.uid(), 'equipment_deleted', 'equipment', p_id::text);
end $$;
REVOKE ALL ON FUNCTION public.delete_equipment(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_equipment(uuid) TO authenticated;