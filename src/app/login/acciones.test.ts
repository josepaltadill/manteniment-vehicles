import { describe, expect, it, vi } from 'vitest';
import { autenticarCredenciales, destinoSiguienteSeguro } from './acciones';

describe('destinoSiguienteSeguro', () => {
  it.each(['/vehiculos', '/vehiculos/abc?filtro=pendiente'])('acepta destinos privados relativos: %s', (next) => {
    expect(destinoSiguienteSeguro(next)).toBe(next);
  });

  it.each(['https://atacante.example', '//atacante.example', '/login', '/', '/acceso-no-disponible', '/vehiculos-falso'])('rechaza destinos no privados o abiertos: %s', (next) => {
    expect(destinoSiguienteSeguro(next)).toBe('/vehiculos');
  });
});

describe('autenticarCredenciales', () => {
  it('devuelve un único error no enumerativo y no valida identidad cuando fallan las credenciales', async () => {
    const getUser = vi.fn();
    const resultado = await autenticarCredenciales(
      { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: { status: 400 } }), getUser } } as never,
      'persona@ejemplo.com',
      'incorrecta',
    );

    expect(resultado).toEqual({ ok: false, tipo: 'credenciales' });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('exige auth.getUser después de iniciar sesión y falla cerrado si no hay usuario validado', async () => {
    const signOut = vi.fn();
    const resultado = await autenticarCredenciales(
      {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
          signOut,
        },
      } as never,
      'persona@ejemplo.com',
      'correcta',
    );

    expect(resultado).toEqual({ ok: false, tipo: 'credenciales' });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it.each([{ status: 429 }, { status: 503 }, { name: 'AbortError' }])(
    'clasifica fallos transitorios de identidad como acceso no disponible sin enumerar: %o',
    async (error) => {
      const resultado = await autenticarCredenciales(
        {
          auth: {
            signInWithPassword: vi.fn().mockResolvedValue({ error }),
            getUser: vi.fn(),
            signOut: vi.fn(),
          },
        },
        'persona@ejemplo.com',
        'correcta',
      );

      expect(resultado).toEqual({ ok: false, tipo: 'no-disponible' });
    },
  );

  it('mantiene el estado no disponible si también falla el cierre defensivo', async () => {
    const resultado = await autenticarCredenciales(
      {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { status: 502 } }),
          signOut: vi.fn().mockRejectedValue(new Error('identity unavailable')),
        },
      },
      'persona@ejemplo.com',
      'correcta',
    );

    expect(resultado).toEqual({ ok: false, tipo: 'no-disponible' });
  });
});
