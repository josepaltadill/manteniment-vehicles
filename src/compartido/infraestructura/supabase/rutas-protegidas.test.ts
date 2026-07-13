import { beforeEach, describe, expect, it, vi } from 'vitest';
import { esRutaProtegida, destinoLoginPara, sesionPermiteRutaProtegida } from './rutas-protegidas';

const doblesProxy = vi.hoisted(() => ({
  respuestaUsuario: { data: { user: null as unknown }, error: null as unknown },
}));

vi.mock('../entorno', () => ({
  leerEntornoRuntimeSupabase: () => ({ url: 'https://ejemplo.supabase.co', anonKey: 'anon' }),
}));

vi.mock('./cliente-supabase-ssr', () => ({
  crearClienteSupabaseSsrPorSolicitud: (_entorno: unknown, cookies: { setAll: (items: unknown[]) => void }) => ({
    auth: {
      getUser: async () => {
        cookies.setAll([{ name: 'sb-token', value: 'renovado', options: { httpOnly: true } }]);
        return doblesProxy.respuestaUsuario;
      },
    },
  }),
}));

vi.mock('next/server', () => {
  const crearRespuesta = (url?: URL) => {
    const almacen: Array<{ name: string; value: string; options?: unknown }> = [];
    return {
      url: url?.toString(),
      cookies: {
        getAll: () => almacen,
        set: (nombreOCookie: string | { name: string; value: string; options?: unknown }, valor?: string, options?: unknown) => {
          almacen.push(typeof nombreOCookie === 'string'
            ? { name: nombreOCookie, value: valor ?? '', options }
            : nombreOCookie);
        },
      },
    };
  };

  return {
    NextResponse: {
      next: () => crearRespuesta(),
      redirect: (url: URL) => crearRespuesta(url),
    },
  };
});

describe('frontera de rutas privadas', () => {
  it.each(['/', '/vehiculos', '/vehiculos/nuevo', '/vehiculos/123/eventos/nuevo'])('protege %s', (ruta) => {
    expect(esRutaProtegida(ruta)).toBe(true);
  });

  it.each(['/login', '/acceso-no-disponible', '/api/health', '/vehiculos-falso'])('no amplía el matcher a %s', (ruta) => {
    expect(esRutaProtegida(ruta)).toBe(false);
  });

  it('preserva únicamente el destino interno solicitado en el redirect a login', () => {
    expect(destinoLoginPara('/vehiculos/123?seccion=historial')).toBe(
      '/login?next=%2Fvehiculos%2F123%3Fseccion%3Dhistorial',
    );
  });

  it.each([
    ['token caducado', { message: 'JWT expired' }, { id: 'anterior' }],
    ['cookie manipulada', { message: 'invalid JWT' }, null],
  ])('niega %s aunque quede un usuario previo en memoria', (_caso, error, usuario) => {
    expect(sesionPermiteRutaProtegida({ error, user: usuario })).toBe(false);
  });

  it('acepta exclusivamente una respuesta actual validada por el servidor', () => {
    expect(sesionPermiteRutaProtegida({ error: null, user: { id: 'actual' } })).toBe(true);
  });
});

describe('contrato externo del proxy', () => {
  beforeEach(() => {
    doblesProxy.respuestaUsuario = { data: { user: null }, error: null };
  });

  it('redirige una ruta privada anónima y propaga la cookie SSR renovada', async () => {
    const { proxy } = await import('../../../proxy');
    const cookiesSolicitud: Array<{ name: string; value: string }> = [];
    const solicitud = {
      url: 'https://app.example/vehiculos/123?seccion=historial',
      nextUrl: { pathname: '/vehiculos/123', search: '?seccion=historial' },
      cookies: {
        getAll: () => [],
        set: (name: string, value: string) => cookiesSolicitud.push({ name, value }),
      },
    };

    const respuesta = await proxy(solicitud as never) as unknown as {
      url: string;
      cookies: { getAll: () => Array<{ name: string; value: string }> };
    };

    expect(respuesta.url).toBe(
      'https://app.example/login?next=%2Fvehiculos%2F123%3Fseccion%3Dhistorial',
    );
    expect(respuesta.cookies.getAll()).toContainEqual(
      expect.objectContaining({ name: 'sb-token', value: 'renovado' }),
    );
    expect(cookiesSolicitud).toContainEqual({ name: 'sb-token', value: 'renovado' });
  });

  it('redirige un fallo transitorio de identidad al estado no disponible sin bucle de login', async () => {
    doblesProxy.respuestaUsuario = { data: { user: null }, error: { status: 503 } };
    const { proxy } = await import('../../../proxy');
    const solicitud = {
      url: 'https://app.example/vehiculos',
      nextUrl: { pathname: '/vehiculos', search: '' },
      cookies: { getAll: () => [], set: vi.fn() },
    };

    const respuesta = await proxy(solicitud as never) as unknown as { url: string };

    expect(respuesta.url).toBe('https://app.example/acceso-no-disponible');
  });
});
