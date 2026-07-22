-- Every mutable assertion is rolled back. Unexpected SQLSTATE values abort psql.
create schema if not exists validation;
create or replace function validation.case_result(p_id text, p_expected text, p_observed text, p_ok boolean)
returns void language plpgsql as $$
begin
  raise notice 'CASE|%|%|%|%', p_id, p_expected, p_observed, case when p_ok then 'PASS' else 'FAIL' end;
  if not p_ok then raise exception 'validation case failed: %', p_id; end if;
end;
$$;
create or replace function validation.expect_row_count(p_id text, p_sql text, p_expected bigint)
returns void language plpgsql as $$
declare v_rows bigint;
begin
  execute p_sql;
  get diagnostics v_rows = row_count;
  perform validation.case_result(p_id, p_expected::text, v_rows::text, v_rows = p_expected);
end;
$$;
create or replace function validation.expect_sqlstate(p_id text, p_sql text, p_state text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    perform validation.case_result(p_id, p_state, 'no-error', false);
  exception when others then
    if sqlstate <> p_state then raise; end if;
    perform validation.case_result(p_id, p_state, sqlstate, true);
  end;
end;
$$;
grant usage on schema validation to anon, authenticated;
grant execute on all functions in schema validation to anon, authenticated;

-- Structural proof before application-role assertions.
select validation.case_result('schema.tables', '5-rls-tables', count(*)::text, count(*) = 5)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('fam_hogares','fam_miembros_hogar','fam_ve_vehiculos','fam_ve_eventos_vehiculo','fam_roles_plataforma') and c.relrowsecurity;

-- anon receives no grants. This checks its role and denial without exposing rows.
begin;
set local role anon;
select validation.expect_sqlstate('anon.select.households', 'select * from public.fam_hogares', '42501');
select validation.expect_sqlstate('anon.select.platform-roles', 'select * from public.fam_roles_plataforma', '42501');
select validation.expect_sqlstate('anon.insert.vehicle', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','ANON',2020,0,'activo',now(),now())$$, '42501');
rollback;

-- A non-member sees no rows and cannot create, update, or delete data in household A.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.case_result('non-member.identity', 'authenticated/non-member', current_user || '/' || auth.uid()::text, current_user = 'authenticated' and auth.uid() = '00000000-0000-0000-0000-0000000000c1');
select validation.case_result('non-member.select', '0', count(*)::text, count(*) = 0) from public.fam_hogares;
select validation.expect_sqlstate('non-member.select.platform-roles', 'select * from public.fam_roles_plataforma', '42501');
select validation.expect_sqlstate('non-member.insert.platform-roles', $$insert into public.fam_roles_plataforma (user_id, rol) values ('00000000-0000-0000-0000-0000000000c1', 'superadmin')$$, '42501');
select validation.expect_sqlstate('non-member.update.platform-roles', $$update public.fam_roles_plataforma set rol = 'superadmin'$$, '42501');
select validation.expect_sqlstate('non-member.delete.platform-roles', $$delete from public.fam_roles_plataforma$$, '42501');
select validation.expect_sqlstate('non-member.insert.vehicle', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','NM-1',2020,0,'activo',now(),now())$$, '42501');
select validation.expect_row_count('non-member.update.vehicle', $$update public.fam_ve_vehiculos set modelo = 'blocked' where household_id = '10000000-0000-0000-0000-00000000000a'$$, 0);
select validation.expect_row_count('non-member.delete.vehicle', $$delete from public.fam_ve_vehiculos where household_id = '10000000-0000-0000-0000-00000000000a'$$, 0);
rollback;

-- Editor A is isolated: operating data is allowed in A but household/member admin and deletes are not.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.case_result('editor-a.identity', 'authenticated/editor-a', current_user || '/' || auth.uid()::text, current_user = 'authenticated' and auth.uid() = '00000000-0000-0000-0000-0000000000e1');
select validation.case_result('editor-a.read-a', '1', count(*)::text, count(*) = 1) from public.fam_ve_vehiculos where household_id = '10000000-0000-0000-0000-00000000000a';
select validation.expect_sqlstate('editor-a.select.platform-roles', 'select * from public.fam_roles_plataforma', '42501');
select validation.case_result('editor-a.read-b', '0', count(*)::text, count(*) = 0) from public.fam_ve_vehiculos where household_id = '20000000-0000-0000-0000-00000000000b';
select validation.expect_row_count('editor-a.insert-a', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','EA-1',2020,0,'activo',now(),now())$$, 1);
select validation.expect_sqlstate('editor-a.insert-b', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('20000000-0000-0000-0000-00000000000b','X','X','X','EA-2',2020,0,'activo',now(),now())$$, '42501');
select validation.expect_row_count('editor-a.delete-a', $$delete from public.fam_ve_vehiculos where id = '30000000-0000-0000-0000-00000000000a'$$, 0);
select validation.expect_row_count('editor-a.update-household', $$update public.fam_hogares set nombre = 'blocked' where id = '10000000-0000-0000-0000-00000000000a'$$, 0);
rollback;

-- Admin A may administer A but WITH CHECK prevents writes into B.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.expect_row_count('admin-a.update-a', $$update public.fam_hogares set nombre = 'Household A revised' where id = '10000000-0000-0000-0000-00000000000a'$$, 1);
select validation.expect_row_count('admin-a.update-b', $$update public.fam_hogares set nombre = 'blocked' where id = '20000000-0000-0000-0000-00000000000b'$$, 0);
select validation.expect_sqlstate('admin-a.move-vehicle-b', $$update public.fam_ve_vehiculos set household_id = '20000000-0000-0000-0000-00000000000b' where id = '30000000-0000-0000-0000-00000000000a'$$, '42501');
rollback;

-- Integrity and trigger cases run privileged so SQLSTATE identifies the invariant, not RLS.
begin;
select validation.expect_sqlstate('integrity.duplicate-plate', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','A-100',2020,0,'activo',now(),now())$$, '23505');
select validation.expect_sqlstate('integrity.invalid-year', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','BAD-1',0,0,'activo',now(),now())$$, '23514');
select validation.expect_sqlstate('integrity.cross-household-event', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','40000000-0000-0000-0000-00000000000b','averia','invalid',0,now())$$, '23503');
select validation.expect_sqlstate('last-admin.delete', $$delete from public.fam_miembros_hogar where household_id = '20000000-0000-0000-0000-00000000000b' and user_id = '00000000-0000-0000-0000-0000000000b1'$$, '23514');
select validation.case_result('post-negative.last-admin-delete', '1', count(*)::text, count(*) = 1) from public.fam_miembros_hogar where household_id = '20000000-0000-0000-0000-00000000000b' and rol = 'admin';
rollback;

-- anon must be denied every operation on every protected table.
begin;
set local role anon;
select validation.expect_sqlstate('anon.update.households', $$update public.fam_hogares set nombre = 'blocked'$$, '42501');
select validation.expect_sqlstate('anon.delete.households', $$delete from public.fam_hogares$$, '42501');
select validation.expect_sqlstate('anon.select.members', $$select * from public.fam_miembros_hogar$$, '42501');
select validation.expect_sqlstate('anon.insert.members', $$insert into public.fam_miembros_hogar (household_id,user_id,rol) values ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1','editor')$$, '42501');
select validation.expect_sqlstate('anon.update.members', $$update public.fam_miembros_hogar set rol = 'editor'$$, '42501');
select validation.expect_sqlstate('anon.delete.members', $$delete from public.fam_miembros_hogar$$, '42501');
select validation.expect_sqlstate('anon.select.vehicles', $$select * from public.fam_ve_vehiculos$$, '42501');
select validation.expect_sqlstate('anon.update.vehicles', $$update public.fam_ve_vehiculos set modelo = 'blocked'$$, '42501');
select validation.expect_sqlstate('anon.delete.vehicles', $$delete from public.fam_ve_vehiculos$$, '42501');
select validation.expect_sqlstate('anon.select.events', $$select * from public.fam_ve_eventos_vehiculo$$, '42501');
select validation.expect_sqlstate('anon.insert.events', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia','blocked',0,now())$$, '42501');
select validation.expect_sqlstate('anon.update.events', $$update public.fam_ve_eventos_vehiculo set descripcion = 'blocked'$$, '42501');
select validation.expect_sqlstate('anon.delete.events', $$delete from public.fam_ve_eventos_vehiculo$$, '42501');
rollback;

-- Editor A can operate on A vehicles/events only; administrative data and B remain unavailable.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.expect_row_count('editor-a.update-vehicle-a', $$update public.fam_ve_vehiculos set modelo = 'Editor revised' where id = '30000000-0000-0000-0000-00000000000a'$$, 1);
select validation.expect_row_count('editor-a.insert-event-a', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia','Editor event',101,now())$$, 1);
select validation.expect_row_count('editor-a.update-event-a', $$update public.fam_ve_eventos_vehiculo set descripcion = 'Editor event revised' where household_id = '10000000-0000-0000-0000-00000000000a'$$, 1);
select validation.expect_row_count('editor-a.delete-event-a', $$delete from public.fam_ve_eventos_vehiculo where household_id = '10000000-0000-0000-0000-00000000000a'$$, 0);
select validation.expect_sqlstate('editor-a.insert-event-b', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('20000000-0000-0000-0000-00000000000b','40000000-0000-0000-0000-00000000000b','averia','blocked',0,now())$$, '42501');
reset role;
select validation.case_result('post-negative.cross-household-event', '0', count(*)::text, count(*) = 0) from public.fam_ve_eventos_vehiculo where household_id = '20000000-0000-0000-0000-00000000000b';
rollback;

-- Admin A manages members and all operational records in A, never B.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.expect_row_count('admin-a.insert-member-a', $$insert into public.fam_miembros_hogar (household_id,user_id,rol) values ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1','editor')$$, 1);
select validation.expect_row_count('admin-a.update-member-a', $$update public.fam_miembros_hogar set rol = 'editor' where household_id = '10000000-0000-0000-0000-00000000000a' and user_id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
select validation.expect_row_count('admin-a.delete-member-a', $$delete from public.fam_miembros_hogar where household_id = '10000000-0000-0000-0000-00000000000a' and user_id = '00000000-0000-0000-0000-0000000000c1'$$, 1);
select validation.expect_row_count('admin-a.insert-event-a', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','mantenimiento','Admin event',101,now())$$, 1);
select validation.expect_row_count('admin-a.delete-event-a', $$delete from public.fam_ve_eventos_vehiculo where household_id = '10000000-0000-0000-0000-00000000000a'$$, 1);
select validation.expect_sqlstate('admin-a.insert-member-b', $$insert into public.fam_miembros_hogar (household_id,user_id,rol) values ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c1','editor')$$, '42501');
select validation.expect_sqlstate('admin-a.insert-event-b', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('20000000-0000-0000-0000-00000000000b','40000000-0000-0000-0000-00000000000b','averia','blocked',0,now())$$, '42501');
reset role;
select validation.case_result('post-negative.cross-household-membership', '0', count(*)::text, count(*) = 0) from public.fam_miembros_hogar where household_id = '20000000-0000-0000-0000-00000000000b' and user_id = '00000000-0000-0000-0000-0000000000c1';
rollback;

-- Admin B mirrors the minimum isolation and CRUD proof from the opposite household.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.case_result('admin-b.identity', 'authenticated/admin-b', current_user || '/' || auth.uid()::text, current_user = 'authenticated' and auth.uid() = '00000000-0000-0000-0000-0000000000b1');
select validation.expect_sqlstate('admin-b.select.platform-roles', 'select * from public.fam_roles_plataforma', '42501');
select validation.case_result('admin-b.read-b', '1', count(*)::text, count(*) = 1) from public.fam_hogares where id = '20000000-0000-0000-0000-00000000000b';
select validation.case_result('admin-b.read-a', '0', count(*)::text, count(*) = 0) from public.fam_hogares where id = '10000000-0000-0000-0000-00000000000a';
select validation.expect_row_count('admin-b.update-b', $$update public.fam_hogares set nombre = 'Household B revised' where id = '20000000-0000-0000-0000-00000000000b'$$, 1);
select validation.expect_row_count('admin-b.insert-vehicle-b', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('20000000-0000-0000-0000-00000000000b','X','X','X','B-NEW',2020,0,'activo',now(),now())$$, 1);
select validation.expect_sqlstate('admin-b.insert-vehicle-a', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','B-BLOCK',2020,0,'activo',now(),now())$$, '42501');
reset role;
select validation.case_result('post-negative.admin-b-cross-household', '0', count(*)::text, count(*) = 0) from public.fam_ve_vehiculos where matricula = 'B-BLOCK';
rollback;

-- Remaining schema checks are privileged so every rejection has its invariant SQLSTATE.
begin;
select validation.expect_sqlstate('integrity.blank-household-name', $$insert into public.fam_hogares (nombre) values (' ')$$, '23514');
select validation.expect_sqlstate('integrity.invalid-member-role', $$insert into public.fam_miembros_hogar (household_id,user_id,rol) values ('10000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1','owner')$$, '23514');
select validation.expect_sqlstate('integrity.blank-vehicle-text', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a',' ','X','X','TEXT-1',2020,0,'activo',now(),now())$$, '23514');
select validation.expect_sqlstate('integrity.invalid-vehicle-kilometres', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','KM-1',2020,-1,'activo',now(),now())$$, '23514');
select validation.expect_sqlstate('integrity.invalid-vehicle-state-date', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion,fecha_desactivacion) values ('10000000-0000-0000-0000-00000000000a','X','X','X','STATE-1',2020,0,'activo',now(),now(),now())$$, '23514');
select validation.expect_sqlstate('integrity.invalid-event-type', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','inspection','invalid',0,now())$$, '23514');
select validation.expect_sqlstate('integrity.blank-event-description', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia',' ',0,now())$$, '23514');
select validation.expect_sqlstate('integrity.invalid-event-kilometres', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia','invalid',-1,now())$$, '23514');
select validation.expect_sqlstate('integrity.invalid-event-cost', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha,coste) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia','invalid',0,now(),-1)$$, '23514');
select validation.expect_sqlstate('integrity.invalid-event-due-km', $$insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha,proximo_vencimiento_km) values ('10000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a','averia','invalid',0,now(),-1)$$, '23514');
select validation.expect_row_count('integrity.duplicate-plate-other-household-allowed', $$insert into public.fam_ve_vehiculos (household_id,marca,modelo,combustible,matricula,anio,kilometros_actuales,estado,fecha_compra,fecha_alta_aplicacion) values ('20000000-0000-0000-0000-00000000000b','X','X','X','A-100',2020,0,'activo',now(),now())$$, 1);
rollback;

-- The trigger rejects every removal of B's only admin, but permits mutations with a second A admin.
begin;
select validation.expect_sqlstate('last-admin.demote', $$update public.fam_miembros_hogar set rol = 'editor' where household_id = '20000000-0000-0000-0000-00000000000b' and user_id = '00000000-0000-0000-0000-0000000000b1'$$, '23514');
select validation.expect_sqlstate('last-admin.move', $$update public.fam_miembros_hogar set household_id = '10000000-0000-0000-0000-00000000000a' where household_id = '20000000-0000-0000-0000-00000000000b' and user_id = '00000000-0000-0000-0000-0000000000b1'$$, '23514');
select validation.expect_row_count('last-admin.delete-allowed-with-second-admin', $$delete from public.fam_miembros_hogar where household_id = '10000000-0000-0000-0000-00000000000a' and user_id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
select validation.case_result('post-negative.last-admin-state', '1', count(*)::text, count(*) = 1) from public.fam_miembros_hogar where household_id = '20000000-0000-0000-0000-00000000000b' and rol = 'admin';
rollback;
begin;
select validation.expect_row_count('last-admin.demote-allowed-with-second-admin', $$update public.fam_miembros_hogar set rol = 'editor' where household_id = '10000000-0000-0000-0000-00000000000a' and user_id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
rollback;
begin;
select validation.expect_row_count('last-admin.move-allowed-with-second-admin', $$update public.fam_miembros_hogar set household_id = '20000000-0000-0000-0000-00000000000b' where household_id = '10000000-0000-0000-0000-00000000000a' and user_id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
rollback;

-- Explicit household deletion is allowed to cascade child members, vehicles, and events.
begin;
insert into public.fam_ve_eventos_vehiculo (household_id,vehiculo_id,tipo,descripcion,kilometros,fecha) values ('20000000-0000-0000-0000-00000000000b','40000000-0000-0000-0000-00000000000b','averia','cascade fixture',200,now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select validation.expect_row_count('cascade.delete-household-as-admin-b', $$delete from public.fam_hogares where id = '20000000-0000-0000-0000-00000000000b'$$, 1);
reset role;
select validation.case_result('cascade.members', '0', count(*)::text, count(*) = 0) from public.fam_miembros_hogar where household_id = '20000000-0000-0000-0000-00000000000b';
select validation.case_result('cascade.vehicles', '0', count(*)::text, count(*) = 0) from public.fam_ve_vehiculos where household_id = '20000000-0000-0000-0000-00000000000b';
select validation.case_result('cascade.events', '0', count(*)::text, count(*) = 0) from public.fam_ve_eventos_vehiculo where household_id = '20000000-0000-0000-0000-00000000000b';
rollback;
