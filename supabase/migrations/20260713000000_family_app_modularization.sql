-- Atomic schema cut only. Deploy this with PR 3 in one coordinated release window.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Abort rather than guessing when a shared instance is not in the expected state.
do $$
declare
  v_source_count integer;
  v_final_count integer;
begin
  select count(*) into v_source_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('mv_households', 'mv_household_members', 'mv_platform_roles', 'mv_vehiculos', 'mv_eventos_vehiculo');

  select count(*) into v_final_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo');

  if v_source_count <> 5
    or v_final_count <> 0
    or to_regclass('public.mv_households') is null
    or to_regclass('public.fam_hogares') is not null then
    raise exception 'family-app modularization preflight failed';
  end if;
end;
$$;

-- Fixed lock order prevents deadlocks and makes readers/writers wait for all-or-nothing DDL.
lock table public.mv_households, public.mv_household_members, public.mv_platform_roles, public.mv_vehiculos, public.mv_eventos_vehiculo in access exclusive mode;

alter table public.mv_households rename to fam_hogares;
alter table public.mv_household_members rename to fam_miembros_hogar;
alter table public.mv_platform_roles rename to fam_roles_plataforma;
alter table public.mv_vehiculos rename to fam_ve_vehiculos;
alter table public.mv_eventos_vehiculo rename to fam_ve_eventos_vehiculo;

-- Table renames preserve OIDs, but SQL function bodies retain textual references.
create or replace function public.mv_es_miembro(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.fam_miembros_hogar where household_id = p_household_id and user_id = auth.uid());
$$;
create or replace function public.mv_tiene_rol(p_household_id uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.fam_miembros_hogar where household_id = p_household_id and user_id = auth.uid() and rol = any(p_roles));
$$;
create or replace function public.mv_preservar_admin_hogar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_elimina_admin boolean;
begin
  if tg_op = 'DELETE' then
    v_elimina_admin := old.rol = 'admin';
  else
    v_elimina_admin := old.rol = 'admin' and (new.rol is distinct from 'admin' or new.household_id is distinct from old.household_id);
  end if;
  if not v_elimina_admin then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  perform 1 from public.fam_hogares where id = old.household_id for update;
  if not found then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if not exists (
    select 1 from public.fam_miembros_hogar
    where household_id = old.household_id and rol = 'admin' and user_id <> old.user_id
  ) then
    raise exception using errcode = '23514', message = 'fam_miembros_hogar requires at least one admin per household';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

alter function public.mv_es_miembro(uuid) rename to fam_es_miembro_hogar;
alter function public.mv_tiene_rol(uuid, text[]) rename to fam_tiene_rol_hogar;
alter function public.mv_preservar_admin_hogar() rename to fam_preservar_admin_hogar;

-- Rename every owner-specific dependent object without recreating it or changing its OID.
do $$
declare
  r record;
  v_name text;
begin
  for r in
    select c.conname, t.relname as table_name
    from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo') and c.conname ~ '^mv_'
  loop
    v_name := replace(replace(replace(replace(replace(r.conname, 'mv_households', 'fam_hogares'), 'mv_household_members', 'fam_miembros_hogar'), 'mv_platform_roles', 'fam_roles_plataforma'), 'mv_vehiculos', 'fam_ve_vehiculos'), 'mv_eventos_vehiculo', 'fam_ve_eventos_vehiculo');
    execute format('alter table public.%I rename constraint %I to %I', r.table_name, r.conname, v_name);
  end loop;

  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_index i on i.indexrelid = c.oid join pg_class t on t.oid = i.indrelid
    where n.nspname = 'public' and c.relkind = 'i' and c.relname ~ '^mv_'
      and t.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo')
  loop
    v_name := replace(replace(replace(replace(replace(r.relname, 'mv_households', 'fam_hogares'), 'mv_household_members', 'fam_miembros_hogar'), 'mv_platform_roles', 'fam_roles_plataforma'), 'mv_vehiculos', 'fam_ve_vehiculos'), 'mv_eventos_vehiculo', 'fam_ve_eventos_vehiculo');
    execute format('alter index public.%I rename to %I', r.relname, v_name);
  end loop;

  for r in
    select p.polname, t.relname as table_name from pg_policy p join pg_class t on t.oid = p.polrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and p.polname ~ '^mv_' and p.polname <> 'mv_vehiculos_select_member'
      and t.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo')
  loop
    v_name := replace(replace(replace(replace(replace(r.polname, 'mv_households', 'fam_hogares'), 'mv_household_members', 'fam_miembros_hogar'), 'mv_platform_roles', 'fam_roles_plataforma'), 'mv_vehiculos', 'fam_ve_vehiculos'), 'mv_eventos_vehiculo', 'fam_ve_eventos_vehiculo');
    execute format('alter policy %I on public.%I rename to %I', r.polname, r.table_name, v_name);
  end loop;

  for r in
    select tg.tgname, t.relname as table_name from pg_trigger tg join pg_class t on t.oid = tg.tgrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and not tg.tgisinternal and tg.tgname ~ '^mv_'
      and t.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo')
  loop
    v_name := replace(replace(replace(replace(replace(r.tgname, 'mv_households', 'fam_hogares'), 'mv_household_members', 'fam_miembros_hogar'), 'mv_platform_roles', 'fam_roles_plataforma'), 'mv_vehiculos', 'fam_ve_vehiculos'), 'mv_eventos_vehiculo', 'fam_ve_eventos_vehiculo');
    execute format('alter trigger %I on public.%I rename to %I', r.tgname, r.table_name, v_name);
  end loop;
end;
$$;

-- Explicit representative policy rename keeps the security contract obvious in review.
alter policy mv_vehiculos_select_member on public.fam_ve_vehiculos rename to fam_ve_vehiculos_select_member;

-- Verify final tables, RLS, and that no owner-specific mv_* catalog objects remain.
do $$
declare
  v_final_count integer;
  v_rls_count integer;
  v_mv_count integer;
begin
  select count(*) into v_final_count from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo');
  select count(*) into v_rls_count from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and c.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo');
  select count(*) into v_mv_count from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname ~ '^mv_(households|household_members|platform_roles|vehiculos|eventos_vehiculo)';
  if v_final_count <> 5 or v_rls_count <> 5 or v_mv_count <> 0 then
    raise exception 'family-app modularization postcondition failed';
  end if;
end;
$$;

commit;
