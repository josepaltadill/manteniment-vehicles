import { afterEach, describe, expect, it, vi } from 'vitest';

const createServerClient = vi.fn(() => ({ auth: { getUser: vi.fn() } }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}));

describe('crearClienteSupabaseSsrPorSolicitud', () => {
  afterEach(() => {
    createServerClient.mockClear();
  });

  it('crea un cliente SSR nuevo con solo configuración runtime y adaptador de cookies', async () => {
    const { crearClienteSupabaseSsrPorSolicitud } = await import('./cliente-supabase-ssr');
    const cookies = {
      getAll: vi.fn(() => [{ name: 'sb-auth-token', value: 'token' }]),
      setAll: vi.fn(),
    };

    const cliente = crearClienteSupabaseSsrPorSolicitud(
      { url: 'https://ejemplo.supabase.co', anonKey: 'clave-anonima' },
      cookies,
    );

    expect(cliente).toEqual(expect.any(Object));
    expect(createServerClient).toHaveBeenCalledWith(
      'https://ejemplo.supabase.co',
      'clave-anonima',
      { cookies },
    );
  });
});
