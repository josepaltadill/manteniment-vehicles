import { describe, expect, it, vi } from 'vitest';
import {
  ejecutarBootstrapPostgresDesdeEntorno,
  OperacionesBootstrapPostgres,
  type ClientePostgresBootstrap,
} from './operaciones-bootstrap-postgres';

function crearCliente(): ClientePostgresBootstrap & { query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('count(*)')) return { rows: [{ cantidad: '1' }] };
    return { rows: [{ id: '11111111-1111-4111-8111-111111111111' }] };
  });

  return { query } as unknown as ClientePostgresBootstrap & { query: typeof query };
}

describe('OperacionesBootstrapPostgres', () => {
  it('crea o reutiliza el usuario por email mediante SQL parametrizado y solo administrativo', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    const usuario = await operaciones.crearUsuario('admin@ejemplo.local', 'secreto-de-prueba');

    expect(usuario.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into auth.users'),
      ['admin@ejemplo.local', 'secreto-de-prueba'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain('on conflict (email)');
  });

  it('crea o reutiliza el hogar usando la restricción única de nombre', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearHogar('Hogar de desarrollo');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into public.mv_households'),
      ['Hogar de desarrollo'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain('on conflict (nombre)');
  });

  it('crea la membresía admin idempotentemente sin interpolar identificadores', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearMembresiaAdmin('hogar-1', 'usuario-1');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into public.mv_household_members'),
      ['hogar-1', 'usuario-1'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain('on conflict (household_id, user_id) do nothing');
  });

  it('cierra la conexión administrativa cuando el proceso de bootstrap termina', async () => {
    const cliente = { ...crearCliente(), cerrar: vi.fn(async () => undefined) };
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.cerrar();

    expect(cliente.cerrar).toHaveBeenCalledOnce();
  });
});

describe('ejecutarBootstrapPostgresDesdeEntorno', () => {
  const entorno = {
    SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://bootstrap.invalid/base',
    SUPABASE_BOOTSTRAP_EMAIL: 'admin@ejemplo.local',
    SUPABASE_BOOTSTRAP_PASSWORD: 'secreto-de-prueba',
    SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar de desarrollo',
  };

  it('ejecuta la siembra con variables privadas y cierra la conexión al completar', async () => {
    const operaciones = { cerrar: vi.fn(async () => undefined) };
    const crearOperaciones = vi.fn(async () => operaciones);
    const sembrar = vi.fn(async () => ({ householdId: { valor: 'hogar-1' }, userId: { valor: 'usuario-1' } }));

    const resultado = await ejecutarBootstrapPostgresDesdeEntorno(entorno, {
      crearOperaciones: crearOperaciones as never,
      sembrar: sembrar as never,
    });

    expect(crearOperaciones).toHaveBeenCalledWith(entorno.SUPABASE_BOOTSTRAP_DATABASE_URL);
    expect(sembrar).toHaveBeenCalledWith(operaciones, {
      bootstrapEmail: entorno.SUPABASE_BOOTSTRAP_EMAIL,
      bootstrapPassword: entorno.SUPABASE_BOOTSTRAP_PASSWORD,
      bootstrapHouseholdNombre: entorno.SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE,
    });
    expect(operaciones.cerrar).toHaveBeenCalledOnce();
    expect(resultado).toEqual({ householdId: { valor: 'hogar-1' }, userId: { valor: 'usuario-1' } });
  });

  it('cierra la conexión administrativa también cuando la siembra falla', async () => {
    const operaciones = { cerrar: vi.fn(async () => undefined) };
    const error = new Error('fallo de siembra');

    await expect(
      ejecutarBootstrapPostgresDesdeEntorno(entorno, {
        crearOperaciones: vi.fn(async () => operaciones) as never,
        sembrar: vi.fn(async () => {
          throw error;
        }) as never,
      }),
    ).rejects.toBe(error);

    expect(operaciones.cerrar).toHaveBeenCalledOnce();
  });

  it('propaga el error de siembra en vez del error de cierre cuando ambos fallan', async () => {
    const errorSiembra = new Error('fallo de siembra');
    const errorCierre = new Error('fallo de cierre');
    const operaciones = {
      cerrar: vi.fn(async () => {
        throw errorCierre;
      }),
    };

    await expect(
      ejecutarBootstrapPostgresDesdeEntorno(entorno, {
        crearOperaciones: vi.fn(async () => operaciones) as never,
        sembrar: vi.fn(async () => {
          throw errorSiembra;
        }) as never,
      }),
    ).rejects.toBe(errorSiembra);

    expect(operaciones.cerrar).toHaveBeenCalledOnce();
  });
});
