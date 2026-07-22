-- Minimal isolated Auth contract needed by the historical application DDL and seed.
create schema auth;

create table auth.users (
  id uuid primary key,
  instance_id uuid not null,
  aud text not null,
  role text not null,
  email text not null,
  encrypted_password text not null,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null,
  raw_user_meta_data jsonb not null
);

create function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;
