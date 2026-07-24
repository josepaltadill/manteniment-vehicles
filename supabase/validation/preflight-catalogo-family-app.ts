export type ClienteCatalogoPostgres = Readonly<{
  query<T extends Record<string, unknown>>(sql: string, valores?: readonly unknown[]): Promise<{ rows: T[] }>;
}>;

type FilaObjetoOrigen = Readonly<{
  nombre: string;
  oid: string;
  propietario: string;
  definicion: unknown;
}>;

type FilaConflictoFinal = Readonly<{ nombre: string; oid: string }>;

type FilaDependencia = Readonly<{
  tabla_origen: string;
  objeto_dependiente: string;
  clase_dependiente: string;
  oid_dependiente: string;
  subobjeto_dependiente: string;
  tipo_dependencia: string;
  clase_referencia: string;
  oid_referencia: string;
  subobjeto_referencia: string;
  definicion: string | null;
}>;

const TABLAS_ORIGEN = [
  'mv_households',
  'mv_household_members',
  'mv_platform_roles',
  'mv_vehiculos',
  'mv_eventos_vehiculo',
] as const;

const TABLAS_FINALES = [
  'fam_hogares',
  'fam_miembros_hogar',
  'fam_roles_plataforma',
  'fam_ve_vehiculos',
  'fam_ve_eventos_vehiculo',
] as const;

export type InventarioCatalogoFamiliar = Readonly<{
  objetosOrigen: ReadonlyArray<Readonly<{
    nombre: string;
    oid: string;
    propietario: string;
    definicion: unknown;
  }>>;
  conflictosFinales: ReadonlyArray<Readonly<{ nombre: string; oid: string }>>;
  dependencias: ReadonlyArray<Readonly<{
    tablaOrigen: string;
    objetoDependiente: string;
    claseDependiente: string;
    oidDependiente: string;
    subobjetoDependiente: string;
    tipoDependencia: string;
    claseReferencia: string;
    oidReferencia: string;
    subobjetoReferencia: string;
    definicion: string | null;
  }>>;
}>;

export async function inspeccionarPreflightCatalogoFamiliar(cliente: ClienteCatalogoPostgres): Promise<InventarioCatalogoFamiliar> {
  const origen = await cliente.query<FilaObjetoOrigen>(`
    select c.relname as nombre, c.oid::text as oid, pg_get_userbyid(c.relowner) as propietario,
      jsonb_agg(jsonb_build_object('nombre', a.attname, 'tipo', pg_catalog.format_type(a.atttypid, a.atttypmod), 'no_nulo', a.attnotnull) order by a.attnum) as definicion
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r' and c.relname = any($1::text[])
    group by c.oid, c.relname, c.relowner
    order by c.relname`, [TABLAS_ORIGEN]);
  const finales = await cliente.query<FilaConflictoFinal>(`
    select t.typname as nombre, t.oid::text as oid
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = any($1::text[])
    order by t.typname, t.oid`, [TABLAS_FINALES]);
  const dependencias = await cliente.query<FilaDependencia>(`
    select origen.relname as tabla_origen,
      coalesce(dependiente.relname, pg_describe_object(d.classid, d.objid, d.objsubid)) as objeto_dependiente,
      d.classid::text as clase_dependiente, d.objid::text as oid_dependiente,
      d.objsubid::text as subobjeto_dependiente, d.deptype as tipo_dependencia,
      d.refclassid::text as clase_referencia, d.refobjid::text as oid_referencia,
      d.refobjsubid::text as subobjeto_referencia,
      coalesce(case when dependiente.relkind = 'i' then pg_get_indexdef(dependiente.oid) end,
        pg_describe_object(d.classid, d.objid, d.objsubid)) as definicion
    from pg_depend d
    join pg_class origen on d.refclassid = 'pg_class'::regclass and origen.oid = d.refobjid
    join pg_namespace espacio_origen on espacio_origen.oid = origen.relnamespace
    left join pg_class dependiente on d.classid = 'pg_class'::regclass and dependiente.oid = d.objid
    where espacio_origen.nspname = 'public' and origen.relname = any($1::text[])
    order by origen.relname, d.classid, d.objid, d.objsubid, d.refclassid, d.refobjid, d.refobjsubid, d.deptype, objeto_dependiente, definicion`, [TABLAS_ORIGEN]);

  const nombresOrigen = new Set(origen.rows.map((fila) => fila.nombre));
  const faltantes = TABLAS_ORIGEN.filter((nombre) => !nombresOrigen.has(nombre));
  if (faltantes.length > 0) {
    throw new Error(`Preflight de catálogo incompleto: faltan ${faltantes.join(', ')}`);
  }
  if (finales.rows.length > 0) {
    throw new Error(`Preflight de catálogo bloqueado: objetos finales conflictivos ${finales.rows.map((fila) => fila.nombre).join(', ')}`);
  }

  return {
    objetosOrigen: origen.rows,
    conflictosFinales: finales.rows,
    dependencias: dependencias.rows.map((fila) => ({
      tablaOrigen: fila.tabla_origen,
      objetoDependiente: fila.objeto_dependiente,
      claseDependiente: fila.clase_dependiente,
      oidDependiente: fila.oid_dependiente,
      subobjetoDependiente: fila.subobjeto_dependiente,
      tipoDependencia: fila.tipo_dependencia,
      claseReferencia: fila.clase_referencia,
      oidReferencia: fila.oid_referencia,
      subobjetoReferencia: fila.subobjeto_referencia,
      definicion: fila.definicion,
    })),
  };
}
