-- ============ 002: cadastros e operação ============
create type public.wo_status as enum ('aberta','em_diagnostico','aguardando_peca','em_andamento','concluida_tecnicamente','encerrada','cancelada');
create type public.wo_type as enum ('preventiva','corretiva','reforma_geral');
create type public.wo_priority as enum ('baixa','media','alta','critica');
create type public.stock_mov_type as enum ('abertura','entrada','saida','ajuste_entrada','ajuste_saida','estorno');

-- colunas padrão: organization_id, created_at, updated_at, created_by, version, archived_at, archived_by
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  legal_name text not null check (length(trim(legal_name)) between 2 and 160),
  trade_name text check (trade_name is null or length(trade_name) <= 160),
  segment text check (segment is null or length(segment) <= 80),
  document text check (document is null or document ~ '^[0-9]{11}$|^[0-9]{14}$'),
  city text check (city is null or length(city) <= 100),
  uf char(2) check (uf is null or uf ~ '^[A-Z]{2}$'),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  notes text check (notes is null or length(notes) <= 2000),
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (id, organization_id)
);
create unique index customers_doc_uq on public.customers(organization_id, document) where document is not null;

create table public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  customer_id uuid not null,
  name text not null check (length(trim(name)) between 2 and 120),
  role text check (role is null or length(role) <= 80),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  foreign key (customer_id, organization_id) references public.customers(id, organization_id)
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  customer_id uuid not null,
  manufacturer text not null check (length(trim(manufacturer)) between 1 and 80),
  model text not null check (length(trim(model)) between 1 and 80),
  type text not null check (length(trim(type)) between 1 and 60),
  serial text not null check (length(trim(serial)) between 1 and 60),
  status text not null default 'operacional' check (status in ('operacional','em_manutencao','parado','inativo')),
  hour_meter numeric(12,1) check (hour_meter is null or hour_meter >= 0),
  hour_meter_at timestamptz,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (organization_id, serial),
  unique (id, organization_id),
  unique (id, customer_id, organization_id),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id)
);

create table public.technicians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  code text not null check (code ~ '^[A-Za-z0-9-]{1,20}$'),
  name text not null check (length(trim(name)) between 2 and 120),
  specialty text check (specialty is null or length(specialty) <= 80),
  status text not null default 'disponivel' check (status in ('disponivel','em_servico','afastado','inativo')),
  user_id uuid,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (organization_id, code),
  unique (id, organization_id)
);
create unique index technicians_user_uq on public.technicians(organization_id, user_id) where user_id is not null;

create table public.technician_private (
  technician_id uuid primary key,
  organization_id uuid not null default public.my_org(),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  hourly_cost numeric(12,2) check (hourly_cost is null or hourly_cost >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  foreign key (technician_id, organization_id) references public.technicians(id, organization_id)
);

create table public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  equipment_id uuid not null,
  name text not null check (length(trim(name)) between 2 and 120),
  interval_days int check (interval_days is null or interval_days > 0),
  interval_hours numeric(10,1) check (interval_hours is null or interval_hours > 0),
  last_done_date date,
  last_done_hours numeric(12,1),
  last_work_order_id uuid,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  check (interval_days is not null or interval_hours is not null),
  foreign key (equipment_id, organization_id) references public.equipment(id, organization_id)
);

create table public.equipment_readings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  equipment_id uuid not null,
  value numeric(12,1) not null check (value >= 0),
  read_at timestamptz not null default now(),
  work_order_id uuid,
  is_correction boolean not null default false,
  note text check (note is null or length(note) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (equipment_id, organization_id) references public.equipment(id, organization_id)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  plate text not null check (plate ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  model text not null check (length(trim(model)) between 1 and 80),
  year int check (year is null or year between 1950 and 2100),
  type text not null default 'utilitario' check (length(type) <= 40),
  odometer int check (odometer is null or odometer >= 0),
  driver_technician_id uuid,
  status text not null default 'disponivel' check (status in ('disponivel','em_uso','em_manutencao','inativo')),
  next_service_km int check (next_service_km is null or next_service_km >= 0),
  next_service_date date,
  insurance_due date,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (organization_id, plate),
  unique (id, organization_id),
  foreign key (driver_technician_id, organization_id) references public.technicians(id, organization_id)
);

create table public.vehicle_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  vehicle_id uuid not null,
  kind text not null check (kind in ('odometro','manutencao','revisao')),
  event_date date not null,
  odometer int check (odometer is null or odometer >= 0),
  description text check (description is null or length(description) <= 1000),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  foreign key (vehicle_id, organization_id) references public.vehicles(id, organization_id)
);

create table public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  vehicle_id uuid not null,
  category text not null check (category in ('combustivel','manutencao','seguro','pedagio','multa','outros')),
  expense_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  description text check (description is null or length(description) <= 500),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  foreign key (vehicle_id, organization_id) references public.vehicles(id, organization_id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 160),
  document text check (document is null or document ~ '^[0-9]{11}$|^[0-9]{14}$'),
  contact text check (contact is null or length(contact) <= 160),
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (id, organization_id)
);

create table public.part_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (organization_id, name), unique (id, organization_id)
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org() references public.organizations(id),
  code text not null check (code ~ '^[a-zA-Z]{1,6}$'),
  name text not null,
  allows_fraction boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, code), unique (id, organization_id)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  code text not null check (code ~ '^[A-Za-z0-9._/-]{1,40}$'),
  description text not null check (length(trim(description)) between 2 and 200),
  category_id uuid not null,
  unit_id uuid not null,
  min_qty numeric(14,3) not null default 0 check (min_qty >= 0),
  location text check (location is null or length(location) <= 60),
  supplier_id uuid,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (category_id, organization_id) references public.part_categories(id, organization_id),
  foreign key (unit_id, organization_id) references public.units(id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id)
);

create table public.stock_balances (
  part_id uuid primary key,
  organization_id uuid not null,
  qty numeric(14,3) not null default 0 check (qty >= 0),
  avg_cost numeric(14,4) not null default 0 check (avg_cost >= 0),
  last_cost numeric(14,4),
  updated_at timestamptz not null default now(),
  foreign key (part_id, organization_id) references public.parts(id, organization_id)
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  number text not null,
  customer_id uuid not null,
  equipment_id uuid not null,
  type public.wo_type not null,
  priority public.wo_priority not null default 'media',
  description text not null check (length(trim(description)) between 3 and 4000),
  due_date date,
  status public.wo_status not null default 'aberta',
  opened_at timestamptz not null default now(),
  diagnosis_started_at timestamptz, execution_started_at timestamptz,
  tech_completed_at timestamptz, closed_at timestamptz, closed_by uuid,
  canceled_at timestamptz, cancel_reason text,
  diagnosis text check (diagnosis is null or length(diagnosis) <= 8000),
  solution text check (solution is null or length(solution) <= 8000),
  checklist jsonb not null default '{"seguranca":false,"testes_funcionais":false,"vazamentos":false,"limpeza":false}'::jsonb,
  hour_meter_reading numeric(12,1) check (hour_meter_reading is null or hour_meter_reading >= 0),
  parent_work_order_id uuid references public.work_orders(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid, version int not null default 1,
  unique (organization_id, number),
  unique (id, organization_id),
  foreign key (customer_id, organization_id) references public.customers(id, organization_id),
  foreign key (equipment_id, customer_id, organization_id) references public.equipment(id, customer_id, organization_id)
);
create index on public.work_orders(organization_id, status);
create index on public.work_orders(organization_id, opened_at desc);

create table public.org_counters (
  organization_id uuid not null references public.organizations(id),
  key text not null,
  value bigint not null default 0,
  primary key (organization_id, key)
);

create table public.work_order_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null,
  technician_id uuid not null,
  is_primary boolean not null default false,
  assigned_by uuid, assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id),
  foreign key (technician_id, organization_id) references public.technicians(id, organization_id)
);
create unique index wo_assign_active_uq on public.work_order_assignments(work_order_id, technician_id) where unassigned_at is null;

create table public.work_order_status_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  work_order_id uuid not null,
  from_status public.wo_status,
  to_status public.wo_status not null,
  reason text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id)
);

create table public.work_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  work_order_id uuid not null,
  technician_id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes int generated always as ((extract(epoch from (ended_at - started_at)) / 60)::int) stored,
  description text not null check (length(trim(description)) between 3 and 2000),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  check (ended_at > started_at and ended_at - started_at <= interval '24 hours'),
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id),
  foreign key (technician_id, organization_id) references public.technicians(id, organization_id)
);

create table public.work_log_costs (
  work_log_id uuid primary key references public.work_logs(id),
  organization_id uuid not null,
  hourly_cost numeric(12,2) not null,
  cost numeric(12,2) not null
);

create table public.work_order_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  work_order_id uuid not null,
  category text not null check (category in ('deslocamento','terceiros','alimentacao','hospedagem','outros')),
  expense_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  description text check (description is null or length(description) <= 500),
  created_by uuid default auth.uid(), created_at timestamptz not null default now(),
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  part_id uuid not null,
  type public.stock_mov_type not null,
  qty numeric(14,3) not null check (qty > 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  total_cost numeric(14,4) not null,
  balance_after numeric(14,3) not null,
  avg_cost_after numeric(14,4) not null,
  reason text,
  work_order_id uuid,
  supplier_id uuid,
  document_ref text check (document_ref is null or length(document_ref) <= 60),
  reversed_movement_id uuid references public.stock_movements(id),
  part_request_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 80),
  created_by uuid, created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key),
  foreign key (part_id, organization_id) references public.parts(id, organization_id),
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id),
  foreign key (supplier_id, organization_id) references public.suppliers(id, organization_id)
);
create index on public.stock_movements(organization_id, created_at desc);
create index on public.stock_movements(part_id);
create index on public.stock_movements(work_order_id);

create table public.part_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.my_org(),
  work_order_id uuid not null,
  part_id uuid not null,
  qty numeric(14,3) not null check (qty > 0),
  note text check (note is null or length(note) <= 500),
  status text not null default 'pendente' check (status in ('pendente','atendida','recusada')),
  requested_by uuid default auth.uid(), created_at timestamptz not null default now(),
  resolved_by uuid, resolved_at timestamptz, movement_id uuid references public.stock_movements(id),
  foreign key (work_order_id, organization_id) references public.work_orders(id, organization_id),
  foreign key (part_id, organization_id) references public.parts(id, organization_id)
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  entity_type text not null check (entity_type in ('work_order','equipment','vehicle')),
  entity_id uuid not null,
  storage_path text not null unique,
  doc_type text not null default 'foto' check (doc_type in ('foto','laudo','art','nota','outro')),
  external_number text check (external_number is null or length(external_number) <= 60),
  verification_status text not null default 'nao_verificado' check (verification_status in ('nao_verificado','verificado','rejeitado')),
  file_name text not null check (length(file_name) <= 200),
  mime text not null check (mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 10485760),
  sha256 text,
  status text not null default 'pendente' check (status in ('pendente','ativo')),
  created_by uuid, created_at timestamptz not null default now()
);
create index on public.attachments(entity_type, entity_id);

-- ---------- triggers padrão ----------
do $$ declare t text; begin
  foreach t in array array['customers','customer_contacts','equipment','technicians','technician_private','maintenance_plans','vehicles','suppliers','parts'] loop
    execute format('create trigger tg_row before insert or update on public.%I for each row execute function public.tg_business_row()', t);
  end loop;
  foreach t in array array['customers','customer_contacts','equipment','technicians','technician_private','maintenance_plans','vehicles','vehicle_expenses','vehicle_events','suppliers','parts','work_orders','work_order_assignments','work_logs','work_order_expenses','stock_movements','part_requests','attachments','organization_members','invitations','organizations','equipment_readings'] loop
    execute format('create trigger tg_audit after insert or update or delete on public.%I for each row execute function public.tg_audit()', t);
  end loop;
end $$;

-- work_orders: imutabilidade e restrição de campos por papel
create or replace function public.tg_work_order_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_setting('app.rpc', true) = 'on' then
    new.updated_at := now(); new.version := old.version + 1; return new;
  end if;
  if old.status in ('encerrada','cancelada') then raise exception 'OS % está %; edição bloqueada', old.number, old.status using errcode='42501'; end if;
  if new.organization_id <> old.organization_id or new.number <> old.number or new.status <> old.status
     or new.customer_id <> old.customer_id or new.equipment_id <> old.equipment_id or new.created_by is distinct from old.created_by then
    raise exception 'campo protegido; use a operação apropriada' using errcode='42501';
  end if;
  if not public.has_any_role(old.organization_id, array['admin','gestor']::public.app_role[]) then
    if new.description <> old.description or new.priority <> old.priority or new.due_date is distinct from old.due_date or new.type <> old.type then
      raise exception 'somente gestor pode alterar dados de abertura' using errcode='42501';
    end if;
  end if;
  new.updated_at := now(); new.version := old.version + 1;
  return new;
end $$;
create trigger tg_guard before update on public.work_orders for each row execute function public.tg_work_order_guard();

-- leitura de horímetro não retrocede sem correção de admin
create or replace function public.tg_equipment_reading() returns trigger
language plpgsql security definer set search_path = public as $$
declare _cur numeric;
begin
  select hour_meter into _cur from public.equipment where id = new.equipment_id for update;
  if _cur is not null and new.value < _cur then
    if not new.is_correction or not public.has_any_role(new.organization_id, array['admin']::public.app_role[]) or coalesce(trim(new.note),'') = '' then
      raise exception 'Leitura (%) menor que a atual (%). Retrocesso exige correção administrativa justificada.', new.value, _cur using errcode='22023';
    end if;
  end if;
  perform set_config('app.rpc','on', true);
  update public.equipment set hour_meter = new.value, hour_meter_at = new.read_at where id = new.equipment_id;
  perform set_config('app.rpc','off', true);
  return new;
end $$;
create trigger tg_reading before insert on public.equipment_readings for each row execute function public.tg_equipment_reading();

-- custo de mão de obra com snapshot (protegido)
create or replace function public.tg_work_log_cost() returns trigger
language plpgsql security definer set search_path = public as $$
declare _rate numeric;
begin
  select hourly_cost into _rate from public.technician_private where technician_id = new.technician_id;
  insert into public.work_log_costs(work_log_id, organization_id, hourly_cost, cost)
  values (new.id, new.organization_id, coalesce(_rate,0), round(coalesce(_rate,0) * new.duration_minutes / 60.0, 2));
  return new;
end $$;
create trigger tg_wl_cost after insert on public.work_logs for each row execute function public.tg_work_log_cost();

-- ---------- helpers de visibilidade de OS ----------
create or replace function public.is_assigned(_wo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.work_order_assignments a join public.technicians t on t.id = a.technician_id
    where a.work_order_id = _wo and a.unassigned_at is null and t.user_id = auth.uid() and t.archived_at is null)
$$;
create or replace function public.can_view_wo(_wo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.work_orders w where w.id = _wo and (
    public.has_any_role(w.organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[])
    or (public.has_any_role(w.organization_id, array['tecnico']::public.app_role[]) and public.is_assigned(w.id))))
$$;
create or replace function public.my_technician_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.technicians where user_id = auth.uid() and organization_id = public.my_org() and archived_at is null limit 1
$$;
revoke execute on function public.is_assigned(uuid), public.can_view_wo(uuid), public.my_technician_id() from public, anon;
grant execute on function public.is_assigned(uuid), public.can_view_wo(uuid), public.my_technician_id() to authenticated;

-- ---------- GRANTs mínimos ----------
grant select, insert on public.customers, public.customer_contacts, public.equipment, public.technicians, public.technician_private,
  public.maintenance_plans, public.vehicles, public.suppliers, public.parts, public.part_categories, public.units to authenticated;
grant update on public.customers, public.customer_contacts, public.technicians, public.technician_private,
  public.maintenance_plans, public.vehicles, public.suppliers, public.parts to authenticated;
grant update (manufacturer, model, type, serial, status, archived_at, archived_by) on public.equipment to authenticated;
grant select, insert on public.equipment_readings, public.vehicle_events, public.vehicle_expenses, public.work_logs,
  public.work_order_expenses, public.part_requests to authenticated;
grant select on public.stock_balances, public.stock_movements, public.work_orders, public.work_order_assignments,
  public.work_order_status_events, public.work_log_costs, public.attachments to authenticated;
grant update (description, priority, due_date, type, diagnosis, solution, checklist, hour_meter_reading) on public.work_orders to authenticated;
do $$ declare t text; begin
  foreach t in array array['customers','customer_contacts','equipment','technicians','technician_private','maintenance_plans','equipment_readings','vehicles','vehicle_events','vehicle_expenses','suppliers','part_categories','units','parts','stock_balances','work_orders','org_counters','work_order_assignments','work_order_status_events','work_logs','work_log_costs','work_order_expenses','stock_movements','part_requests','attachments'] loop
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- políticas ----------
-- cadastros gerais: leitura por papéis operacionais; escrita admin/gestor
create policy sel on public.customers for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[])
  or exists (select 1 from public.work_orders w where w.customer_id = customers.id and public.is_assigned(w.id)));
create policy ins on public.customers for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.customers for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.customer_contacts for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy ins on public.customer_contacts for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.customer_contacts for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.equipment for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[])
  or exists (select 1 from public.work_orders w where w.equipment_id = equipment.id and public.is_assigned(w.id)));
create policy ins on public.equipment for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.equipment for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.equipment_readings for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[])
  or (work_order_id is not null and public.is_assigned(work_order_id)));
create policy ins on public.equipment_readings for insert to authenticated with check (
  created_by = auth.uid() and (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])
  or (work_order_id is not null and public.is_assigned(work_order_id))));

create policy sel on public.maintenance_plans for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]));
create policy ins on public.maintenance_plans for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.maintenance_plans for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.technicians for select to authenticated using (public.is_member(organization_id));
create policy ins on public.technicians for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.technicians for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.technician_private for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy ins on public.technician_private for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.technician_private for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.vehicles for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]));
create policy ins on public.vehicles for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy upd on public.vehicles for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy sel on public.vehicle_events for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','leitura']::public.app_role[]));
create policy ins on public.vehicle_events for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));
create policy sel on public.vehicle_expenses for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','leitura']::public.app_role[]));
create policy ins on public.vehicle_expenses for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.suppliers for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]));
create policy ins on public.suppliers for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));
create policy upd on public.suppliers for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));

create policy sel on public.part_categories for select to authenticated using (public.is_member(organization_id));
create policy ins on public.part_categories for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));
create policy sel on public.units for select to authenticated using (public.is_member(organization_id));
create policy ins on public.units for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));
create policy sel on public.parts for select to authenticated using (public.is_member(organization_id));
create policy ins on public.parts for insert to authenticated with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));
create policy upd on public.parts for update to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[])) with check (public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]));

create policy sel on public.stock_balances for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]));
create policy sel on public.stock_movements for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]));

create policy sel on public.work_orders for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[])
  or (public.has_any_role(organization_id, array['tecnico']::public.app_role[]) and public.is_assigned(id)));
create policy upd on public.work_orders for update to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])
  or (public.has_any_role(organization_id, array['tecnico']::public.app_role[]) and public.is_assigned(id)))
  with check (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])
  or (public.has_any_role(organization_id, array['tecnico']::public.app_role[]) and public.is_assigned(id)));

create policy sel on public.work_order_assignments for select to authenticated using (public.can_view_wo(work_order_id));
create policy sel on public.work_order_status_events for select to authenticated using (public.can_view_wo(work_order_id));

create policy sel on public.work_logs for select to authenticated using (public.can_view_wo(work_order_id));
create policy ins on public.work_logs for insert to authenticated with check (
  created_by = auth.uid()
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.status in ('em_diagnostico','aguardando_peca','em_andamento'))
  and (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])
       or (technician_id = public.my_technician_id() and public.is_assigned(work_order_id))));
create policy sel on public.work_log_costs for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy sel on public.work_order_expenses for select to authenticated using (public.has_any_role(organization_id, array['admin','gestor','leitura']::public.app_role[]));
create policy ins on public.work_order_expenses for insert to authenticated with check (
  created_by = auth.uid() and public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.status not in ('encerrada','cancelada')));

create policy sel on public.part_requests for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor','almoxarife']::public.app_role[]) or public.can_view_wo(work_order_id));
create policy ins on public.part_requests for insert to authenticated with check (
  requested_by = auth.uid() and status = 'pendente'
  and exists (select 1 from public.work_orders w where w.id = work_order_id and w.status not in ('encerrada','cancelada','concluida_tecnicamente'))
  and exists (select 1 from public.parts p where p.id = part_id and p.archived_at is null)
  and (public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]) or public.is_assigned(work_order_id)));

create policy sel on public.attachments for select to authenticated using (
  status = 'ativo' and (
   (entity_type = 'work_order' and public.can_view_wo(entity_id))
   or (entity_type = 'equipment' and public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]))
   or (entity_type = 'vehicle' and public.has_any_role(organization_id, array['admin','gestor','leitura']::public.app_role[]))));

-- arquivar ≠ excluir: nenhum DELETE concedido a authenticated.

-- dados de referência da organização inicial (categorias e unidades)
insert into public.part_categories(organization_id, name) values
 ('00000000-0000-4000-8000-000000000001','Hidráulica'),('00000000-0000-4000-8000-000000000001','Elétrica'),
 ('00000000-0000-4000-8000-000000000001','Rodagem'),('00000000-0000-4000-8000-000000000001','Lubrificantes');
insert into public.units(organization_id, code, name, allows_fraction) values
 ('00000000-0000-4000-8000-000000000001','un','Unidade',false),('00000000-0000-4000-8000-000000000001','L','Litro',true),
 ('00000000-0000-4000-8000-000000000001','kg','Quilograma',true),('00000000-0000-4000-8000-000000000001','m','Metro',true),
 ('00000000-0000-4000-8000-000000000001','jg','Jogo',false);