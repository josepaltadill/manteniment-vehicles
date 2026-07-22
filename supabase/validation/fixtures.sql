-- Privileged, disposable initial state. These UUIDs are test identifiers, not credentials.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_a2@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor_a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin_b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor_b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'non_member@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}');

insert into public.fam_hogares (id, nombre) values
  ('10000000-0000-0000-0000-00000000000a', 'Household A'),
  ('20000000-0000-0000-0000-00000000000b', 'Household B');
insert into public.fam_miembros_hogar (household_id, user_id, rol) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000e1', 'editor'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'admin'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000e2', 'editor');
insert into public.fam_ve_vehiculos (id, household_id, marca, modelo, combustible, matricula, anio, kilometros_actuales, estado, fecha_compra, fecha_alta_aplicacion) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Marca', 'A', 'gasolina', 'A-100', 2020, 100, 'activo', now(), now()),
  ('40000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Marca', 'B', 'diesel', 'B-100', 2021, 200, 'activo', now(), now());
