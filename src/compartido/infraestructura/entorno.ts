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
  // UUID real de `mv_households.id` devuelto por `sembrarHogarDeDesarrollo` (ver
  // diseño §15.7 y `bootstrap-servidor.ts`). La composición de servidor (PR3) lo
  // usa para construir un `ProveedorIdentidad` temporal que sí es válido contra el
  // esquema real (columna `uuid`), sin resolver auth real en este PR.
  householdIdDesarrollo: string;
}>;

const VARIABLES_OBLIGATORIAS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_BOOTSTRAP_EMAIL',
  'SUPABASE_BOOTSTRAP_PASSWORD',
  'SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE',
  'SUPABASE_HOUSEHOLD_ID_DESARROLLO',
] as const;

// `mv_households.id` es una columna `uuid` de Postgres: un valor mal
// configurado debe fallar aquí, con un mensaje claro, en lugar de aparecer más
// tarde como un "invalid input syntax for type uuid" críptico en la primera
// consulta real contra Supabase.
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function leerEntornoSupabase(
  fuente: Record<string, string | undefined> = process.env,
): EntornoSupabase {
  const valores = Object.fromEntries(
    VARIABLES_OBLIGATORIAS.map((nombre) => [nombre, requerirVariable(fuente, nombre)]),
  );

  requerirUuid('SUPABASE_HOUSEHOLD_ID_DESARROLLO', valores.SUPABASE_HOUSEHOLD_ID_DESARROLLO!);

  return {
    url: valores.SUPABASE_URL!,
    anonKey: valores.SUPABASE_ANON_KEY!,
    bootstrapEmail: valores.SUPABASE_BOOTSTRAP_EMAIL!,
    bootstrapPassword: valores.SUPABASE_BOOTSTRAP_PASSWORD!,
    bootstrapHouseholdNombre: valores.SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE!,
    householdIdDesarrollo: valores.SUPABASE_HOUSEHOLD_ID_DESARROLLO!,
  };
}

function requerirUuid(nombre: string, valor: string): void {
  if (!PATRON_UUID.test(valor)) {
    throw new Error(`${nombre} debe ser un UUID válido (recibido: "${valor}").`);
  }
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
