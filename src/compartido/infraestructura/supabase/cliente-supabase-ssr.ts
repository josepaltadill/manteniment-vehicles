import 'server-only';

import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export type EntornoRuntimeSupabase = Readonly<{
  url: string;
  anonKey: string;
}>;

export type ClienteSupabaseSsr = SupabaseClient;

export function crearClienteSupabaseSsrPorSolicitud(
  entorno: EntornoRuntimeSupabase,
  cookies: CookieMethodsServer,
): ClienteSupabaseSsr {
  return createServerClient(entorno.url, entorno.anonKey, { cookies });
}
