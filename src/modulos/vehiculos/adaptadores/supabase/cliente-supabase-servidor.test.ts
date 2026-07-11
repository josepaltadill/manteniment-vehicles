import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EntornoSupabase } from '../../../../compartido/infraestructura/entorno';
import { ErrorAdaptadorSupabase } from './errores-adaptador';

const signInWithPassword = vi.fn();
const createClientMock = vi.fn((..._args: unknown[]) => ({
  auth: { signInWithPassword },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const entornoValido: EntornoSupabase = {
  url: 'https://ejemplo.supabase.co',
  anonKey: 'clave-anonima-de-ejemplo',
  bootstrapEmail: 'admin-desarrollo@ejemplo.local',
  bootstrapPassword: 'password-desarrollo-segura',
  bootstrapHouseholdNombre: 'Hogar de desarrollo',
  householdIdDesarrollo: '11111111-1111-4111-8111-111111111111',
};

describe('crearClienteSupabaseServidor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    createClientMock.mockClear();
    signInWithPassword.mockClear();
  });

  it('lanza un error de frontera de servidor si se ejecuta con `window` definido (contexto navegador)', async () => {
    vi.stubGlobal('window', {});
    const { crearClienteSupabaseServidor } = await import('./cliente-supabase-servidor');

    await expect(crearClienteSupabaseServidor(entornoValido)).rejects.toThrow(
      'crearClienteSupabaseServidor solo puede ejecutarse en servidor',
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('crea el cliente con la URL/clave anónima y autentica al usuario de servidor sembrado', async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { crearClienteSupabaseServidor } = await import('./cliente-supabase-servidor');

    await crearClienteSupabaseServidor(entornoValido);

    expect(createClientMock).toHaveBeenCalledWith(
      entornoValido.url,
      entornoValido.anonKey,
      expect.objectContaining({ auth: expect.any(Object) }),
    );
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: entornoValido.bootstrapEmail,
      password: entornoValido.bootstrapPassword,
    });
  });

  it('propaga un error descriptivo si falla la autenticación del usuario sembrado', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'credenciales inválidas' } });
    const { crearClienteSupabaseServidor } = await import('./cliente-supabase-servidor');

    await expect(crearClienteSupabaseServidor(entornoValido)).rejects.toThrow(
      'No se pudo autenticar el usuario de servidor sembrado: credenciales inválidas',
    );
  });

  it('propaga ErrorAdaptadorSupabase con el código Postgres/GoTrue cuando falla la autenticación', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'credenciales inválidas', code: 'invalid_credentials' } });
    const { crearClienteSupabaseServidor } = await import('./cliente-supabase-servidor');

    let errorCapturado: unknown;
    try {
      await crearClienteSupabaseServidor(entornoValido);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('invalid_credentials');
  });
});
