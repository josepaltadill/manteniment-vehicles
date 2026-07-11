import 'server-only';
import { esRolUsuario, type RolUsuario } from '../../dominio/rol-usuario';
import {
  sembrarHogarDeDesarrollo,
  type EntradaBootstrap,
  type OperacionesBootstrap,
} from './bootstrap-servidor';

/** Cliente mínimo para aislar el acceso administrativo de Postgres en pruebas. */
export type ClientePostgresBootstrap = Readonly<{
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    valores?: readonly unknown[],
  ): Promise<{ rows: T[] }>;
  cerrar?(): Promise<void>;
}>;

type FilaId = Readonly<{ id: string }>;
type FilaCantidad = Readonly<{ cantidad: string | number }>;
type FilaMembresia = Readonly<{ rol: string }>;

// btrim(nombre) de un solo argumento solo recorta el carácter espacio; un
// nombre con un tab o salto de línea al final no se reconocería como
// duplicado de la variante con espacio normal. Este set de caracteres debe
// coincidir exactamente con el del índice único en
// supabase/migrations/20260711000000_mv_households_nombre_unique.sql.
const CARACTERES_ESPACIO_SQL = "E' \\t\\n\\r'";

/**
 * Implementación administrativa y server-only del puerto de bootstrap.
 *
 * Nunca debe importarse desde componentes, rutas cliente o acciones de producto. Su
 * conexión PostgreSQL tiene privilegios administrativos porque debe sembrar el primer
 * usuario y la primera membresía, operaciones que RLS bloquea deliberadamente.
 *
 * El `import 'server-only'` de arriba solo hace fallar el build si este módulo se
 * bundlea para un Client Component; no impide que una Server Action u otra ruta de
 * servidor lo importe indebidamente, ya que ambas comparten el mismo grafo de
 * compilación server-side. Ver issue de seguimiento sobre limitar quién puede
 * importar este módulo.
 */
export class OperacionesBootstrapPostgres implements OperacionesBootstrap {
  constructor(private readonly cliente: ClientePostgresBootstrap) {}

  async buscarUsuarioPorEmail(email: string): Promise<FilaId | null> {
    return primeraFila<FilaId>(
      this.cliente.query('select id from auth.users where email = $1 limit 1', [email]),
    );
  }

  async crearUsuario(email: string, password: string): Promise<FilaId> {
    const usuario = await primeraFila<FilaId>(
      this.cliente.query(
        `insert into auth.users (
           instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
           raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
           confirmation_token, recovery_token, email_change_token_new, email_change
         ) values (
           '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
           $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
           '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
         )
         on conflict (email) where is_sso_user = false do update set email = excluded.email
         returning id`,
        [email, password],
      ),
    );

    if (!usuario) throw new Error('No se pudo crear ni recuperar el usuario de bootstrap.');
    return usuario;
  }

  async buscarHogarPorNombre(nombre: string): Promise<FilaId | null> {
    return primeraFila<FilaId>(
      this.cliente.query(
        `select id from public.mv_households
         where lower(btrim(nombre, ${CARACTERES_ESPACIO_SQL})) = lower(btrim($1, ${CARACTERES_ESPACIO_SQL}))
         limit 1`,
        [nombre],
      ),
    );
  }

  async crearHogar(nombre: string): Promise<FilaId> {
    const hogar = await primeraFila<FilaId>(
      this.cliente.query(
        `insert into public.mv_households (nombre)
         values ($1)
         on conflict (lower(btrim(nombre, ${CARACTERES_ESPACIO_SQL})))
         do update set nombre = mv_households.nombre
         returning id`,
        [nombre.trim()],
      ),
    );

    if (!hogar) throw new Error('No se pudo crear ni recuperar el hogar de bootstrap.');
    return hogar;
  }

  async contarHogaresPorNombre(nombre: string): Promise<number> {
    const fila = await primeraFila<FilaCantidad>(
      this.cliente.query(
        `select count(*)::text as cantidad from public.mv_households
         where lower(btrim(nombre, ${CARACTERES_ESPACIO_SQL})) = lower(btrim($1, ${CARACTERES_ESPACIO_SQL}))`,
        [nombre],
      ),
    );
    return Number(fila?.cantidad ?? 0);
  }

  async buscarMembresia(householdId: string, userId: string): Promise<{ rol: RolUsuario } | null> {
    const fila = await primeraFila<FilaMembresia>(
      this.cliente.query(
        `select rol from public.mv_household_members
         where household_id = $1 and user_id = $2 limit 1`,
        [householdId, userId],
      ),
    );

    if (!fila) return null;
    if (!esRolUsuario(fila.rol)) {
      throw new Error(`Rol de membresía desconocido: ${fila.rol}`);
    }
    return { rol: fila.rol };
  }

  async crearMembresiaAdmin(householdId: string, userId: string): Promise<void> {
    await this.cliente.query(
      `insert into public.mv_household_members (household_id, user_id, rol)
       values ($1, $2, 'admin')
       on conflict (household_id, user_id) do nothing`,
      [householdId, userId],
    );
  }

  async cerrar(): Promise<void> {
    await this.cliente.cerrar?.();
  }
}

const CONNECTION_TIMEOUT_MS_DEFECTO = 5_000;
const CIERRE_TIMEOUT_MS_DEFECTO = 5_000;
const INTENTOS_CONEXION_DEFECTO = 3;
const BACKOFF_BASE_MS_DEFECTO = 200;

export type OpcionesConexionBootstrap = Readonly<{
  connectionTimeoutMillis?: number;
  cierreTimeoutMillis?: number;
  intentosConexion?: number;
  backoffBaseMs?: number;
}>;

type OpcionesReintento = Readonly<{
  esReintentable?: (error: unknown) => boolean;
  alReintentar?: (intento: number, error: unknown) => void;
}>;

/**
 * Reintenta `intentar` hasta `intentos` veces con backoff lineal creciente
 * (`backoffBaseMs * intento` entre cada reintento). Sin `esReintentable`
 * reintenta cualquier error; pásala para limitar los reintentos a errores
 * realmente transitorios (ver `esErrorTransitorioDeConexion`). Solo debe
 * usarse para operaciones idempotentes como abrir una conexión nueva, nunca
 * para lógica de negocio no idempotente.
 */
export async function conectarConReintentos<T>(
  intentar: () => Promise<T>,
  intentos: number,
  backoffBaseMs: number,
  opciones: OpcionesReintento = {},
): Promise<T> {
  const esReintentable = opciones.esReintentable ?? (() => true);

  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      return await intentar();
    } catch (error) {
      const quedanIntentos = intento < intentos;
      if (!quedanIntentos || !esReintentable(error)) {
        throw error;
      }
      opciones.alReintentar?.(intento, error);
      await esperar(backoffBaseMs * intento);
    }
  }

  throw new Error('conectarConReintentos: estado inalcanzable.');
}

const CODIGOS_ERROR_TRANSITORIO_DE_RED = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
]);

/**
 * Distingue errores de red transitorios (red caída, timeout, reset) —
 * seguros de reintentar — de errores deterministas como credenciales
 * inválidas o un nombre de base inexistente (código SQLSTATE de Postgres,
 * p. ej. `28P01`), que reintentar solo demora el diagnóstico y repite
 * intentos de autenticación fallidos contra la base administrativa.
 */
export function esErrorTransitorioDeConexion(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const codigo = (error as { code?: unknown }).code;
  return typeof codigo === 'string' && CODIGOS_ERROR_TRANSITORIO_DE_RED.has(codigo);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cierra `cliente` con un límite de tiempo: `Client.end()` de `pg` no tiene
 * timeout propio (a diferencia de `connect()`) y puede colgarse si la
 * conexión ya está en mal estado. Si no confirma el cierre a tiempo, lanza
 * en vez de esperar indefinidamente; el llamador decide cómo proceder (ver
 * el catch en `ejecutarBootstrapPostgresDesdeEntorno`, que ya loguea fallos
 * de cierre sin enmascarar el error original de siembra).
 */
async function cerrarConLimiteDeTiempo(cliente: { end(): Promise<void> }, timeoutMs: number): Promise<void> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    temporizador = setTimeout(() => {
      reject(new Error(`No se confirmó el cierre de la conexión administrativa dentro de ${timeoutMs}ms.`));
    }, timeoutMs);
    temporizador.unref?.();
  });

  try {
    await Promise.race([cliente.end(), timeout]);
  } finally {
    clearTimeout(temporizador);
  }
}

/** Crea el adaptador real para scripts server-only; no acepta variables públicas. */
export async function crearOperacionesBootstrapPostgres(
  databaseUrl: string,
  opciones: OpcionesConexionBootstrap = {},
): Promise<OperacionesBootstrapPostgres> {
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    throw new Error('Se requiere una URL PostgreSQL administrativa para el bootstrap.');
  }

  const {
    connectionTimeoutMillis = CONNECTION_TIMEOUT_MS_DEFECTO,
    cierreTimeoutMillis = CIERRE_TIMEOUT_MS_DEFECTO,
    intentosConexion = INTENTOS_CONEXION_DEFECTO,
    backoffBaseMs = BACKOFF_BASE_MS_DEFECTO,
  } = opciones;

  const { Client } = await import('pg');
  const cliente = await conectarConReintentos(
    async () => {
      const nuevoCliente = new Client({ connectionString: databaseUrl, connectionTimeoutMillis });
      await nuevoCliente.connect();
      return nuevoCliente;
    },
    intentosConexion,
    backoffBaseMs,
    {
      esReintentable: esErrorTransitorioDeConexion,
      alReintentar: (intento, error) => {
        const mensaje = error instanceof Error ? error.message : String(error);
        console.warn(`Intento de conexión administrativa ${intento} falló, reintentando: ${mensaje}`);
      },
    },
  );

  return new OperacionesBootstrapPostgres({
    query: cliente.query.bind(cliente),
    cerrar: () => cerrarConLimiteDeTiempo(cliente, cierreTimeoutMillis),
  });
}

type EntornoBootstrapPostgres = Readonly<Record<string, string | undefined>>;
type OperacionesBootstrapCerrables = OperacionesBootstrap & Readonly<{ cerrar(): Promise<void> }>;
type DependenciasBootstrapPostgres = Readonly<{
  crearOperaciones(databaseUrl: string): Promise<OperacionesBootstrapCerrables>;
  sembrar: typeof sembrarHogarDeDesarrollo;
}>;

/**
 * Punto de entrada operativo server-only para la siembra administrativa.
 *
 * Lee exclusivamente variables privadas del proceso y garantiza que la conexión
 * privilegiada se cierre tanto si la siembra termina como si falla.
 */
export async function ejecutarBootstrapPostgresDesdeEntorno(
  entorno: EntornoBootstrapPostgres = process.env,
  dependencias: DependenciasBootstrapPostgres = {
    crearOperaciones: crearOperacionesBootstrapPostgres,
    sembrar: sembrarHogarDeDesarrollo,
  },
) {
  const databaseUrl = exigirVariablePrivada(entorno, 'SUPABASE_BOOTSTRAP_DATABASE_URL');
  const entrada: EntradaBootstrap = {
    bootstrapEmail: exigirVariablePrivada(entorno, 'SUPABASE_BOOTSTRAP_EMAIL'),
    bootstrapPassword: exigirVariablePrivada(entorno, 'SUPABASE_BOOTSTRAP_PASSWORD'),
    bootstrapHouseholdNombre: exigirVariablePrivada(
      entorno,
      'SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE',
    ),
  };
  const operaciones = await dependencias.crearOperaciones(databaseUrl);

  let resultado: Awaited<ReturnType<typeof dependencias.sembrar>>;
  try {
    resultado = await dependencias.sembrar(operaciones, entrada);
  } catch (errorSiembra) {
    try {
      await operaciones.cerrar();
    } catch (errorCierre) {
      console.error(
        'Fallo al cerrar la conexión administrativa de bootstrap tras un error de siembra.',
        { errorSiembra, errorCierre },
      );
    }
    throw errorSiembra;
  }

  await operaciones.cerrar();
  return resultado;
}

function exigirVariablePrivada(entorno: EntornoBootstrapPostgres, nombre: string): string {
  const valor = entorno[nombre];
  if (!valor || valor.trim().length === 0) {
    throw new Error(`Falta la variable privada obligatoria ${nombre}.`);
  }
  return valor;
}

async function primeraFila<T>(resultado: Promise<{ rows: T[] }>): Promise<T | null> {
  return (await resultado).rows[0] ?? null;
}
