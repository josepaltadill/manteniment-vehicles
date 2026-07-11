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

  it('depende de que GoTrue siga teniendo el índice único parcial users_email_partial_key', async () => {
    const conexion = await obtenerCliente();

    // Canary explícito del esquema interno del que crearUsuario depende:
    // `on conflict (email) where is_sso_user = false` solo resuelve
    // conflictos si este índice existe con esta definición exacta. Si una
    // futura versión de GoTrue lo renombra/cambia, este test falla con un
    // mensaje directo en vez de que el fallo aparezca como un misterioso
    // "no unique or exclusion constraint matching" dentro de crearUsuario.
    const indices = await conexion.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where schemaname = 'auth' and tablename = 'users' and indexname = 'users_email_partial_key'`,
    );

    expect(indices.rows).toHaveLength(1);
    expect(indices.rows[0]?.indexdef).toMatch(/unique index users_email_partial_key on auth\.users using btree \(email\)/i);
    expect(indices.rows[0]?.indexdef).toMatch(/where \(is_sso_user = false\)/i);
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

  it('crearHogar acepta nombres con metacaracteres de SQL sin corromper la query (parametrizado)', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const nombreConMetacaracteres = `Hogar' OR '1'='1'; DROP TABLE mv_households; -- ${randomUUID()}`;

    const hogar = await operaciones.crearHogar(nombreConMetacaracteres);
    try {
      const encontrado = await operaciones.buscarHogarPorNombre(nombreConMetacaracteres);
      const filas = await conexion.query('select nombre from public.mv_households where id = $1', [hogar.id]);

      // Si el valor se concatenara en vez de parametrizarse, este nombre
      // rompería la query (sintaxis inválida) o ejecutaría SQL arbitrario en
      // vez de guardarse tal cual. Que se guarde y se recupere byte a byte
      // demuestra que viajó como parámetro, no como texto interpolado.
      expect(encontrado?.id).toBe(hogar.id);
      expect(filas.rows).toEqual([{ nombre: nombreConMetacaracteres }]);
    } finally {
      await conexion.query('delete from public.mv_households where id = $1', [hogar.id]);
    }
  });

  it('crearUsuario resuelve un email duplicado en vez de crear una segunda fila', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const email = `bootstrap-usuario-duplicado-${randomUUID()}@ejemplo.local`;

    const primero = await operaciones.crearUsuario(email, 'password-local-de-prueba');
    try {
      const segundo = await operaciones.crearUsuario(email, 'otra-password-distinta');
      const filas = await conexion.query('select id from auth.users where email = $1', [email]);

      expect(segundo.id).toBe(primero.id);
      expect(filas.rows).toHaveLength(1);
    } finally {
      await conexion.query('delete from auth.users where id = $1', [primero.id]);
    }
  });

  it('crearMembresiaAdmin es idempotente: invocarla dos veces no falla ni duplica la fila', async () => {
    const conexion = await obtenerCliente();
    const operaciones = new OperacionesBootstrapPostgres({ query: conexion.query.bind(conexion) });
    const sufijo = randomUUID();
    const usuario = await operaciones.crearUsuario(`bootstrap-membresia-${sufijo}@ejemplo.local`, 'password-local-de-prueba');
    const hogar = await operaciones.crearHogar(`Hogar membresía ${sufijo}`);

    try {
      await operaciones.crearMembresiaAdmin(hogar.id, usuario.id);
      await expect(operaciones.crearMembresiaAdmin(hogar.id, usuario.id)).resolves.toBeUndefined();

      const filas = await conexion.query(
        'select rol from public.mv_household_members where household_id = $1 and user_id = $2',
        [hogar.id, usuario.id],
      );
      expect(filas.rows).toEqual([{ rol: 'admin' }]);
    } finally {
      // Borrar el hogar primero (cascada a la membresía): el trigger de último
      // admin solo bloquea un delete directo de la membresía mientras el hogar
      // sigue existiendo, no la cascada de borrar el hogar completo.
      await conexion.query('delete from public.mv_households where id = $1', [hogar.id]);
      await conexion.query('delete from auth.users where id = $1', [usuario.id]);
    }
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
    const filaAlmacenada = await conexion.query<{ nombre: string }>(
      'select nombre from public.mv_households where id = $1',
      [primero.id],
    );

    expect(segundo.id).toBe(primero.id);
    expect(encontradoPorVariante?.id).toBe(primero.id);
    expect(conteo).toBe(1);
    // El conflicto con la variante NO debe reescribir el nombre canónico ya
    // guardado: `do update set nombre = mv_households.nombre` debe conservar
    // el nombre original, no adoptar el de la variante entrante.
    expect(filaAlmacenada.rows).toEqual([{ nombre: nombreOriginal }]);

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
