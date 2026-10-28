-- ============ 003: operações transacionais ============
create or replace function public.tg_business_row() returns trigger
language plpgsql set search_path = public as $$
declare _o jsonb; _n jsonb;
begin
  if tg_op = 'INSERT' then
    new.created_at := now(); new.updated_at := now(); new.created_by := auth.uid(); new.version := 1;
    if new.organization_id is null then new.organization_id := public.my_org(); end if;
    return new;
  end if;
  _o := to_jsonb(old); _n := to_jsonb(new);
  if new.organization_id is distinct from old.organization_id then raise exception 'organization_id é imutável' using errcode = '42501'; end if;
  if new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then raise exception 'autoria é imutável' using errcode = '42501'; end if;
  if (_o->'id') is distinct from (_n->'id') then raise exception 'id é imutável' using errcode = '42501'; end if;
  new.updated_at := now(); new.version := old.version + 1;
  return new;
end $$;

create or replace function public.tg_part_balance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.stock_balances(part_id, organization_id) values (new.id, new.organization_id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.tg_part_balance() from public, anon, authenticated;
create trigger tg_part_balance after insert on public.parts for each row execute function public.tg_part_balance();

-- -------- criar OS --------
create or replace function public.create_work_order(
  p_customer_id uuid, p_equipment_id uuid, p_type public.wo_type, p_priority public.wo_priority,
  p_description text, p_due_date date, p_technician_id uuid, p_hour_meter numeric, p_parent_id uuid default null)
returns public.work_orders
language plpgsql security definer set search_path = public as $$
declare _org uuid := public.my_org(); _n bigint; _wo public.work_orders; _yr text;
begin
  if _org is null or not public.has_any_role(_org, array['admin','gestor']::public.app_role[]) then
    raise exception 'sem permissão para abrir OS' using errcode='42501'; end if;
  if not exists (select 1 from customers where id = p_customer_id and organization_id = _org and archived_at is null and status = 'ativo') then
    raise exception 'cliente inválido ou arquivado' using errcode='22023'; end if;
  if not exists (select 1 from equipment where id = p_equipment_id and customer_id = p_customer_id and organization_id = _org and archived_at is null) then
    raise exception 'equipamento não pertence ao cliente ou está arquivado' using errcode='22023'; end if;
  if p_technician_id is not null and not exists (select 1 from technicians where id = p_technician_id and organization_id = _org and archived_at is null and status <> 'inativo') then
    raise exception 'técnico inválido ou inativo' using errcode='22023'; end if;
  if p_parent_id is not null and not exists (select 1 from work_orders where id = p_parent_id and organization_id = _org) then
    raise exception 'OS de origem inválida' using errcode='22023'; end if;
  if coalesce(length(trim(p_description)),0) < 3 then raise exception 'descreva o relato (mínimo 3 caracteres)' using errcode='22023'; end if;
  _yr := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY');
  insert into org_counters(organization_id, key, value) values (_org, 'wo_' || _yr, 1)
  on conflict (organization_id, key) do update set value = org_counters.value + 1 returning value into _n;
  insert into work_orders(organization_id, number, customer_id, equipment_id, type, priority, description, due_date, hour_meter_reading, parent_work_order_id, created_by)
  values (_org, 'OS-' || _yr || '-' || lpad(_n::text, 5, '0'), p_customer_id, p_equipment_id, p_type, p_priority, trim(p_description), p_due_date, p_hour_meter, p_parent_id, auth.uid())
  returning * into _wo;
  insert into work_order_status_events(organization_id, work_order_id, from_status, to_status, actor_id, reason)
  values (_org, _wo.id, null, 'aberta', auth.uid(), case when p_parent_id is not null then 'retrabalho de OS anterior' end);
  if p_technician_id is not null then
    insert into work_order_assignments(organization_id, work_order_id, technician_id, is_primary, assigned_by)
    values (_org, _wo.id, p_technician_id, true, auth.uid());
  end if;
  if p_hour_meter is not null then
    insert into equipment_readings(organization_id, equipment_id, value, work_order_id, created_by)
    values (_org, p_equipment_id, p_hour_meter, _wo.id, auth.uid());
  end if;
  return _wo;
end $$;

-- -------- atribuição --------
create or replace function public.wo_assign(p_wo uuid, p_technician_id uuid, p_primary boolean, p_remove boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare _wo work_orders;
begin
  select * into _wo from work_orders where id = p_wo for update;
  if not found or not public.has_any_role(_wo.organization_id, array['admin','gestor']::public.app_role[]) then
    raise exception 'sem permissão' using errcode='42501'; end if;
  if _wo.status in ('encerrada','cancelada') then raise exception 'OS % finalizada', _wo.number using errcode='22023'; end if;
  if p_remove then
    update work_order_assignments set unassigned_at = now() where work_order_id = p_wo and technician_id = p_technician_id and unassigned_at is null;
    return;
  end if;
  if not exists (select 1 from technicians where id = p_technician_id and organization_id = _wo.organization_id and archived_at is null and status <> 'inativo') then
    raise exception 'técnico inválido ou inativo' using errcode='22023'; end if;
  if p_primary then
    update work_order_assignments set is_primary = false where work_order_id = p_wo and unassigned_at is null and is_primary;
  end if;
  insert into work_order_assignments(organization_id, work_order_id, technician_id, is_primary, assigned_by)
  values (_wo.organization_id, p_wo, p_technician_id, p_primary, auth.uid())
  on conflict (work_order_id, technician_id) where unassigned_at is null do update set is_primary = excluded.is_primary;
end $$;

-- -------- estoque atômico --------
create or replace function public.stock_move(
  p_part_id uuid, p_type public.stock_mov_type, p_qty numeric, p_unit_cost numeric, p_reason text,
  p_work_order_id uuid, p_supplier_id uuid, p_document_ref text, p_idempotency_key text,
  p_reversed_movement_id uuid default null, p_part_request_id uuid default null)
returns public.stock_movements
language plpgsql security definer set search_path = public as $$
declare
  _org uuid := public.my_org(); _part parts; _unit units; _bal stock_balances; _mv stock_movements; _orig stock_movements;
  _cost numeric; _newq numeric; _newavg numeric; _remaining numeric; _wo work_orders; _req part_requests;
begin
  if _org is null then raise exception 'sem associação ativa' using errcode='42501'; end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then raise exception 'chave de idempotência obrigatória' using errcode='22023'; end if;
  select * into _mv from stock_movements where organization_id = _org and idempotency_key = p_idempotency_key;
  if found then return _mv; end if;
  if not public.has_any_role(_org, array['admin','gestor','almoxarife']::public.app_role[]) then
    raise exception 'sem permissão para movimentar estoque' using errcode='42501'; end if;
  if p_qty is null or p_qty <= 0 then raise exception 'quantidade deve ser positiva' using errcode='22023'; end if;
  select * into _part from parts where id = p_part_id and organization_id = _org;
  if not found then raise exception 'peça não encontrada' using errcode='22023'; end if;
  if _part.archived_at is not null and p_type <> 'estorno' then raise exception 'peça % arquivada', _part.code using errcode='22023'; end if;
  select * into _unit from units where id = _part.unit_id;
  if not _unit.allows_fraction and p_qty <> trunc(p_qty) then raise exception 'a unidade % não aceita fração', _unit.code using errcode='22023'; end if;

  insert into stock_balances(part_id, organization_id) values (_part.id, _org) on conflict do nothing;
  select * into _bal from stock_balances where part_id = _part.id for update;

  if p_type in ('saida','ajuste_saida','ajuste_entrada') and coalesce(trim(p_reason),'') = '' then
    raise exception 'motivo obrigatório' using errcode='22023'; end if;
  if p_type in ('ajuste_entrada','ajuste_saida') and not public.has_any_role(_org, array['admin','gestor','almoxarife']::public.app_role[]) then
    raise exception 'sem permissão para ajuste' using errcode='42501'; end if;

  if p_work_order_id is not null then
    select * into _wo from work_orders where id = p_work_order_id and organization_id = _org;
    if not found then raise exception 'OS inválida' using errcode='22023'; end if;
    if p_type = 'saida' and _wo.status in ('encerrada','cancelada','concluida_tecnicamente','aberta') then
      raise exception 'OS % (%) não aceita consumo', _wo.number, _wo.status using errcode='22023'; end if;
  end if;

  if p_type = 'abertura' then
    if exists (select 1 from stock_movements where part_id = _part.id) then raise exception 'saldo inicial já registrado' using errcode='22023'; end if;
    if p_unit_cost is null or p_unit_cost < 0 then raise exception 'custo unitário obrigatório' using errcode='22023'; end if;
    _cost := p_unit_cost; _newq := p_qty; _newavg := p_unit_cost;
  elsif p_type = 'entrada' then
    if p_unit_cost is null or p_unit_cost < 0 then raise exception 'custo de aquisição obrigatório' using errcode='22023'; end if;
    _cost := p_unit_cost; _newq := _bal.qty + p_qty;
    _newavg := round((_bal.qty * _bal.avg_cost + p_qty * p_unit_cost) / _newq, 4);
  elsif p_type = 'ajuste_entrada' then
    _cost := case when _bal.avg_cost > 0 then _bal.avg_cost else coalesce(_bal.last_cost, coalesce(p_unit_cost,0)) end;
    _newq := _bal.qty + p_qty; _newavg := round((_bal.qty * _bal.avg_cost + p_qty * _cost) / _newq, 4);
  elsif p_type in ('saida','ajuste_saida') then
    if p_type = 'saida' and p_work_order_id is null and coalesce(trim(p_reason),'') = '' then raise exception 'saída exige OS ou motivo' using errcode='22023'; end if;
    if p_qty > _bal.qty then raise exception 'saldo insuficiente para %: disponível %, solicitado %', _part.code, _bal.qty, p_qty using errcode='P0001'; end if;
    _cost := _bal.avg_cost; _newq := _bal.qty - p_qty; _newavg := _bal.avg_cost;
  elsif p_type = 'estorno' then
    select * into _orig from stock_movements where id = p_reversed_movement_id and organization_id = _org and part_id = _part.id;
    if not found or _orig.type = 'estorno' then raise exception 'movimento original inválido' using errcode='22023'; end if;
    select _orig.qty - coalesce(sum(qty),0) into _remaining from stock_movements where reversed_movement_id = _orig.id;
    if p_qty > _remaining then raise exception 'estorno acima do restante (%)', _remaining using errcode='22023'; end if;
    _cost := _orig.unit_cost;
    if _orig.type in ('saida','ajuste_saida') then
      _newq := _bal.qty + p_qty; _newavg := round((_bal.qty * _bal.avg_cost + p_qty * _cost) / _newq, 4);
    else
      if p_qty > _bal.qty then raise exception 'estorno deixaria o estoque negativo; trate operacionalmente' using errcode='P0001'; end if;
      _newq := _bal.qty - p_qty;
      _newavg := case when _newq = 0 then _bal.avg_cost else greatest(round((_bal.qty * _bal.avg_cost - p_qty * _cost) / _newq, 4), 0) end;
    end if;
    p_work_order_id := coalesce(p_work_order_id, _orig.work_order_id);
  end if;

  if p_part_request_id is not null then
    select * into _req from part_requests where id = p_part_request_id and organization_id = _org for update;
    if not found or _req.status <> 'pendente' or _req.part_id <> _part.id then raise exception 'solicitação inválida' using errcode='22023'; end if;
  end if;

  insert into stock_movements(organization_id, part_id, type, qty, unit_cost, total_cost, balance_after, avg_cost_after, reason,
    work_order_id, supplier_id, document_ref, reversed_movement_id, part_request_id, idempotency_key, created_by)
  values (_org, _part.id, p_type, p_qty, _cost, round(p_qty * _cost, 4), _newq, _newavg, nullif(trim(p_reason),''),
    p_work_order_id, p_supplier_id, nullif(trim(p_document_ref),''), p_reversed_movement_id, p_part_request_id, p_idempotency_key, auth.uid())
  returning * into _mv;
  update stock_balances set qty = _newq, avg_cost = _newavg, last_cost = _cost, updated_at = now() where part_id = _part.id;
  if p_part_request_id is not null then
    update part_requests set status = 'atendida', resolved_by = auth.uid(), resolved_at = now(), movement_id = _mv.id where id = p_part_request_id;
  end if;
  return _mv;
end $$;

create or replace function public.reject_part_request(p_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare _r part_requests;
begin
  select * into _r from part_requests where id = p_id for update;
  if not found or not public.has_any_role(_r.organization_id, array['admin','gestor','almoxarife']::public.app_role[]) then raise exception 'sem permissão' using errcode='42501'; end if;
  if _r.status <> 'pendente' then raise exception 'solicitação já resolvida' using errcode='22023'; end if;
  update part_requests set status = 'recusada', resolved_by = auth.uid(), resolved_at = now(), note = coalesce(nullif(trim(p_note),''), note) where id = p_id;
end $$;

-- -------- máquina de estados --------
create or replace function public.wo_allowed_next(p_from public.wo_status) returns public.wo_status[]
language sql immutable as $$
  select case p_from
    when 'aberta' then array['em_diagnostico','cancelada']::public.wo_status[]
    when 'em_diagnostico' then array['aguardando_peca','em_andamento','cancelada']::public.wo_status[]
    when 'aguardando_peca' then array['em_andamento','em_diagnostico','cancelada']::public.wo_status[]
    when 'em_andamento' then array['aguardando_peca','concluida_tecnicamente','cancelada']::public.wo_status[]
    when 'concluida_tecnicamente' then array['encerrada','em_andamento']::public.wo_status[]
    else array[]::public.wo_status[] end
$$;

create or replace function public.wo_transition(p_wo uuid, p_to public.wo_status, p_expected_version int, p_reason text, p_return_parts boolean default null)
returns public.work_orders
language plpgsql security definer set search_path = public as $$
declare _wo work_orders; _is_mgr boolean; _mv record; _net numeric; _k int := 0;
begin
  select * into _wo from work_orders where id = p_wo for update;
  if not found or not public.can_view_wo(p_wo) then raise exception 'OS não encontrada' using errcode='42501'; end if;
  _is_mgr := public.has_any_role(_wo.organization_id, array['admin','gestor']::public.app_role[]);
  if not _is_mgr and not (public.has_any_role(_wo.organization_id, array['tecnico']::public.app_role[]) and public.is_assigned(p_wo)) then
    raise exception 'sem permissão para alterar status' using errcode='42501'; end if;
  if p_expected_version is not null and _wo.version <> p_expected_version then
    raise exception 'A OS % foi alterada por outra pessoa. Recarregue para conferir.', _wo.number using errcode='40001'; end if;
  if not (p_to = any(public.wo_allowed_next(_wo.status))) then
    raise exception 'transição % → % não permitida', _wo.status, p_to using errcode='22023'; end if;
  if p_to in ('encerrada','cancelada') and not _is_mgr then raise exception 'somente gestor/admin pode % a OS', case when p_to='encerrada' then 'encerrar' else 'cancelar' end using errcode='42501'; end if;
  if _wo.status = 'concluida_tecnicamente' and p_to = 'em_andamento' then
    if not _is_mgr then raise exception 'retrabalho exige gestor/admin' using errcode='42501'; end if;
    if coalesce(trim(p_reason),'') = '' then raise exception 'justificativa de retrabalho obrigatória' using errcode='22023'; end if;
  end if;
  if p_to = 'cancelada' and coalesce(trim(p_reason),'') = '' then raise exception 'motivo de cancelamento obrigatório' using errcode='22023'; end if;
  if p_to = 'concluida_tecnicamente' then
    if coalesce(trim(_wo.diagnosis),'') = '' then raise exception 'diagnóstico obrigatório para concluir' using errcode='22023'; end if;
    if coalesce(trim(_wo.solution),'') = '' then raise exception 'descrição da solução obrigatória' using errcode='22023'; end if;
    if not exists (select 1 from work_order_assignments where work_order_id = p_wo and unassigned_at is null and is_primary) then
      raise exception 'defina o técnico responsável (principal)' using errcode='22023'; end if;
    if exists (select 1 from jsonb_each(_wo.checklist) e where e.value <> 'true'::jsonb) then
      raise exception 'checklist de execução incompleto' using errcode='22023'; end if;
    if exists (select 1 from part_requests where work_order_id = p_wo and status = 'pendente') then
      raise exception 'há solicitações de peça pendentes' using errcode='22023'; end if;
  end if;
  if p_to = 'cancelada' then
    select coalesce(sum(case when m.type='saida' then m.qty else 0 end),0) - coalesce((select sum(e.qty) from stock_movements e join stock_movements o on o.id = e.reversed_movement_id where o.work_order_id = p_wo and o.type='saida' and e.type='estorno'),0)
      into _net from stock_movements m where m.work_order_id = p_wo;
    if _net > 0 and p_return_parts is null then
      raise exception 'Há peças consumidas nesta OS. Informe se houve devolução física ao estoque.' using errcode='P0002'; end if;
    if _net > 0 and p_return_parts then
      for _mv in select o.id, o.part_id, o.qty - coalesce((select sum(e.qty) from stock_movements e where e.reversed_movement_id = o.id),0) as rem
                 from stock_movements o where o.work_order_id = p_wo and o.type = 'saida' loop
        if _mv.rem > 0 then
          _k := _k + 1;
          perform public.stock_move(_mv.part_id, 'estorno', _mv.rem, null, 'Devolução por cancelamento da OS ' || _wo.number, p_wo, null, null,
            'cancel-' || p_wo::text || '-' || _mv.id::text, _mv.id, null);
        end if;
      end loop;
    end if;
    update part_requests set status = 'recusada', resolved_by = auth.uid(), resolved_at = now(), note = 'OS cancelada' where work_order_id = p_wo and status = 'pendente';
  end if;

  perform set_config('app.rpc','on', true);
  update work_orders set status = p_to,
    diagnosis_started_at = case when p_to = 'em_diagnostico' and diagnosis_started_at is null then now() else diagnosis_started_at end,
    execution_started_at = case when p_to = 'em_andamento' and execution_started_at is null then now() else execution_started_at end,
    tech_completed_at = case when p_to = 'concluida_tecnicamente' then now() when p_to = 'em_andamento' and _wo.status = 'concluida_tecnicamente' then null else tech_completed_at end,
    closed_at = case when p_to = 'encerrada' then now() else closed_at end,
    closed_by = case when p_to = 'encerrada' then auth.uid() else closed_by end,
    canceled_at = case when p_to = 'cancelada' then now() else canceled_at end,
    cancel_reason = case when p_to = 'cancelada' then trim(p_reason) else cancel_reason end
  where id = p_wo returning * into _wo;
  perform set_config('app.rpc','off', true);
  insert into work_order_status_events(organization_id, work_order_id, from_status, to_status, reason, actor_id)
  values (_wo.organization_id, p_wo, (select status from work_order_status_events where work_order_id = p_wo order by created_at desc limit 1), p_to, nullif(trim(coalesce(p_reason,'')),''), auth.uid());
  if p_to = 'encerrada' then
    update maintenance_plans mp set last_done_date = (now() at time zone 'America/Sao_Paulo')::date,
      last_done_hours = coalesce(_wo.hour_meter_reading, mp.last_done_hours), last_work_order_id = _wo.id
    where mp.equipment_id = _wo.equipment_id and mp.archived_at is null and _wo.type = 'preventiva';
  end if;
  return _wo;
end $$;

-- -------- custos de OS (somente admin/gestor/leitura) --------
create or replace function public.wo_costs(p_wo uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare _org uuid; _parts numeric; _labor numeric; _exp numeric; _min int;
begin
  select organization_id into _org from work_orders where id = p_wo;
  if _org is null or not public.has_any_role(_org, array['admin','gestor','leitura']::public.app_role[]) then return null; end if;
  select coalesce(sum(case when m.type='saida' then m.total_cost when m.type='estorno' and o.type='saida' then -m.total_cost else 0 end),0)
    into _parts from stock_movements m left join stock_movements o on o.id = m.reversed_movement_id where m.work_order_id = p_wo;
  select coalesce(sum(c.cost),0), coalesce(sum(l.duration_minutes),0) into _labor, _min from work_logs l left join work_log_costs c on c.work_log_id = l.id where l.work_order_id = p_wo;
  select coalesce(sum(amount),0) into _exp from work_order_expenses where work_order_id = p_wo;
  return jsonb_build_object('parts', round(_parts,2), 'labor', round(_labor,2), 'expenses', round(_exp,2), 'minutes', _min, 'total', round(_parts,2) + round(_labor,2) + round(_exp,2));
end $$;

-- -------- dashboard --------
create or replace function public.dashboard_kpis(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare _org uuid := public.my_org(); _today date := (now() at time zone 'America/Sao_Paulo')::date; _r jsonb; _mgr boolean; _vis boolean;
begin
  if _org is null then raise exception 'sem associação' using errcode='42501'; end if;
  _mgr := public.has_any_role(_org, array['admin','gestor','leitura']::public.app_role[]);
  _vis := public.has_any_role(_org, array['admin','gestor','almoxarife','leitura']::public.app_role[]);
  with wo as (select * from work_orders w where w.organization_id = _org and (_vis or public.is_assigned(w.id)))
  select jsonb_build_object(
    'open_wo', (select count(*) from wo where status not in ('encerrada','cancelada')),
    'late_wo', (select count(*) from wo where status not in ('encerrada','cancelada') and due_date < _today),
    'tech_in_service', (select count(*) from technicians where organization_id = _org and archived_at is null and status = 'em_servico'),
    'tech_active', (select count(*) from technicians where organization_id = _org and archived_at is null and status <> 'inativo'),
    'veh_in_use', case when _vis then (select count(*) from vehicles where organization_id = _org and archived_at is null and status = 'em_uso') end,
    'veh_available', case when _vis then (select count(*) from vehicles where organization_id = _org and archived_at is null and status = 'disponivel') end,
    'veh_maintenance', case when _vis then (select count(*) from vehicles where organization_id = _org and archived_at is null and status = 'em_manutencao') end,
    'parts_alert', case when _vis then (select count(*) from parts p join stock_balances b on b.part_id = p.id where p.organization_id = _org and p.archived_at is null and (b.qty = 0 or b.qty <= p.min_qty)) end,
    'parts_zero', case when _vis then (select count(*) from parts p join stock_balances b on b.part_id = p.id where p.organization_id = _org and p.archived_at is null and b.qty = 0) end,
    'status_dist', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from (select status, count(*) c from wo group by status) s),
    'costs', case when _mgr then (
      select jsonb_build_object(
        'parts', coalesce((select sum(case when m.type='saida' then m.total_cost else -m.total_cost end) from stock_movements m left join stock_movements o on o.id = m.reversed_movement_id
                 where m.organization_id = _org and m.work_order_id is not null and (m.type='saida' or (m.type='estorno' and o.type='saida'))
                 and (m.created_at at time zone 'America/Sao_Paulo')::date between p_from and p_to),0),
        'labor', coalesce((select sum(c.cost) from work_logs l join work_log_costs c on c.work_log_id = l.id where l.organization_id = _org and (l.started_at at time zone 'America/Sao_Paulo')::date between p_from and p_to),0),
        'expenses', coalesce((select sum(amount) from work_order_expenses where organization_id = _org and expense_date between p_from and p_to),0),
        'fleet', coalesce((select sum(amount) from vehicle_expenses where organization_id = _org and expense_date between p_from and p_to),0))) end,
    'monthly', (select coalesce(jsonb_agg(x order by x->>'month'), '[]'::jsonb) from (
      select jsonb_build_object('month', to_char(mm, 'YYYY-MM'),
        'closed', (select count(*) from wo where status = 'encerrada' and date_trunc('month', closed_at at time zone 'America/Sao_Paulo') = mm),
        'cost', case when _mgr then
          coalesce((select sum(case when m.type='saida' then m.total_cost else -m.total_cost end) from stock_movements m left join stock_movements o on o.id = m.reversed_movement_id where m.organization_id = _org and m.work_order_id is not null and (m.type='saida' or (m.type='estorno' and o.type='saida')) and date_trunc('month', m.created_at at time zone 'America/Sao_Paulo') = mm),0)
          + coalesce((select sum(c.cost) from work_logs l join work_log_costs c on c.work_log_id = l.id where l.organization_id = _org and date_trunc('month', l.started_at at time zone 'America/Sao_Paulo') = mm),0)
          + coalesce((select sum(amount) from work_order_expenses where organization_id = _org and date_trunc('month', expense_date::timestamp) = mm),0) end) x
      from generate_series(date_trunc('month', p_from::timestamp), date_trunc('month', p_to::timestamp), interval '1 month') mm) q),
    'generated_at', now()) into _r;
  return _r;
end $$;

-- -------- busca global --------
create or replace function public.global_search(p_q text) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare _q text := '%' || replace(replace(replace(trim(coalesce(p_q,'')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  if length(trim(coalesce(p_q,''))) < 2 then return '{}'::jsonb; end if;
  return jsonb_build_object(
    'work_orders', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', number, 'sub', left(description, 80))), '[]') from (select id, number, description from work_orders where number ilike _q or description ilike _q order by opened_at desc limit 8) a),
    'customers', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', legal_name, 'sub', city)), '[]') from (select id, legal_name, city from customers where legal_name ilike _q or trade_name ilike _q limit 8) b),
    'equipment', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', serial, 'sub', manufacturer || ' ' || model)), '[]') from (select id, serial, manufacturer, model from equipment where serial ilike _q or model ilike _q limit 8) c),
    'vehicles', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', plate, 'sub', model)), '[]') from (select id, plate, model from vehicles where plate ilike upper(replace(_q,'-','')) or model ilike _q limit 8) d),
    'technicians', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', name, 'sub', code)), '[]') from (select id, name, code from technicians where name ilike _q or code ilike _q limit 8) e));
end $$;

-- -------- auditoria de exportação --------
create or replace function public.log_export(p_kind text, p_params jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare _org uuid := public.my_org();
begin
  if not public.has_any_role(_org, array['admin','gestor']::public.app_role[]) then raise exception 'exportação restrita a admin/gestor' using errcode='42501'; end if;
  insert into audit_events(organization_id, actor_id, action, entity, entity_id, changes) values (_org, auth.uid(), 'export', 'report', left(p_kind, 60), p_params);
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'create_work_order(uuid,uuid,public.wo_type,public.wo_priority,text,date,uuid,numeric,uuid)',
    'wo_assign(uuid,uuid,boolean,boolean)',
    'stock_move(uuid,public.stock_mov_type,numeric,numeric,text,uuid,uuid,text,text,uuid,uuid)',
    'reject_part_request(uuid,text)',
    'wo_transition(uuid,public.wo_status,int,text,boolean)',
    'wo_costs(uuid)', 'dashboard_kpis(date,date)', 'global_search(text)', 'log_export(text,jsonb)', 'wo_allowed_next(public.wo_status)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.tg_business_row(), public.tg_work_order_guard(), public.tg_equipment_reading(), public.tg_work_log_cost() from public, anon, authenticated;