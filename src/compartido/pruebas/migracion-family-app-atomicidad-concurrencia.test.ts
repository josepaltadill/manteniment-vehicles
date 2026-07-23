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
