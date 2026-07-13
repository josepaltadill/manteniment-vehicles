import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { leerEntornoRuntimeSupabase } from '../../compartido/infraestructura/entorno';
import { crearClienteSupabaseSsrPorSolicitud } from '../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import { esFalloIdentidadTransitorio } from '../../compartido/infraestructura/supabase/rutas-protegidas';

type ClienteAutenticacion = Readonly<{
  auth: {
    signInWithPassword: (credenciales: { email: string; password: string }) => Promise<{ error: unknown }>;
    getUser: () => Promise<{ data: { user: unknown | null }; error: unknown }>;
    signOut: () => Promise<unknown>;
  };
}>;

export function destinoSiguienteSeguro(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/vehiculos';
  if (next === '/' || next === '/login' || next === '/acceso-no-disponible') return '/vehiculos';
  return next === '/vehiculos' || next.startsWith('/vehiculos/') ? next : '/vehiculos';
}

export async function autenticarCredenciales(
  cliente: ClienteAutenticacion,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; tipo: 'credenciales' | 'no-disponible' }> {
  const inicio = await cliente.auth.signInWithPassword({ email, password });
  if (inicio.error) {
    return { ok: false, tipo: esFalloIdentidadTransitorio(inicio.error) ? 'no-disponible' : 'credenciales' };
  }

  const usuario = await cliente.auth.getUser();
  if (usuario.error || !usuario.data.user) {
    try {
      await cliente.auth.signOut();
    } catch {
      // El cierre es defensivo: no debe ocultar el estado no disponible original.
    }
    return {
      ok: false,
      tipo: esFalloIdentidadTransitorio(usuario.error) ? 'no-disponible' : 'credenciales',
    };
  }

  return { ok: true };
}

async function clienteSolicitud() {
  const almacenCookies = await cookies();
  return crearClienteSupabaseSsrPorSolicitud(leerEntornoRuntimeSupabase(), {
    getAll: () => almacenCookies.getAll(),
    setAll: (cookiesParaEstablecer) => {
      for (const cookie of cookiesParaEstablecer) almacenCookies.set(cookie.name, cookie.value, cookie.options);
    },
  });
}

export async function iniciarSesion(formData: FormData): Promise<void> {
  'use server';

  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const resultado = await autenticarCredenciales(await clienteSolicitud(), email, password);
  const next = destinoSiguienteSeguro(String(formData.get('next') ?? ''));
  redirect(
    resultado.ok ? next : resultado.tipo === 'no-disponible' ? '/acceso-no-disponible' : '/login?error=1',
  );
}

export async function cerrarSesion(): Promise<void> {
  'use server';

  const cliente = await clienteSolicitud();
  await cliente.auth.signOut();
  redirect('/login');
}
