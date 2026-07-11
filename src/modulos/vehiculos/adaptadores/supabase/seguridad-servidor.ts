// Guardas de seguridad estáticas para la frontera servidor/RLS (tarea 9).
//
// Estas funciones implementan, en código ejecutable, dos reglas obligatorias
// del diseño y de `supabase/migrations/README.md`:
// 1. Ningún componente cliente (`'use client'`) puede importar un adaptador
//    Supabase de datos de app (`adaptadores/supabase/*`); el acceso a
//    `mv_vehiculos`/`mv_eventos_vehiculo` es exclusivamente de servidor.
// 2. Ninguna clave privilegiada (`service_role`) puede aparecer como patrón de
//    variable de entorno en código de producción.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const DIRECTORIOS_IGNORADOS = new Set(['node_modules', '.next']);
const EXTENSIONES_FUENTE = new Set(['.ts', '.tsx']);

export function listarArchivosFuente(directorioRaiz: string): string[] {
  const entradas = readdirSync(directorioRaiz);
  const archivos: string[] = [];

  for (const entrada of entradas) {
    if (DIRECTORIOS_IGNORADOS.has(entrada)) {
      continue;
    }

    const rutaCompleta = join(directorioRaiz, entrada);
    const info = statSync(rutaCompleta);

    if (info.isDirectory()) {
      archivos.push(...listarArchivosFuente(rutaCompleta));
    } else if (EXTENSIONES_FUENTE.has(extname(rutaCompleta))) {
      archivos.push(rutaCompleta);
    }
  }

  return archivos;
}

export type ImportClienteIndebido = Readonly<{ archivo: string; especificador: string }>;

const DIRECTIVA_USE_CLIENT = /^\s*['"]use client['"];?\s*$/m;
const IMPORT_ESPECIFICADOR = /from\s+['"]([^'"]+)['"]/g;

export function detectarImportsClienteIndebidosEnContenido(
  archivo: string,
  contenido: string,
): ImportClienteIndebido[] {
  if (!DIRECTIVA_USE_CLIENT.test(contenido)) {
    return [];
  }

  const hallazgos: ImportClienteIndebido[] = [];

  for (const coincidencia of contenido.matchAll(IMPORT_ESPECIFICADOR)) {
    const especificador = coincidencia[1] ?? '';

    if (especificador.includes('adaptadores/supabase')) {
      hallazgos.push({ archivo, especificador });
    }
  }

  return hallazgos;
}

export function detectarImportsClienteIndebidosEnRepositorio(
  archivos: readonly string[],
): ImportClienteIndebido[] {
  return archivos.flatMap((archivo) =>
    detectarImportsClienteIndebidosEnContenido(archivo, readFileSync(archivo, 'utf8')),
  );
}

const PATRON_CLAVE_PRIVILEGIADA = /service_role_key|supabase_service_role/i;

export function contieneClavePrivilegiada(contenido: string): boolean {
  return PATRON_CLAVE_PRIVILEGIADA.test(contenido);
}

// Módulos que bypassean RLS a propósito (sembrado administrativo). Deben
// declarar `import 'server-only'` como defensa en profundidad además del
// comentario JSDoc: el comentario no falla el build si alguien los importa
// desde un componente cliente o Server Action sin chequeo propio.
const MODULOS_BOOTSTRAP_ADMIN = ['operaciones-bootstrap-postgres.ts', 'bootstrap-servidor.ts'];
const IMPORT_SERVER_ONLY = /^\s*import\s+['"]server-only['"];?\s*$/m;

export function detectarModulosBootstrapSinServerOnly(archivos: readonly string[]): string[] {
  return archivos
    .filter((archivo) => MODULOS_BOOTSTRAP_ADMIN.some((nombre) => archivo.endsWith(nombre)))
    .filter((archivo) => !IMPORT_SERVER_ONLY.test(readFileSync(archivo, 'utf8')));
}

// `server-only` (arriba) no protege contra un import desde una Server Action u
// otra ruta de servidor: comparten el mismo grafo de compilación donde ese
// paquete es un no-op. Esta allowlist es el chequeo real de "quién puede
// importar el bootstrap administrativo": si aparece un importador no listado,
// falla en vez de depender de que nadie lo importe mal por accidente.
const IMPORTADORES_PERMITIDOS_DE_BOOTSTRAP = new Set([
  'operaciones-bootstrap-postgres.ts', // usa bootstrap-servidor.ts internamente
  'bootstrap-admin.ts', // scripts/bootstrap-admin.ts: el único runner real (issue #8)
]);

function especificadoresBootstrap(contenido: string): string[] {
  const especificadores: string[] = [];
  for (const coincidencia of contenido.matchAll(IMPORT_ESPECIFICADOR)) {
    especificadores.push(coincidencia[1] ?? '');
  }
  return especificadores;
}

function importaModuloBootstrap(especificadores: readonly string[]): boolean {
  return especificadores.some(
    (especificador) =>
      especificador.endsWith('operaciones-bootstrap-postgres') || especificador.endsWith('/bootstrap-servidor'),
  );
}

export function detectarImportadorNoPermitidoDeBootstrap(archivo: string, contenido: string): boolean {
  const nombreArchivo = archivo.split('/').pop() ?? archivo;
  if (IMPORTADORES_PERMITIDOS_DE_BOOTSTRAP.has(nombreArchivo)) return false;
  if (MODULOS_BOOTSTRAP_ADMIN.some((nombre) => archivo.endsWith(nombre))) return false;

  return importaModuloBootstrap(especificadoresBootstrap(contenido));
}

export function detectarImportadoresNoPermitidosDeBootstrap(archivos: readonly string[]): string[] {
  return archivos.filter((archivo) => detectarImportadorNoPermitidoDeBootstrap(archivo, readFileSync(archivo, 'utf8')));
}
