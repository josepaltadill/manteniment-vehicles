begin;

-- btrim(nombre) de un solo argumento solo recorta el carácter espacio; un
-- nombre pegado con un tab o salto de línea al final no se reconocería como
-- duplicado de la variante con espacio normal. btrim(nombre, ' \t\n\r')
-- recorta cualquier combinación de esos caracteres desde ambos extremos.
do $$
declare
  duplicados integer;
begin
  select count(*) into duplicados
  from (
    select lower(btrim(nombre, E' \t\n\r')) as nombre_normalizado
    from public.mv_households
    group by lower(btrim(nombre, E' \t\n\r'))
    having count(*) > 1
  ) as mv_households_nombre_duplicados;

  if duplicados > 0 then
    raise exception 'mv_households tiene % nombre(s) duplicado(s) ignorando mayúsculas/espacios/tabs/saltos de línea; no se puede aplicar el índice único normalizado sin consolidar antes. Ver preflight en supabase/migrations/README.md.', duplicados;
  end if;
end $$;

create unique index mv_households_nombre_key
  on public.mv_households (lower(btrim(nombre, E' \t\n\r')));

commit;
