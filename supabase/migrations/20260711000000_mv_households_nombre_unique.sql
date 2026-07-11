begin;

do $$
declare
  duplicados integer;
begin
  select count(*) into duplicados
  from (
    select nombre
    from public.mv_households
    group by nombre
    having count(*) > 1
  ) as mv_households_nombre_duplicados;

  if duplicados > 0 then
    raise exception 'mv_households tiene % nombre(s) duplicado(s); no se puede aplicar unique (nombre) sin consolidar antes. Ver preflight en supabase/migrations/README.md.', duplicados;
  end if;
end $$;

alter table public.mv_households
  add constraint mv_households_nombre_key unique (nombre);

commit;
