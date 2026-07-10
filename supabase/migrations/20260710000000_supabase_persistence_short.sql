begin;

create table public.mv_households (
  id uuid primary key default gen_random_uuid(),
  nombre text not null constraint mv_households_nombre_check check (btrim(nombre) <> ''),
  created_at timestamptz not null default now()
);

create table public.mv_household_members (
  household_id uuid not null references public.mv_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null constraint mv_household_members_rol_check check (rol in ('admin', 'editor')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.mv_vehiculos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.mv_households(id) on delete cascade,
  marca text not null constraint mv_vehiculos_marca_check check (btrim(marca) <> ''),
  modelo text not null constraint mv_vehiculos_modelo_check check (btrim(modelo) <> ''),
  combustible text not null constraint mv_vehiculos_combustible_check check (btrim(combustible) <> ''),
  matricula text not null constraint mv_vehiculos_matricula_check check (btrim(matricula) <> ''),
  anio integer not null constraint mv_vehiculos_anio_check check (anio > 0),
  kilometros_actuales integer not null constraint mv_vehiculos_kilometros_check check (kilometros_actuales >= 0),
  estado text not null constraint mv_vehiculos_estado_check check (estado in ('activo', 'inactivo')),
  fecha_compra timestamptz not null,
  fecha_alta_aplicacion timestamptz not null,
  fecha_desactivacion timestamptz,
  constraint mv_vehiculos_fecha_desactivacion_check check (
    (estado = 'activo' and fecha_desactivacion is null) or
    (estado = 'inactivo' and fecha_desactivacion is not null)
  ),
  constraint mv_vehiculos_household_matricula_key unique (household_id, matricula),
  constraint mv_vehiculos_household_id_id_key unique (household_id, id)
);

create table public.mv_eventos_vehiculo (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  vehiculo_id uuid not null,
  tipo text not null constraint mv_eventos_vehiculo_tipo_check check (tipo in ('mantenimiento', 'averia')),
  descripcion text not null constraint mv_eventos_vehiculo_descripcion_check check (btrim(descripcion) <> ''),
  kilometros integer not null constraint mv_eventos_vehiculo_kilometros_check check (kilometros >= 0),
  fecha timestamptz not null,
  proveedor text,
  moneda text,
  notas text,
  coste numeric(12, 2) constraint mv_eventos_vehiculo_coste_check check (coste >= 0),
  proximo_vencimiento_km integer constraint mv_eventos_vehiculo_vencimiento_km_check check (proximo_vencimiento_km >= 0),
  proximo_vencimiento_fecha timestamptz,
  fecha_creacion timestamptz not null default now(),
  constraint mv_eventos_vehiculo_vehiculo_household_fkey foreign key (household_id, vehiculo_id)
    references public.mv_vehiculos (household_id, id) on delete cascade
);

create index mv_household_members_user_household_idx on public.mv_household_members (user_id, household_id);
create index mv_vehiculos_household_estado_idx on public.mv_vehiculos (household_id, estado);
create index mv_eventos_vehiculo_household_vehiculo_fecha_idx on public.mv_eventos_vehiculo (household_id, vehiculo_id, fecha desc);
create index mv_eventos_vehiculo_vencimiento_km_idx on public.mv_eventos_vehiculo (proximo_vencimiento_km) where proximo_vencimiento_km is not null;
create index mv_eventos_vehiculo_vencimiento_fecha_idx on public.mv_eventos_vehiculo (proximo_vencimiento_fecha) where proximo_vencimiento_fecha is not null;

create function public.mv_es_miembro(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mv_household_members where household_id = p_household_id and user_id = auth.uid());
$$;
create function public.mv_tiene_rol(p_household_id uuid, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mv_household_members where household_id = p_household_id and user_id = auth.uid() and rol = any(p_roles));
$$;
create function public.mv_preservar_admin_hogar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_elimina_admin boolean;
begin
  if tg_op = 'DELETE' then
    v_elimina_admin := old.rol = 'admin';
  else
    v_elimina_admin := old.rol = 'admin' and (
      new.rol is distinct from 'admin' or
      new.household_id is distinct from old.household_id
    );
  end if;

  if not v_elimina_admin then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Serialize admin removals per household. A missing parent means this trigger
  -- is running as part of the household's own cascading delete.
  perform 1
  from public.mv_households
  where id = old.household_id
  for update;

  if not found then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.mv_household_members
    where household_id = old.household_id
      and rol = 'admin'
      and user_id <> old.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'mv_household_members requires at least one admin per household';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function public.mv_es_miembro(uuid) owner to postgres;
alter function public.mv_tiene_rol(uuid, text[]) owner to postgres;
alter function public.mv_preservar_admin_hogar() owner to postgres;
revoke all on function public.mv_es_miembro(uuid) from public;
revoke all on function public.mv_tiene_rol(uuid, text[]) from public;
revoke all on function public.mv_preservar_admin_hogar() from public;
grant execute on function public.mv_es_miembro(uuid) to authenticated;
grant execute on function public.mv_tiene_rol(uuid, text[]) to authenticated;

create trigger mv_household_members_preservar_admin_update
before update of household_id, rol on public.mv_household_members
for each row execute function public.mv_preservar_admin_hogar();
create trigger mv_household_members_preservar_admin_delete
before delete on public.mv_household_members
for each row execute function public.mv_preservar_admin_hogar();

alter table public.mv_households enable row level security;
alter table public.mv_household_members enable row level security;
alter table public.mv_vehiculos enable row level security;
alter table public.mv_eventos_vehiculo enable row level security;
revoke all on public.mv_households, public.mv_household_members, public.mv_vehiculos, public.mv_eventos_vehiculo from anon;
grant select, update, delete on public.mv_households to authenticated;
grant select, insert, update, delete on public.mv_household_members to authenticated;
grant select, insert, update, delete on public.mv_vehiculos to authenticated;
grant select, insert, update, delete on public.mv_eventos_vehiculo to authenticated;

create policy mv_households_select_member on public.mv_households for select to authenticated using (public.mv_es_miembro(id));
create policy mv_households_update_admin on public.mv_households for update to authenticated using (public.mv_tiene_rol(id, array['admin'])) with check (public.mv_tiene_rol(id, array['admin']));
create policy mv_households_delete_admin on public.mv_households for delete to authenticated using (public.mv_tiene_rol(id, array['admin']));
create policy mv_household_members_select_member_or_admin on public.mv_household_members for select to authenticated using (user_id = auth.uid() or public.mv_tiene_rol(household_id, array['admin']));
create policy mv_household_members_insert_admin on public.mv_household_members for insert to authenticated with check (public.mv_tiene_rol(household_id, array['admin']));
create policy mv_household_members_update_admin on public.mv_household_members for update to authenticated using (public.mv_tiene_rol(household_id, array['admin'])) with check (public.mv_tiene_rol(household_id, array['admin']));
create policy mv_household_members_delete_admin on public.mv_household_members for delete to authenticated using (public.mv_tiene_rol(household_id, array['admin']));
create policy mv_vehiculos_select_member on public.mv_vehiculos for select to authenticated using (public.mv_es_miembro(household_id));
create policy mv_vehiculos_insert_operator on public.mv_vehiculos for insert to authenticated with check (public.mv_tiene_rol(household_id, array['admin', 'editor']));
create policy mv_vehiculos_update_operator on public.mv_vehiculos for update to authenticated using (public.mv_tiene_rol(household_id, array['admin', 'editor'])) with check (public.mv_tiene_rol(household_id, array['admin', 'editor']));
create policy mv_vehiculos_delete_admin on public.mv_vehiculos for delete to authenticated using (public.mv_tiene_rol(household_id, array['admin']));
create policy mv_eventos_vehiculo_select_member on public.mv_eventos_vehiculo for select to authenticated using (public.mv_es_miembro(household_id));
create policy mv_eventos_vehiculo_insert_operator on public.mv_eventos_vehiculo for insert to authenticated with check (public.mv_tiene_rol(household_id, array['admin', 'editor']));
create policy mv_eventos_vehiculo_update_operator on public.mv_eventos_vehiculo for update to authenticated using (public.mv_tiene_rol(household_id, array['admin', 'editor'])) with check (public.mv_tiene_rol(household_id, array['admin', 'editor']));
create policy mv_eventos_vehiculo_delete_admin on public.mv_eventos_vehiculo for delete to authenticated using (public.mv_tiene_rol(household_id, array['admin']));

commit;
