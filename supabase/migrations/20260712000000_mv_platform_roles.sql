begin;

create table public.mv_platform_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null constraint mv_platform_roles_rol_check check (rol = 'superadmin'),
  created_at timestamptz not null default now()
);

alter table public.mv_platform_roles enable row level security;
revoke all on public.mv_platform_roles from anon, authenticated;

commit;
