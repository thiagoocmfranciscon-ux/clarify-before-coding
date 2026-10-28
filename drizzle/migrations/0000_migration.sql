-- ============ 001: identidade, organizações, permissões, auditoria ============
create type public.app_role as enum ('admin','gestor','tecnico','almoxarife','leitura');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  timezone text not null default 'America/Sao_Paulo',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or length(full_name) <= 120),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  unique (organization_id, user_id)
);
create index on public.organization_members(user_id) where active;
grant select on public.organization_members to authenticated;
grant all on public.organization_members to service_role;
alter table public.organization_members enable row level security;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  email text not null check (email = lower(trim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.app_role not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index invitations_one_pending on public.invitations(organization_id, email) where used_at is null and revoked_at is null;
grant select on public.invitations to authenticated;
grant all on public.invitations to service_role;
alter table public.invitations enable row level security;

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_events(organization_id, created_at desc);
create index on public.audit_events(entity, entity_id);
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;

-- ---------- helpers (security definer, sem recursão de RLS) ----------
create or replace function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members
  where user_id = auth.uid() and active order by created_at limit 1
$$;

create or replace function public.is_member(_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = _org and active)
$$;

create or replace function public.has_any_role(_org uuid, _roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = _org and active and role = any(_roles))
$$;

create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.organization_members
  where user_id = auth.uid() and active order by created_at limit 1
$$;

revoke execute on function public.my_org() from public, anon;
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_org(), public.is_member(uuid), public.has_any_role(uuid, public.app_role[]), public.my_role() to authenticated;

-- ---------- triggers genéricos ----------
create or replace function public.tg_business_row() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    new.created_by := auth.uid();
    new.version := 1;
    if new.organization_id is null then new.organization_id := public.my_org(); end if;
    return new;
  end if;
  if new.organization_id is distinct from old.organization_id then raise exception 'organization_id é imutável' using errcode = '42501'; end if;
  if new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then raise exception 'autoria é imutável' using errcode = '42501'; end if;
  if new.id is distinct from old.id then raise exception 'id é imutável' using errcode = '42501'; end if;
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end $$;

create or replace function public.tg_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  _diff jsonb := '{}'::jsonb;
  _k text;
  _old jsonb; _new jsonb;
  _sensitive text[] := array['phone','email','document','hourly_cost','avatar_path','contact'];
  _org uuid;
  _action text := lower(tg_op);
begin
  if tg_op = 'DELETE' then _old := to_jsonb(old); _org := (_old->>'organization_id')::uuid;
    insert into public.audit_events(organization_id, actor_id, action, entity, entity_id, changes)
    values (_org, auth.uid(), 'delete', tg_table_name, _old->>'id', null);
    return old;
  end if;
  _new := to_jsonb(new);
  _org := (_new->>'organization_id')::uuid;
  if tg_op = 'UPDATE' then
    _old := to_jsonb(old);
    for _k in select jsonb_object_keys(_new) loop
      if _k in ('updated_at','version') then continue; end if;
      if (_old->_k) is distinct from (_new->_k) then
        if _k = any(_sensitive) then _diff := _diff || jsonb_build_object(_k, '[alterado]');
        else _diff := _diff || jsonb_build_object(_k, jsonb_build_object('de', _old->_k, 'para', _new->_k)); end if;
      end if;
    end loop;
    if _diff = '{}'::jsonb then return new; end if;
    if (_new ? 'archived_at') and (_old->>'archived_at') is null and (_new->>'archived_at') is not null then _action := 'archive'; end if;
  else
    _diff := null;
  end if;
  insert into public.audit_events(organization_id, actor_id, action, entity, entity_id, changes)
  values (_org, auth.uid(), _action, tg_table_name, _new->>'id', _diff);
  return new;
end $$;
revoke execute on function public.tg_audit() from public, anon, authenticated;

-- ---------- policies núcleo ----------
create policy org_select on public.organizations for select to authenticated using (public.is_member(id));
create policy org_update on public.organizations for update to authenticated
  using (public.has_any_role(id, array['admin']::public.app_role[]))
  with check (public.has_any_role(id, array['admin']::public.app_role[]));
grant update (name, settings) on public.organizations to authenticated;
revoke update on public.organizations from authenticated;
grant update (name, settings) on public.organizations to authenticated;

create policy prof_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.organization_members m where m.user_id = profiles.id and public.is_member(m.organization_id)));
create policy prof_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy mem_select on public.organization_members for select to authenticated using (
  user_id = auth.uid() or public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

create policy inv_select on public.invitations for select to authenticated using (
  public.has_any_role(organization_id, array['admin']::public.app_role[]));

create policy audit_select on public.audit_events for select to authenticated using (
  public.has_any_role(organization_id, array['admin','gestor']::public.app_role[]));

-- perfil automático
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''))
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- aceitar convite: vincula e-mail verificado da sessão ao convite pendente
create or replace function public.accept_invitation() returns jsonb
language plpgsql security definer set search_path = public as $$
declare _email text; _inv public.invitations;
begin
  if auth.uid() is null then raise exception 'sessão inválida' using errcode='42501'; end if;
  select lower(email) into _email from auth.users where id = auth.uid();
  select * into _inv from public.invitations
    where email = _email and used_at is null and revoked_at is null and expires_at > now()
    order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('accepted', false); end if;
  insert into public.organization_members(organization_id, user_id, role, active, created_by)
  values (_inv.organization_id, auth.uid(), _inv.role, true, _inv.created_by)
  on conflict (organization_id, user_id) do update set role = excluded.role, active = true, updated_at = now();
  update public.invitations set used_at = now(), used_by = auth.uid() where id = _inv.id;
  insert into public.audit_events(organization_id, actor_id, action, entity, entity_id, changes)
  values (_inv.organization_id, auth.uid(), 'invite_accepted', 'invitations', _inv.id::text, jsonb_build_object('role', _inv.role));
  return jsonb_build_object('accepted', true, 'role', _inv.role);
end $$;
revoke execute on function public.accept_invitation() from public, anon;
grant execute on function public.accept_invitation() to authenticated;

-- organização inicial + convite do primeiro administrador (uso único, expira em 30 dias)
insert into public.organizations(id, name) values ('00000000-0000-4000-8000-000000000001', 'Nobre Empilhadeiras');
insert into public.invitations(organization_id, email, role, expires_at)
values ('00000000-0000-4000-8000-000000000001', 'thiagoocmfranciscon@gmail.com', 'admin', now() + interval '30 days');