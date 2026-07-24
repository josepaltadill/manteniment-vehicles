import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const BASE_DEDICADA = 'family_app_modularization_test_review_da7a7c22062311e6';
const URL_BOOTSTRAP = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
const ejecutarPostgres = URL_BOOTSTRAP ? describe : describe.skip;
const rutaMigracion = new URL('../../../supabase/migrations/20260713000000_family_app_modularization.sql', import.meta.url);
const rutasHistoricas = [
  '../../../supabase/validation/auth-fixture.sql',
  '../../../supabase/migrations/20260710000000_supabase_persistence_short.sql',
  '../../../supabase/migrations/20260711000000_mv_households_nombre_unique.sql',
  '../../../supabase/migrations/20260712000000_mv_platform_roles.sql',
  '../../../supabase/validation/pre-family-app-modularization-fixtures.sql',
].map((ruta) => new URL(ruta, import.meta.url));

function validarBootstrap(url: string) {
  const origen = new URL(url);
  if (origen.protocol !== 'postgresql:'
    || origen.hostname !== '127.0.0.1'
    || origen.port !== '54322'
    || origen.pathname !== '/postgres'
    || origen.username !== 'postgres'
    || origen.password !== 'postgres'
    || origen.search !== ''
    || origen.hash !== '') {
    throw new Error('SUPABASE_BOOTSTRAP_DATABASE_URL debe apuntar al postgres local exacto');
  }
  return origen;
}

async function conBaseDedicada<T>(accion: (cliente: Client) => Promise<T>) {
  const bootstrap = validarBootstrap(URL_BOOTSTRAP!);
  const admin = new Client({ connectionString: bootstrap.toString() });
  await admin.connect();
  let cliente: Client | undefined;
  try {
    await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity
      where datname = '${BASE_DEDICADA}' and pid <> pg_backend_pid()`);
    await admin.query(`drop database if exists "${BASE_DEDICADA}"`);
    await admin.query(`create database "${BASE_DEDICADA}"`);
    const dedicada = new URL(bootstrap);
    dedicada.pathname = `/${BASE_DEDICADA}`;
    cliente = new Client({ connectionString: dedicada.toString() });
    await cliente.connect();
    return await accion(cliente);
  } finally {
    await cliente?.end();
    await admin.end();
  }
}

async function prepararHistorico(cliente: Client) {
  const [historico, migracion] = await Promise.all([
    Promise.all(rutasHistoricas.map((ruta) => readFile(ruta, 'utf8'))).then((sql) => sql.join('\n')),
    readFile(rutaMigracion, 'utf8'),
  ]);
  await cliente.query(historico);
  return migracion;
}

type ContratoVisible = 'origen-completo' | 'final-completo' | 'mezclado';

async function contratoVisible(cliente: Client): Promise<ContratoVisible> {
  const resultado = await cliente.query<{ origen: number; final: number }>(`select
    count(*) filter (where to_regclass('public.' || origen) is not null)::integer as origen,
    count(*) filter (where to_regclass('public.' || final) is not null)::integer as final
    from (values
      ('mv_households', 'fam_hogares'),
      ('mv_household_members', 'fam_miembros_hogar'),
      ('mv_platform_roles', 'fam_roles_plataforma'),
      ('mv_vehiculos', 'fam_ve_vehiculos'),
      ('mv_eventos_vehiculo', 'fam_ve_eventos_vehiculo')
    ) contratos(origen, final)`);
  const { origen, final } = resultado.rows[0];
  if (origen === 5 && final === 0) return 'origen-completo';
  if (origen === 0 && final === 5) return 'final-completo';
  return 'mezclado';
}

async function crearCliente(bootstrap: string) {
  const conexion = new URL(validarBootstrap(bootstrap));
  conexion.pathname = `/${BASE_DEDICADA}`;
  const cliente = new Client({ connectionString: conexion.toString() });
  await cliente.connect();
  return cliente;
}

async function cerrar(clientes: Client[]) {
  await Promise.all(clientes.map(async (cliente) => {
    try {
      await cliente.query('rollback');
    } catch {
      // A connection without a transaction can still be closed safely.
    }
    await cliente.end();
  }));
}

async function esperarVentanaDeRenombre(observador: Client, pidMigrador: number) {
  for (let intento = 0; intento < 40; intento += 1) {
    const resultado = await observador.query<{ activa: boolean }>(`select
      exists(select from pg_stat_activity
        where pid = $1 and state = 'active' and application_name = 'family-app-renaming-window') as activa`, [pidMigrador]);
    if (resultado.rows[0]?.activa) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('La migración no alcanzó la ventana observable después del primer renombre');
}

async function esperarPrimerosLocks(observador: Client, pidFijo: number, pidInverso: number) {
  for (let intento = 0; intento < 200; intento += 1) {
    const resultado = await observador.query<{ cantidad: number }>(`select count(*)::integer as cantidad
      from (values ($1::integer, 'public.mv_households'::regclass),
                   ($2::integer, 'public.mv_eventos_vehiculo'::regclass)) esperados(pid, relation)
      join pg_locks using (pid, relation)
      where locktype = 'relation' and mode = 'AccessExclusiveLock' and granted`, [pidFijo, pidInverso]);
    if (resultado.rows[0]?.cantidad === 2) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Los dos migradores no adquirieron su primer lock dentro del límite');
}

function migracionConOrdenDeLocks(migracion: string, orden: string[], barrera: number) {
  const bloqueoFijo = 'lock table public.mv_households, public.mv_household_members, public.mv_platform_roles, public.mv_vehiculos, public.mv_eventos_vehiculo in access exclusive mode;';
  const bloqueoInstrumentado = `lock table public.${orden[0]} in access exclusive mode;
    select pg_advisory_xact_lock(${barrera});
    lock table ${orden.slice(1).map((tabla) => `public.${tabla}`).join(', ')} in access exclusive mode;`;
  expect(migracion).toContain(bloqueoFijo);
  return migracion
    .replace("set local lock_timeout = '5s';", "set local lock_timeout = '0';")
    .replace("set local statement_timeout = '30s';", "set local statement_timeout = '0';")
    .replace(bloqueoFijo, bloqueoInstrumentado);
}

ejecutarPostgres('atomicidad observable de la migración family-app', () => {
  it('expone contrato completo a lector/escritor, evita deadlock y revierte lock_timeout', async () => {
    await conBaseDedicada(async (cliente) => {
      const migracion = await prepararHistorico(cliente);
      const bloqueo = await crearCliente(URL_BOOTSTRAP!);
      const timeout = await crearCliente(URL_BOOTSTRAP!);
      try {
        await bloqueo.query('begin; lock table public.mv_households in access exclusive mode');
        const codigo = await timeout.query(migracion).then(
          () => 'commit',
          (error: { code?: string }) => error.code,
        );
        expect(codigo).toBe('55P03');
        expect(await contratoVisible(cliente)).toBe('origen-completo');
      } finally {
        await cerrar([bloqueo, timeout]);
      }

      const lector = await crearCliente(URL_BOOTSTRAP!);
      const escritor = await crearCliente(URL_BOOTSTRAP!);
      const migradorA = await crearCliente(URL_BOOTSTRAP!);
      const migradorB = await crearCliente(URL_BOOTSTRAP!);
      const bloqueoInicial = await crearCliente(URL_BOOTSTRAP!);
      try {
        await bloqueoInicial.query('begin; lock table public.mv_households in access exclusive mode');
        const migraciones = [migradorA.query(migracion), migradorB.query(migracion)];
        await new Promise((resolve) => setTimeout(resolve, 50));
        const lectorOrigen = await contratoVisible(lector);
        await escritor.query('begin; update public.mv_vehiculos set id = id where false');
        const escritorOrigen = await contratoVisible(escritor);
        await escritor.query('commit');
        await bloqueoInicial.query('commit');

        const resultados = await Promise.allSettled(migraciones);
        const estadosMigracion = resultados.map((resultado) => {
          if (resultado.status === 'fulfilled') return 'commit';
          const codigo = (resultado.reason as { code?: string }).code;
          expect(codigo).not.toBe('40P01');
          expect(codigo).toBe('42P01');
          return 'source-gone';
        }).sort();
        const lectorFinal = await contratoVisible(lector);
        await escritor.query('begin; update public.fam_ve_vehiculos set id = id where false');
        const escritorFinal = await contratoVisible(escritor);
        await escritor.query('commit');

        expect([lectorOrigen, lectorFinal, escritorOrigen, escritorFinal]).toEqual([
          'origen-completo', 'final-completo', 'origen-completo', 'final-completo',
        ]);
        expect(estadosMigracion).toEqual(['commit', 'source-gone']);
      } finally {
        await cerrar([lector, escritor, migradorA, migradorB, bloqueoInicial]);
      }
    });
  }, 10_000);

  it('bloquea lector y escritor durante un renombre en curso sin exponer un contrato mezclado', async () => {
    await conBaseDedicada(async (cliente) => {
      const migracion = await prepararHistorico(cliente);
      const migracionConVentana = migracion.replace(
        'alter table public.mv_households rename to fam_hogares;',
        'alter table public.mv_households rename to fam_hogares; set application_name = \'family-app-renaming-window\'; select pg_sleep(0.25);',
      );
      const observador = await crearCliente(URL_BOOTSTRAP!);
      const lector = await crearCliente(URL_BOOTSTRAP!);
      const escritor = await crearCliente(URL_BOOTSTRAP!);
      const migrador = await crearCliente(URL_BOOTSTRAP!);
      try {
        const pidMigrador = (await migrador.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0].pid;
        const ejecucion = migrador.query(migracionConVentana);
        await esperarVentanaDeRenombre(observador, pidMigrador);

        const lectura = lector.query("set lock_timeout = '50ms'; select count(*) from public.mv_vehiculos").then(
          () => 'completo',
          (error: { code?: string }) => error.code,
        );
        const escritura = escritor.query("begin; set local lock_timeout = '50ms'; update public.mv_vehiculos set id = id where false").then(
          () => 'completo',
          (error: { code?: string }) => error.code,
        );
        expect(await Promise.all([lectura, escritura])).toEqual(['55P03', '55P03']);
        expect(await contratoVisible(observador)).toBe('origen-completo');

        await ejecucion;
        expect(await contratoVisible(observador)).toBe('final-completo');
      } finally {
        await cerrar([observador, lector, escritor, migrador]);
      }
    });
  }, 10_000);

  it('es sensible a órdenes de lock variados y confirma que una regresión inversa produce deadlock', async () => {
    await conBaseDedicada(async (cliente) => {
      const migracion = await prepararHistorico(cliente);
      const ordenFijo = ['mv_households', 'mv_household_members', 'mv_platform_roles', 'mv_vehiculos', 'mv_eventos_vehiculo'];
      const ordenInverso = [...ordenFijo].reverse();
      const migracionFija = migracionConOrdenDeLocks(migracion, ordenFijo, 73_001);
      const migracionInversa = migracionConOrdenDeLocks(migracion, ordenInverso, 73_002);
      const migradorFijo = await crearCliente(URL_BOOTSTRAP!);
      const migradorInverso = await crearCliente(URL_BOOTSTRAP!);
      try {
        const [pidFijo, pidInverso] = await Promise.all([migradorFijo, migradorInverso]
          .map(async (migrador) => (await migrador.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0].pid));
        await cliente.query('begin; select pg_advisory_xact_lock(73001); select pg_advisory_xact_lock(73002)');
        const ejecucionFija = migradorFijo.query(migracionFija).then(
          () => 'commit',
          (error: { code?: string }) => error.code,
        );
        const ejecucionInversa = migradorInverso.query(migracionInversa).then(
          () => 'commit',
          (error: { code?: string }) => error.code,
        );
        await esperarPrimerosLocks(cliente, pidFijo, pidInverso);
        await cliente.query('commit');
        const codigos = await Promise.all([ejecucionFija, ejecucionInversa]);

        expect(codigos.filter((codigo) => codigo === '40P01')).toHaveLength(1);
        expect(codigos.filter((codigo) => codigo === 'commit')).toHaveLength(1);
        expect(await contratoVisible(cliente)).toBe('final-completo');
      } finally {
        await cliente.query('rollback');
        await cerrar([migradorFijo, migradorInverso]);
      }
    });
  }, 10_000);

  it('aplica statement_timeout dentro de la migración y revierte sus renombres', async () => {
    await conBaseDedicada(async (cliente) => {
      const migracion = await prepararHistorico(cliente);
      const migracionConTimeoutBreve = migracion
        .replace("set local statement_timeout = '30s';", "set local statement_timeout = '50ms';")
        .replace(
          'alter table public.mv_households rename to fam_hogares;',
          'alter table public.mv_households rename to fam_hogares; select pg_sleep(0.1);',
        );

      const codigo = await cliente.query(migracionConTimeoutBreve).then(
        () => 'commit',
        (error: { code?: string }) => error.code,
      );
      expect(codigo).toBe('57014');
      await cliente.query('rollback');
      expect(await contratoVisible(cliente)).toBe('origen-completo');
    });
  });
});
