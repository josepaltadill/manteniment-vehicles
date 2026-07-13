// Lectura y validación de variables de entorno para el adaptador Supabase de servidor.
//
// Deliberadamente NO se usan nombres `NEXT_PUBLIC_*`: ninguna de estas variables debe
// llegar al bundle de cliente. El acceso a datos de aplicación (`mv_vehiculos`,
// `mv_eventos_vehiculo`) solo ocurre desde servidor (ver diseño §6.2/§7.2 y tarea 9).
export type EntornoSupabase = Readonly<{
  url: string;
  anonKey: string;
  bootstrapEmail: string;
  bootstrapPassword: string;
  bootstrapHouseholdNombre: string;
}>;

export type EntornoRuntimeSupabase = Readonly<{ url: string; anonKey: string }>;

const VARIABLES_RUNTIME = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

const VARIABLES_OBLIGATORIAS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_BOOTSTRAP_EMAIL',
  'SUPABASE_BOOTSTRAP_PASSWORD',
  'SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE',
] as const;

export function leerEntornoRuntimeSupabase(
  fuente: Record<string, string | undefined> = process.env,
): EntornoRuntimeSupabase {
  const valores = Object.fromEntries(
    VARIABLES_RUNTIME.map((nombre) => [nombre, requerirVariable(fuente, nombre)]),
  );

  return { url: valores.SUPABASE_URL!, anonKey: valores.SUPABASE_ANON_KEY! };
}

export function leerEntornoSupabase(
  fuente: Record<string, string | undefined> = process.env,
): EntornoSupabase {
  const valores = Object.fromEntries(
    VARIABLES_OBLIGATORIAS.map((nombre) => [nombre, requerirVariable(fuente, nombre)]),
  );

  return {
    url: valores.SUPABASE_URL!,
    anonKey: valores.SUPABASE_ANON_KEY!,
    bootstrapEmail: valores.SUPABASE_BOOTSTRAP_EMAIL!,
    bootstrapPassword: valores.SUPABASE_BOOTSTRAP_PASSWORD!,
    bootstrapHouseholdNombre: valores.SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE!,
  };
}

function requerirVariable(fuente: Record<string, string | undefined>, nombre: string): string {
  if (nombre.startsWith('NEXT_PUBLIC_')) {
    throw new Error(
      `${nombre} no puede usarse para datos de aplicación: se expondría al cliente.`,
    );
  }

  const valor = fuente[nombre];

  if (!valor || valor.trim().length === 0) {
    throw new Error(`Falta la variable de entorno obligatoria ${nombre}.`);
  }

  return valor;
}
