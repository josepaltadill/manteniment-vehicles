import { describe, expect, it } from 'vitest';
import { leerSolicitudBootstrap, serializarPlanBootstrap } from './bootstrap-cli';

describe('contrato CLI del bootstrap administrativo', () => {
  const entorno = {
    SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://operator:secret@example.test/postgres',
    SUPABASE_BOOTSTRAP_ADMIN_USER_ID: '00000000-0000-4000-8000-000000000001',
  };

  it('usa --check por defecto, exige UUID Auth y el nombre productivo exacto', () => {
    expect(leerSolicitudBootstrap([], entorno)).toEqual({
      modo: 'check',
      adminUserId: entorno.SUPABASE_BOOTSTRAP_ADMIN_USER_ID,
      nombreDestino: 'Familia Altadill',
      confirmarRenombradoDesde: undefined,
    });
  });

  it('solo permite --apply con confirmación explícita y conserva el UUID de renombrado', () => {
    expect(leerSolicitudBootstrap(['--apply', '--confirm', '--rename-from=10000000-0000-4000-8000-000000000001'], entorno)).toEqual({
      modo: 'apply',
      adminUserId: entorno.SUPABASE_BOOTSTRAP_ADMIN_USER_ID,
      nombreDestino: 'Familia Altadill',
      confirmarRenombradoDesde: '10000000-0000-4000-8000-000000000001',
    });
  });

  it('rechaza apply sin confirmación e identificadores Auth inválidos', () => {
    expect(() => leerSolicitudBootstrap(['--apply'], entorno)).toThrow(/--confirm/);
    expect(() => leerSolicitudBootstrap([], { ...entorno, SUPABASE_BOOTSTRAP_ADMIN_USER_ID: 'email@example.test' })).toThrow(/UUID Auth/);
  });

  it('serializa el plan sin URL ni otros secretos', () => {
    const salida = serializarPlanBootstrap({ estado: 'listo', acciones: [{ tipo: 'noop', householdId: '10000000-0000-4000-8000-000000000001' }], conteos: { vehiculos: 2, eventos: 4 } });
    expect(salida).toContain('"estado": "listo"');
    expect(salida).toContain('10000000-0000-4000-8000-000000000001');
    expect(salida).not.toContain('postgresql://');
  });
});
