import { readFile } from 'node:fs/promises';
import { Client, type ClientConfig } from 'pg';
import { parseIntoClientConfig } from 'pg-connection-string';
import { describe, expect, it } from 'vitest';
import { inspeccionarPreflightCatalogoFamiliar } from '../../../supabase/validation/preflight-catalogo-family-app';

const rutaMigracion = new URL(
  '../../../supabase/migrations/20260713000000_family_app_modularization.sql',
  import.meta.url,
);
const rutasHistoricas = [
  '../../../supabase/validation/auth-fixture.sql',
  '../../../supabase/migrations/20260710000000_supabase_persistence_short.sql',
  '../../../supabase/migrations/20260711000000_mv_households_nombre_unique.sql',
  '../../../supabase/migrations/20260712000000_mv_platform_roles.sql',
  '../../../supabase/validation/pre-family-app-modularization-fixtures.sql',
].map((ruta) => new URL(ruta, import.meta.url));
const BASE_DEDICADA = 'family_app_modularization_test_review_da7a7c22062311e6';
const BASE_DEDICADA_SQL = '"family_app_modularization_test_review_da7a7c22062311e6"';
const ROL_RESTRINGIDO = 'family_app_migration_test_runner_da7a7c22062311e6';
const ROL_RESTRINGIDO_SQL = '"family_app_migration_test_runner_da7a7c22062311e6"';
const CLAVE_ROL_RESTRINGIDO = 'family_app_local_runner_da7a7c22062311e6';
const USUARIO_ADMIN = 'postgres';
const CLAVE_ADMIN = 'postgres';
const HOSTS_LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const PUERTO_POSTGRES_LOCAL = '54322';
const CLAVE_BLOQUEO = 2_026_071_300_000;
const ERROR_URL_EXPLICITA = 'FAMILY_APP_MIGRATION_TEST_DATABASE_URL debe ser la URL administradora local exacta de la base dedicada';
const ERROR_URL_BOOTSTRAP = 'SUPABASE_BOOTSTRAP_DATABASE_URL debe ser la URL administradora postgres local exacta';

type ConexionesPrueba = {
  adminUrl: string;
  adminDedicadaUrl: string;
  runnerUrl: string;
};

function validarUrlAdministradora(url: string, baseEsperada: string, mensaje: string) {
  try {
    const origen = new URL(url);
    if ((origen.protocol !== 'postgresql:' && origen.protocol !== 'postgres:')
      || !HOSTS_LOOPBACK.has(origen.hostname)
      || origen.port !== PUERTO_POSTGRES_LOCAL
      || origen.pathname !== `/${baseEsperada}`
      || origen.username !== USUARIO_ADMIN
      || origen.password !== CLAVE_ADMIN
      || origen.search !== ''
      || origen.hash !== '') {
      throw new Error();
    }
    return origen;
  } catch {
    throw new Error(mensaje);
  }
}

function resolverConexionesPrueba(urlExplicita?: string, urlBootstrap?: string): ConexionesPrueba | undefined {
  if (!urlExplicita && !urlBootstrap) return undefined;
  const origen = urlExplicita
    ? validarUrlAdministradora(urlExplicita, BASE_DEDICADA, ERROR_URL_EXPLICITA)
    : validarUrlAdministradora(urlBootstrap!, 'postgres', ERROR_URL_BOOTSTRAP);

  const admin = new URL(origen);
  admin.pathname = '/postgres';
  const adminDedicada = new URL(origen);
  adminDedicada.pathname = `/${BASE_DEDICADA}`;
  const runner = new URL(adminDedicada);
  runner.username = ROL_RESTRINGIDO;
  runner.password = CLAVE_ROL_RESTRINGIDO;
  return { adminUrl: admin.toString(), adminDedicadaUrl: adminDedicada.toString(), runnerUrl: runner.toString() };
}

function configuracionAdminDedicada(conexiones: ConexionesPrueba): ClientConfig {
  const config = parseIntoClientConfig(conexiones.adminDedicadaUrl);
  if (!HOSTS_LOOPBACK.has(config.host ?? '')
    || Number(config.port) !== Number(PUERTO_POSTGRES_LOCAL)
    || config.database !== BASE_DEDICADA
    || config.user !== USUARIO_ADMIN
    || config.password !== CLAVE_ADMIN) {
    throw new Error('La conexión administradora no usa la base dedicada exacta');
  }
  return config;
}

function configuracionSqlRepositorio(conexiones: ConexionesPrueba): ClientConfig {
  const config = parseIntoClientConfig(conexiones.runnerUrl);
  if (!HOSTS_LOOPBACK.has(config.host ?? '')
    || Number(config.port) !== Number(PUERTO_POSTGRES_LOCAL)
    || config.database !== BASE_DEDICADA
    || config.user !== ROL_RESTRINGIDO
    || config.password !== CLAVE_ROL_RESTRINGIDO) {
    throw new Error('La conexión SQL del repositorio no usa el runner restringido y la base dedicada exactos');
  }
  return config;
}

const conexiones = resolverConexionesPrueba(
  process.env.FAMILY_APP_MIGRATION_TEST_DATABASE_URL,
  process.env.SUPABASE_BOOTSTRAP_DATABASE_URL,
);
const ejecutarPostgres = conexiones ? describe : describe.skip;
// These inline rows intentionally extend the base historical SQL fixture only for post-migration preservation assertions.
const FILAS_ADICIONALES_PRESERVACION_POST_MIGRACION = `
insert into public.mv_platform_roles (user_id, rol)
values ('00000000-0000-0000-0000-0000000000a1', 'superadmin');
insert into public.mv_eventos_vehiculo (id, household_id, vehiculo_id, tipo, descripcion, kilometros, fecha)
values ('50000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a',
  '30000000-0000-0000-0000-00000000000a', 'mantenimiento', 'Historical service', 100, '2026-07-01T00:00:00Z');`;

async function leerMigracion() {
  return readFile(rutaMigracion, 'utf8');
}

function adaptarPropietarioParaRunner(sql: string) {
  let resultado = '';
  let indice = 0;
  let estado: 'codigo' | 'literal' | 'identificador' | 'comentario-linea' | 'comentario-bloque' | 'dolar' = 'codigo';
  let profundidadComentario = 0;
  let delimitadorDolar = '';
  let literalConEscapes = false;
  const esCaracterIdentificador = (caracter?: string) => caracter !== undefined && /[A-Za-z0-9_$]/.test(caracter);

  while (indice < sql.length) {
    const actual = sql[indice];
    const siguiente = sql[indice + 1];

    if (estado === 'codigo') {
      if (actual === "'") {
        literalConEscapes = (sql[indice - 1] === 'e' || sql[indice - 1] === 'E')
          && !esCaracterIdentificador(sql[indice - 2]);
        estado = 'literal';
      } else if (actual === '"') {
        estado = 'identificador';
      } else if (actual === '-' && siguiente === '-') {
        resultado += '--';
        indice += 2;
        estado = 'comentario-linea';
        continue;
      } else if (actual === '/' && siguiente === '*') {
        resultado += '/*';
        indice += 2;
        profundidadComentario = 1;
        estado = 'comentario-bloque';
        continue;
      } else if (actual === '$') {
        const aperturaDolar = sql.slice(indice).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
        if (aperturaDolar) {
          resultado += aperturaDolar;
          indice += aperturaDolar.length;
          delimitadorDolar = aperturaDolar;
          estado = 'dolar';
          continue;
        }
      }

      if (!esCaracterIdentificador(sql[indice - 1])) {
        const clausula = sql.slice(indice).match(/^owner([ \t\r\n\f]+)to([ \t\r\n\f]+)postgres(?![A-Za-z0-9_$])/i)?.[0];
        if (clausula) {
          resultado += `${clausula.slice(0, -'postgres'.length)}${ROL_RESTRINGIDO_SQL}`;
          indice += clausula.length;
          continue;
        }
      }
    } else if (estado === 'literal') {
      if (literalConEscapes && actual === '\\' && siguiente !== undefined) {
        resultado += actual + siguiente;
        indice += 2;
        continue;
      }
      if (actual === "'" && siguiente === "'") {
        resultado += "''";
        indice += 2;
        continue;
      }
      if (actual === "'") estado = 'codigo';
    } else if (estado === 'identificador') {
      if (actual === '"' && siguiente === '"') {
        resultado += '""';
        indice += 2;
        continue;
      }
      if (actual === '"') estado = 'codigo';
    } else if (estado === 'comentario-linea') {
      if (actual === '\n' || actual === '\r') estado = 'codigo';
    } else if (estado === 'comentario-bloque') {
      if (actual === '/' && siguiente === '*') {
        resultado += '/*';
        indice += 2;
        profundidadComentario += 1;
        continue;
      }
      if (actual === '*' && siguiente === '/') {
        resultado += '*/';
        indice += 2;
        profundidadComentario -= 1;
        if (profundidadComentario === 0) estado = 'codigo';
        continue;
      }
    } else if (sql.startsWith(delimitadorDolar, indice)) {
      resultado += delimitadorDolar;
      indice += delimitadorDolar.length;
      estado = 'codigo';
      continue;
    }

    resultado += actual;
    indice += 1;
  }

  return resultado;
}

async function adquirirBloqueo(cliente: Client) {
  const resultado = await cliente.query<{ adquirido: boolean }>('select pg_try_advisory_lock($1) as adquirido', [CLAVE_BLOQUEO]);
  if (!resultado.rows[0]?.adquirido) {
    throw new Error('No se pudo adquirir el bloqueo de la base dedicada; espere a que termine la otra ejecución');
  }
}

async function normalizarRolRestringido(admin: Client) {
  const rol = await admin.query<{ existe: boolean; tiene_membresias: boolean; tiene_configuracion: boolean }>(`select
    exists(select from pg_roles where rolname = $1) as existe,
    exists(select from pg_auth_members where member = (select oid from pg_roles where rolname = $1)) as tiene_membresias,
    exists(select from pg_db_role_setting where setrole = (select oid from pg_roles where rolname = $1)) as tiene_configuracion`,
  [ROL_RESTRINGIDO]);
  if (rol.rows[0]?.tiene_membresias || rol.rows[0]?.tiene_configuracion) {
    throw new Error('El runner restringido preexistente no puede conservar membresías ni configuración de roles');
  }
  if (!rol.rows[0]?.existe) {
    await admin.query(`create role ${ROL_RESTRINGIDO_SQL} login password '${CLAVE_ROL_RESTRINGIDO}'
      nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls`);
  }
}

async function recrearBaseDedicada(admin: Client) {
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()', [BASE_DEDICADA]);
  await admin.query(`drop database if exists ${BASE_DEDICADA_SQL}`);
  await admin.query(`create database ${BASE_DEDICADA_SQL}`);
}

async function otorgarPrivilegiosBaseDedicada(conexionesPrueba: ConexionesPrueba) {
  const adminDedicada = new Client(configuracionAdminDedicada(conexionesPrueba));
  try {
    await adminDedicada.connect();
    await adminDedicada.query(`revoke all on database ${BASE_DEDICADA_SQL} from public;
      revoke all on database ${BASE_DEDICADA_SQL} from ${ROL_RESTRINGIDO_SQL};
      grant connect, create, temporary on database ${BASE_DEDICADA_SQL} to ${ROL_RESTRINGIDO_SQL};
      revoke all on schema public from public;
      revoke all on schema public from ${ROL_RESTRINGIDO_SQL};
      grant usage, create on schema public to ${ROL_RESTRINGIDO_SQL};`);
  } finally {
    await adminDedicada.end();
  }
}

async function verificarLimiteRolRestringido(runner: Client) {
  const resultado = await runner.query<{ correcto: boolean }>(`select
    current_user = $1
    and not r.rolsuper and not r.rolcreatedb and not r.rolcreaterole and not r.rolinherit
    and not r.rolreplication and not r.rolbypassrls
    and not exists(select from pg_auth_members where member = r.oid)
    and pg_get_userbyid(d.datdba) = $2
    and has_database_privilege(current_user, current_database(), 'CONNECT, CREATE, TEMPORARY')
    and has_schema_privilege(current_user, 'public', 'USAGE, CREATE') as correcto
  from pg_roles r
  join pg_database d on d.datname = current_database()
  where r.rolname = current_user`, [ROL_RESTRINGIDO, USUARIO_ADMIN]);
  if (!resultado.rows[0]?.correcto) {
    throw new Error('El runner no respeta el límite de privilegios de la base dedicada');
  }
}

async function conBaseDedicada<T>(conexionesPrueba: ConexionesPrueba, accion: (cliente: Client) => Promise<T>) {
  const admin = new Client(parseIntoClientConfig(conexionesPrueba.adminUrl));
  await admin.connect();
  let bloqueada = false;
  let runner: Client | undefined;
  try {
    await adquirirBloqueo(admin);
    bloqueada = true;
    await normalizarRolRestringido(admin);
    await recrearBaseDedicada(admin);
    await otorgarPrivilegiosBaseDedicada(conexionesPrueba);
    runner = new Client(configuracionSqlRepositorio(conexionesPrueba));
    await runner.connect();
    await verificarLimiteRolRestringido(runner);
    return await accion(runner);
  } finally {
    try {
      if (runner) await runner.end();
    } finally {
      try {
        if (bloqueada) await admin.query('select pg_advisory_unlock($1)', [CLAVE_BLOQUEO]);
      } finally {
        await admin.end();
      }
    }
  }
}

async function capturarDatos(cliente: Client, finales: boolean) {
  const tablas = finales
    ? ['fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo']
    : ['mv_households', 'mv_household_members', 'mv_platform_roles', 'mv_vehiculos', 'mv_eventos_vehiculo'];
  const ordenes = ['id', 'household_id, user_id', 'user_id', 'id', 'id'];
  const expresiones = tablas.map((tabla, indice) => `(select coalesce(jsonb_agg(to_jsonb(fila) order by ${ordenes[indice]}), '[]'::jsonb) from public.${tabla} fila) as datos_${indice}`);
  const resultado = await cliente.query<Record<string, unknown[]>>(`select ${expresiones.join(',')}`);
  return tablas.map((_tabla, indice) => resultado.rows[0][`datos_${indice}`]);
}

describe('migración atómica family-app modularization', () => {
  it('adapta únicamente cláusulas OWNER TO postgres de código SQL para el runner restringido', () => {
    expect(adaptarPropietarioParaRunner(`alter table public.uno OWNER TO postgres;
      alter function public.dos() owner\nTO PoStGrEs;`)).toBe(`alter table public.uno OWNER TO ${ROL_RESTRINGIDO_SQL};
      alter function public.dos() owner\nTO ${ROL_RESTRINGIDO_SQL};`);
  });

  it('preserva literales, cuerpos dollar-quoted, identificadores, comentarios y nombres parecidos', () => {
    const sql = `select 'OWNER TO postgres', E'it\\'s OWNER TO postgres', "OWNER TO postgres";
      do $$ begin raise notice 'OWNER TO postgres'; end $$;
      do $cuerpo$ OWNER TO postgres $cuerpo$;
      -- OWNER TO postgres
      /* OWNER TO postgres /* OWNER TO postgres */ */
      select postgres; alter table uno owner to "postgres";
      alter table dos owner to postgres_admin;
      alter table tres owner to postgres$rol;
      select coowner to postgres;`;
    expect(adaptarPropietarioParaRunner(sql)).toBe(sql);
  });

  it.each([
    ['bootstrap', undefined, 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'],
    ['URL dedicada explícita', 'postgresql://postgres:postgres@localhost:54322/family_app_modularization_test_review_da7a7c22062311e6', undefined],
  ])('deriva conexiones administrativas y restringidas desde %s', (_caso, explicita, bootstrap) => {
    const resultado = resolverConexionesPrueba(explicita, bootstrap)!;
    expect(parseIntoClientConfig(resultado.adminUrl)).toMatchObject({
      host: explicita ? 'localhost' : '127.0.0.1', port: 54322, database: 'postgres', user: USUARIO_ADMIN, password: CLAVE_ADMIN,
    });
    expect(configuracionAdminDedicada(resultado)).toMatchObject({
      host: explicita ? 'localhost' : '127.0.0.1', port: 54322, database: BASE_DEDICADA,
      user: USUARIO_ADMIN, password: CLAVE_ADMIN,
    });
    expect(configuracionSqlRepositorio(resultado)).toMatchObject({
      host: explicita ? 'localhost' : '127.0.0.1', port: 54322, database: BASE_DEDICADA, user: ROL_RESTRINGIDO,
      password: CLAVE_ROL_RESTRINGIDO,
    });
  });

  it.each([
    ['host remoto', undefined, 'postgresql://postgres:postgres@10.0.0.5:54322/postgres'],
    ['puerto distinto', undefined, 'postgresql://postgres:postgres@127.0.0.1:54323/postgres'],
    ['base bootstrap distinta', undefined, 'postgresql://postgres:postgres@127.0.0.1:54322/template1'],
    ['credenciales no fijas', undefined, 'postgresql://otro:secreto@127.0.0.1:54322/postgres'],
    ['parámetros de conexión', undefined, 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?host=10.0.0.5'],
  ])('rechaza el bootstrap fuera del límite administrativo: %s', (_caso, explicita, bootstrap) => {
    expect(() => resolverConexionesPrueba(explicita, bootstrap)).toThrow(ERROR_URL_BOOTSTRAP);
  });

  it.each([
    ['base postgres', 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'],
    ['base parecida', 'postgresql://postgres:postgres@127.0.0.1:54322/family_app_modularization_test_other'],
    ['usuario runner', `postgresql://${ROL_RESTRINGIDO}:${CLAVE_ROL_RESTRINGIDO}@127.0.0.1:54322/${BASE_DEDICADA}`],
    ['URL malformada', 'postgresql://%zz'],
  ])('rechaza la URL dedicada explícita fuera del límite administrativo: %s', (_caso, explicita) => {
    expect(() => resolverConexionesPrueba(explicita)).toThrow(ERROR_URL_EXPLICITA);
  });

  it('falla cerrado si se altera una configuración de conexión derivada', () => {
    const resultado = resolverConexionesPrueba(undefined, 'postgresql://postgres:postgres@127.0.0.1:54322/postgres')!;
    expect(() => configuracionAdminDedicada({ ...resultado, adminDedicadaUrl: resultado.adminUrl }))
      .toThrow('La conexión administradora no usa la base dedicada exacta');
    expect(() => configuracionSqlRepositorio({ ...resultado, runnerUrl: resultado.adminUrl }))
      .toThrow('La conexión SQL del repositorio no usa el runner restringido y la base dedicada exactos');
  });

  it('declara el corte no destructivo de las cinco tablas y conserva household_id', async () => {
    const sql = await leerMigracion();

    expect(sql).toContain('begin;');
    expect(sql).toContain('commit;');
    expect(sql).toContain('lock table public.mv_households, public.mv_household_members, public.mv_platform_roles, public.mv_vehiculos, public.mv_eventos_vehiculo in access exclusive mode;');
    expect(sql).toContain('alter table public.mv_households rename to fam_hogares;');
    expect(sql).toContain('alter table public.mv_household_members rename to fam_miembros_hogar;');
    expect(sql).toContain('alter table public.mv_platform_roles rename to fam_roles_plataforma;');
    expect(sql).toContain('alter table public.mv_vehiculos rename to fam_ve_vehiculos;');
    expect(sql).toContain('alter table public.mv_eventos_vehiculo rename to fam_ve_eventos_vehiculo;');
    expect(sql).toContain('household_id');
    expect(sql).toContain('p_household_id');
    expect(sql).not.toMatch(/\b(drop|truncate)\b/i);
  });

  it('falla cerrado ante contratos origen/final inesperados y verifica el catálogo final', async () => {
    const sql = await leerMigracion();

    expect(sql).toContain("to_regclass('public.mv_households')");
    expect(sql).toContain("to_regclass('public.fam_hogares')");
    expect(sql).toContain("raise exception 'family-app modularization preflight failed'");
    expect(sql).toContain("raise exception 'family-app modularization postcondition failed'");
    expect(sql).toContain("'fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo'");
    expect(sql).toContain("c.relname ~ '^mv_'");
    expect(sql).not.toContain("like 'mv_%'");
    expect(sql).toMatch(/n\.nspname = 'public' and c\.relkind = 'r' and c\.relrowsecurity/);
  });

  it('limita los renombres de catálogo a las cinco tablas propietarias', async () => {
    const sql = await leerMigracion();

    expect(sql).toContain('join pg_index i on i.indexrelid = c.oid');
    expect(sql.match(/t\.relname in \('fam_hogares'/g)).toHaveLength(4);
  });

  it('renombra dependencias propietarias sin crear aliases de compatibilidad', async () => {
    const sql = await leerMigracion();

    expect(sql).toContain('alter function public.mv_es_miembro(uuid) rename to fam_es_miembro_hogar;');
    expect(sql).toContain('alter function public.mv_tiene_rol(uuid, text[]) rename to fam_tiene_rol_hogar;');
    expect(sql).toContain('alter function public.mv_preservar_admin_hogar() rename to fam_preservar_admin_hogar;');
    expect(sql).toContain('alter policy mv_vehiculos_select_member on public.fam_ve_vehiculos rename to fam_ve_vehiculos_select_member;');
    expect(sql).not.toMatch(/\b(create\s+view|create\s+table\s+public\.mv_)\b/i);
  });
});

ejecutarPostgres('migración modular en PostgreSQL local efímero', () => {
  it('conserva estado, revierte fallos y no toca objetos mv_* ajenos', async () => {
    await conBaseDedicada(conexiones!, async (cliente) => {
      const [historico, migracion] = await Promise.all([
        Promise.all(rutasHistoricas.map((ruta) => readFile(ruta, 'utf8'))).then((sql) => sql.join('\n')),
        leerMigracion(),
      ]);
      const historicoEjecutable = adaptarPropietarioParaRunner(historico);
      const migracionEjecutable = adaptarPropietarioParaRunner(migracion);
      await cliente.query(`${historicoEjecutable}\n${FILAS_ADICIONALES_PRESERVACION_POST_MIGRACION}`);
      await cliente.query(`
        create table public.mv_unrelated (id integer primary key);
        create index mv_unrelated_idx on public.mv_unrelated (id);
        alter table public.mv_unrelated enable row level security;
        create policy mv_unrelated_policy on public.mv_unrelated using (true);
        create function public.unrelated_trigger() returns trigger language plpgsql as $$ begin return new; end $$;
        create trigger mv_unrelated_trigger before insert on public.mv_unrelated
          for each row execute function public.unrelated_trigger();
        alter table public.mv_eventos_vehiculo disable row level security;
      `);
      const datosAntes = await capturarDatos(cliente, false);
      expect(datosAntes.map((filas) => filas.length)).toEqual([2, 5, 1, 2, 1]);

      await expect(cliente.query(migracionEjecutable)).rejects.toThrow(/postcondition failed/);
      await cliente.query('rollback');
      expect(await capturarDatos(cliente, false)).toEqual(datosAntes);
      const rollback = await cliente.query(`select
        (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'mv_households') as source_count,
        (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'fam_hogares') as final_count`);
      expect(rollback.rows[0]).toEqual({ source_count: 1, final_count: 0 });

      await cliente.query('alter table public.mv_eventos_vehiculo enable row level security');
      await cliente.query(migracionEjecutable);
      const datosDespues = await capturarDatos(cliente, true);
      expect(datosDespues.map((filas) => filas.length)).toEqual([2, 5, 1, 2, 1]);
      expect(datosDespues).toEqual(datosAntes);
      const final = await cliente.query(`select
        (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r'
                and c.relname in ('fam_hogares', 'fam_miembros_hogar', 'fam_roles_plataforma', 'fam_ve_vehiculos', 'fam_ve_eventos_vehiculo'))::integer as final_table_count,
        (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and c.relname = 'mv_unrelated') as unrelated_table_count,
        (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'i' and c.relname = 'mv_unrelated_idx') as unrelated_index_count,
        (select count(*)::integer from pg_policy where polname = 'mv_unrelated_policy') as unrelated_policy_count,
        (select count(*)::integer from pg_trigger where tgname = 'mv_unrelated_trigger' and not tgisinternal) as unrelated_trigger_count`);
      expect(final.rows[0]).toEqual({
        final_table_count: 5,
        unrelated_table_count: 1,
        unrelated_index_count: 1,
        unrelated_policy_count: 1,
        unrelated_trigger_count: 1,
      });
    });
  });

  it('inventa el catálogo pre-corte y bloquea un contrato final conflictivo', async () => {
    await conBaseDedicada(conexiones!, async (cliente) => {
      const historico = await Promise.all(rutasHistoricas.map((ruta) => readFile(ruta, 'utf8')))
        .then((sql) => sql.join('\n'));
      await cliente.query(adaptarPropietarioParaRunner(historico));
      await cliente.query('create index mv_vehiculos_catalogo_preflight_idx on public.mv_vehiculos (marca)');

      const inventario = await inspeccionarPreflightCatalogoFamiliar(cliente);
      expect(inventario.objetosOrigen).toHaveLength(5);
      expect(inventario.objetosOrigen.map(({ nombre, propietario }) => ({ nombre, propietario }))).toEqual([
        { nombre: 'mv_eventos_vehiculo', propietario: ROL_RESTRINGIDO },
        { nombre: 'mv_household_members', propietario: ROL_RESTRINGIDO },
        { nombre: 'mv_households', propietario: ROL_RESTRINGIDO },
        { nombre: 'mv_platform_roles', propietario: ROL_RESTRINGIDO },
        { nombre: 'mv_vehiculos', propietario: ROL_RESTRINGIDO },
      ]);
      const vehiculos = inventario.objetosOrigen.find(({ nombre }) => nombre === 'mv_vehiculos')!;
      const householdId = (vehiculos.definicion as Array<{ nombre: string; tipo: string }>).find(({ nombre }) => nombre === 'household_id');
      expect(householdId).toEqual({ nombre: 'household_id', tipo: 'uuid', no_nulo: true });
      const dependenciasIndice = inventario.dependencias.filter(({ objetoDependiente }) => objetoDependiente === 'mv_vehiculos_catalogo_preflight_idx');
      expect(dependenciasIndice).toHaveLength(1);
      expect({ tablaOrigen: dependenciasIndice[0]?.tablaOrigen, tipoDependencia: dependenciasIndice[0]?.tipoDependencia, claseDependiente: dependenciasIndice[0]?.claseDependiente, claseReferencia: dependenciasIndice[0]?.claseReferencia, oidReferencia: dependenciasIndice[0]?.oidReferencia }).toEqual({ tablaOrigen: 'mv_vehiculos', tipoDependencia: 'a', claseDependiente: '1259', claseReferencia: '1259', oidReferencia: vehiculos.oid });
      expect(dependenciasIndice[0]?.definicion).toContain('CREATE INDEX');
      expect(inventario.dependencias.filter(({ tablaOrigen, tipoDependencia }) => tablaOrigen === 'mv_vehiculos' && tipoDependencia === 'i').map(({ objetoDependiente, claseDependiente, subobjetoDependiente, claseReferencia, oidReferencia, subobjetoReferencia, definicion }) => ({ objetoDependiente, claseDependiente, subobjetoDependiente, claseReferencia, oidReferencia, subobjetoReferencia, definicion }))).toEqual([
        { objetoDependiente: 'type mv_vehiculos', claseDependiente: '1247', subobjetoDependiente: '0', claseReferencia: '1259', oidReferencia: vehiculos.oid, subobjetoReferencia: '0', definicion: 'type mv_vehiculos' },
        { objetoDependiente: `pg_toast_${vehiculos.oid}`, claseDependiente: '1259', subobjetoDependiente: '0', claseReferencia: '1259', oidReferencia: vehiculos.oid, subobjetoReferencia: '0', definicion: `toast table pg_toast.pg_toast_${vehiculos.oid}` },
      ]);

      await cliente.query('create type public.fam_hogares as enum (\'conflicto\')');
      await expect(inspeccionarPreflightCatalogoFamiliar(cliente)).rejects.toThrow(/fam_hogares/);
      await cliente.query('drop type public.fam_hogares');

      await cliente.query('create table public.fam_hogares (id uuid primary key)');
      await expect(inspeccionarPreflightCatalogoFamiliar(cliente)).rejects.toThrow(/fam_hogares/);
    });
  });
});
