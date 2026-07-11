import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  ejecutarBootstrapPostgresDesdeEntorno,
  OperacionesBootstrapPostgres,
} from './operaciones-bootstrap-postgres';

const databaseUrl = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
const ejecutar = databaseUrl ? describe : describe.skip;
let cliente: Client | undefined;
let householdId: string | undefined;
let userId: string | undefined;

async function obtenerCliente(): Promise<Client> {
  if (!cliente) {
    cliente = new Client({ connectionString: databaseUrl });
    await cliente.connect();
  }
  return cliente;
}

ejecutar('OperacionesBootstrapPostgres (Postgres local)', () => {
  afterAll(async () => {
    const conexion = await obtenerCliente();
    if (householdId) await conexion.query('delete from public.mv_households where id = $1', [householdId]);
    if (userId) await conexion.query('delete from auth.users where id = $1', [userId]);
    await conexion.end();
  });

  it('siembra idempotentemente usuario, hogar y membresía admin con ids reales', async () => {
    const sufijo = randomUUID();
    const entorno = {
      SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
      SUPABASE_BOOTSTRAP_EMAIL: `bootstrap-${sufijo}@ejemplo.local`,
      SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
      SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: `Hogar bootstrap ${sufijo}`,
    };

    const primera = await ejecutarBootstrapPostgresDesdeEntorno(entorno);
    householdId = primera.householdId.valor;
    userId = primera.userId.valor;
    const segunda = await ejecutarBootstrapPostgresDesdeEntorno(entorno);
    const membresias = await (await obtenerCliente()).query<{ rol: string }>(
      'select rol from public.mv_household_members where household_id = $1 and user_id = $2',
      [householdId, userId],
    );

    expect(segunda).toEqual(primera);
    expect(membresias.rows).toEqual([{ rol: 'admin' }]);
  });

  it('crearHogar resuelve un nombre duplicado mediante la restricción única en vez de crear una segunda fila', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const nombre = `Hogar duplicado ${randomUUID()}`;

    const primero = await operaciones.crearHogar(nombre);
    const segundo = await operaciones.crearHogar(nombre);
    const conteo = await operaciones.contarHogaresPorNombre(nombre);

    expect(segundo.id).toBe(primero.id);
    expect(conteo).toBe(1);

    await conexion.query('delete from public.mv_households where id = $1', [primero.id]);
  });

  it('crearHogar resuelve variantes de mayúsculas/espacios como el mismo hogar', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const sufijo = randomUUID();
    const nombreOriginal = `Hogar Variante ${sufijo}`;
    const nombreVariante = `  hogar variante ${sufijo}  `.toUpperCase();

    const primero = await operaciones.crearHogar(nombreOriginal);
    const segundo = await operaciones.crearHogar(nombreVariante);
    const encontradoPorVariante = await operaciones.buscarHogarPorNombre(nombreVariante);
    const conteo = await operaciones.contarHogaresPorNombre(nombreVariante);

    expect(segundo.id).toBe(primero.id);
    expect(encontradoPorVariante?.id).toBe(primero.id);
    expect(conteo).toBe(1);

    await conexion.query('delete from public.mv_households where id = $1', [primero.id]);
  });

  it('falla explícito en vez de sobrescribir una membresía existente con rol distinto de admin', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const sufijo = randomUUID();
    const email = `bootstrap-rol-${sufijo}@ejemplo.local`;
    const nombreHogar = `Hogar rol ${sufijo}`;

    const usuario = await operaciones.crearUsuario(email, 'password-local-de-prueba');
    const hogar = await operaciones.crearHogar(nombreHogar);
    await conexion.query(
      `insert into public.mv_household_members (household_id, user_id, rol) values ($1, $2, 'editor')`,
      [hogar.id, usuario.id],
    );

    try {
      await expect(
        ejecutarBootstrapPostgresDesdeEntorno({
          SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
          SUPABASE_BOOTSTRAP_EMAIL: email,
          SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
          SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: nombreHogar,
        }),
      ).rejects.toThrow(/rol "editor"/);

      const membresias = await conexion.query<{ rol: string }>(
        'select rol from public.mv_household_members where household_id = $1 and user_id = $2',
        [hogar.id, usuario.id],
      );
      expect(membresias.rows).toEqual([{ rol: 'editor' }]);
    } finally {
      await conexion.query(
        'delete from public.mv_household_members where household_id = $1 and user_id = $2',
        [hogar.id, usuario.id],
      );
      await conexion.query('delete from public.mv_households where id = $1', [hogar.id]);
      await conexion.query('delete from auth.users where id = $1', [usuario.id]);
    }
  });
});
