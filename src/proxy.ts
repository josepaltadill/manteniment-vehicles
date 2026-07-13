import { NextResponse, type NextRequest } from 'next/server';
import { leerEntornoRuntimeSupabase } from './compartido/infraestructura/entorno';
import { crearClienteSupabaseSsrPorSolicitud } from './compartido/infraestructura/supabase/cliente-supabase-ssr';
import {
  destinoLoginPara,
  esFalloIdentidadTransitorio,
  esRutaProtegida,
  sesionPermiteRutaProtegida,
} from './compartido/infraestructura/supabase/rutas-protegidas';

export async function proxy(solicitud: NextRequest) {
  let respuesta = NextResponse.next({ request: solicitud });
  const cliente = crearClienteSupabaseSsrPorSolicitud(leerEntornoRuntimeSupabase(), {
    getAll: () => solicitud.cookies.getAll(),
    setAll: (cookiesParaEstablecer) => {
      for (const cookie of cookiesParaEstablecer) {
        solicitud.cookies.set(cookie.name, cookie.value);
        respuesta.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    },
  });
  const { data, error } = await cliente.auth.getUser();

  if (esRutaProtegida(solicitud.nextUrl.pathname) && !sesionPermiteRutaProtegida({ error, user: data.user })) {
    const ruta = `${solicitud.nextUrl.pathname}${solicitud.nextUrl.search}`;
    const destino = esFalloIdentidadTransitorio(error)
      ? '/acceso-no-disponible'
      : destinoLoginPara(ruta);
    const redireccion = NextResponse.redirect(new URL(destino, solicitud.url));
    for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
    return redireccion;
  }

  return respuesta;
}

export const config = {
  matcher: ['/', '/vehiculos/:path*'],
};
