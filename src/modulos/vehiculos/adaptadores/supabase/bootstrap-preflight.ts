import 'server-only';

export type ClienteConsulta = Readonly<{
  query<T extends Record<string, unknown>>(sql: string, valores: readonly unknown[]): Promise<{ rows: T[] }>;
}>;

type FilaPreflight = Readonly<{
  id: string;
  nombre: string;
  vehiculos: string | number;
  eventos: string | number;
  miembros: Array<{ user_id: string; rol: 'admin' | 'editor' }>;
}>;

export async function inspeccionarBootstrapFamiliar(cliente: ClienteConsulta, nombreDestino: string, adminUserId: string) {
  const resultado = await cliente.query<FilaPreflight>(
    `select h.id, h.nombre, count(distinct v.id)::text as vehiculos, count(distinct e.id)::text as eventos,
       coalesce(json_agg(distinct jsonb_build_object('user_id', m.user_id, 'rol', m.rol)) filter (where m.user_id is not null), '[]'::json) as miembros
     from public.mv_households h
     left join public.mv_household_members m on m.household_id = h.id and m.user_id = $2
     left join public.mv_vehiculos v on v.household_id = h.id
     left join public.mv_eventos_vehiculo e on e.household_id = h.id
     where lower(btrim(h.nombre)) = lower(btrim($1))
       or exists (select 1 from public.mv_household_members own where own.household_id = h.id and own.user_id = $2)
     group by h.id, h.nombre`,
    [nombreDestino, adminUserId],
  );
  return resultado.rows.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    vehiculos: Number(fila.vehiculos),
    eventos: Number(fila.eventos),
    miembros: fila.miembros.map((miembro) => ({ userId: miembro.user_id, rol: miembro.rol })),
  }));
}
