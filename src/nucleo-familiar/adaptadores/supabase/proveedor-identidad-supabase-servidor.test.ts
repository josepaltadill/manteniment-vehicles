import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearIdentificador } from '../../../compartido/dominio/identificador';
import { establecerReportadorIncidentes } from '../../../compartido/infraestructura/reporte-incidentes';
import type { ClienteSupabaseSsr } from '../../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import type { ProveedorIdentidad } from '../../aplicacion/puertos/alcance-familiar';
import { exigirContextoFamiliar } from '../../aplicacion/servicios/resolver-acceso-familiar';
import { crearClienteSupabaseFalso } from '../../../modulos/vehiculos/adaptadores/supabase/pruebas/cliente-supabase-falso';
import { ProveedorIdentidadSupabaseServidor } from './proveedor-identidad-supabase-servidor';

const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => redirectMock(...args) }));

const USUARIO = '11111111-1111-4111-8111-111111111111';
const HOGAR = '22222222-2222-4222-8222-222222222222';
function clienteConAcceso(usuarioId: string | null, membresias: unknown, error: unknown = null, errorIdentidad: unknown = null) {
  const { cliente, llamadas } = crearClienteSupabaseFalso({ data: membresias, error });
  const clienteSsr = cliente as unknown as ClienteSupabaseSsr;
  (clienteSsr as unknown as { auth: unknown }).auth = {
    getUser: async () => ({ data: { user: usuarioId ? { id: usuarioId } : null }, error: errorIdentidad }),
  };
  return { cliente: clienteSsr, llamadas };
}

const resolver = (cliente: ClienteSupabaseSsr) => new ProveedorIdentidadSupabaseServidor(cliente).resolverAcceso();

describe('ProveedorIdentidadSupabaseServidor', () => {
  beforeEach(() => {
    establecerReportadorIncidentes();
    redirectMock.mockClear();
  });

  it('deniega anonimato y reporta errores de identidad sin consultar membresías', async () => {
    const reportar = vi.fn();
    establecerReportadorIncidentes({ reportar });
    for (const [usuario, error] of [[null, null], [USUARIO, { message: 'auth unavailable' }]] as const) {
      const { cliente, llamadas } = clienteConAcceso(usuario, [], null, error);
      await expect(resolver(cliente)).resolves.toEqual({ estado: 'anonimo' });
      expect(llamadas).toEqual([]);
    }
    expect(reportar).toHaveBeenCalledOnce();
    expect(reportar).toHaveBeenCalledWith({
      contexto: 'resolver-acceso-familiar',
      error: expect.any(Error),
      metadatos: { codigo: 'auth_get_user' },
    });
  });

  it('concede una única membresía y limita la consulta a dos filas', async () => {
    const { cliente, llamadas } = clienteConAcceso(USUARIO, [{ household_id: HOGAR, rol: 'editor' }]);
    await expect(resolver(cliente)).resolves.toMatchObject({
      estado: 'concedido', contexto: { actor: { rol: 'editor' }, householdId: { valor: HOGAR } },
    });
    expect(llamadas[0]).toEqual({ tabla: 'fam_miembros_hogar', operaciones: [
      { metodo: 'select', args: ['household_id, rol'] },
      { metodo: 'eq', args: ['user_id', USUARIO] },
      { metodo: 'limit', args: [2] },
    ] });
  });

  it('falla cerrado para cardinalidad, datos inválidos y errores de persistencia', async () => {
    const casos = [
      [[], 'sin-membresia'],
      [[{ household_id: HOGAR, rol: 'admin' }, { household_id: crypto.randomUUID(), rol: 'editor' }], 'multiples-membresias'],
      [[{ household_id: 'invalido', rol: 'admin' }], 'datos-invalidos'],
      [[{ household_id: HOGAR, rol: 'otro' }], 'datos-invalidos'],
      [[null], 'datos-invalidos'],
    ] as const;
    for (const [membresias, motivo] of casos) {
      await expect(resolver(clienteConAcceso(USUARIO, membresias).cliente)).resolves.toEqual({ estado: 'sin-acceso', motivo });
    }
    const reportar = vi.fn();
    establecerReportadorIncidentes({ reportar });
    await expect(resolver(clienteConAcceso(USUARIO, [], { message: 'db unavailable', email: 'private@example.test' }).cliente))
      .resolves.toEqual({ estado: 'sin-acceso', motivo: 'error-operativo' });
    expect(reportar).toHaveBeenCalledWith({
      contexto: 'resolver-acceso-familiar',
      error: expect.any(Error),
      metadatos: { codigo: 'membership_query' },
    });
    expect(JSON.stringify(reportar.mock.calls)).not.toContain('private@example.test');
    expect(JSON.stringify(reportar.mock.calls)).not.toContain(USUARIO);
  });

  describe('exigirContextoFamiliar', () => {
    const contexto = {
      actor: { id: crearIdentificador(USUARIO), rol: 'admin' as const },
      householdId: crearIdentificador(HOGAR),
    };
    const proveedor = (acceso: Awaited<ReturnType<NonNullable<ProveedorIdentidad['resolverAcceso']>>>) => ({
      obtenerContexto: vi.fn(),
      resolverAcceso: vi.fn().mockResolvedValue(acceso),
    });

    it.each([
      [{ estado: 'anonimo' } as const, '/login'],
      [{ estado: 'sin-acceso', motivo: 'sin-membresia' } as const, '/acceso-no-disponible'],
    ])('redirige el acceso no concedido', async (acceso, destino) => {
      await exigirContextoFamiliar(proveedor(acceso));
      expect(redirectMock).toHaveBeenCalledWith(destino);
    });

    it('devuelve el contexto concedido', async () => {
      await expect(exigirContextoFamiliar(proveedor({ estado: 'concedido', contexto }))).resolves.toBe(contexto);
    });

    it('rechaza proveedores que no implementan resolución de acceso', async () => {
      const sinResolucion: ProveedorIdentidad = { obtenerContexto: vi.fn() };
      await expect(exigirContextoFamiliar(sinResolucion)).rejects.toThrow(
        'El proveedor de identidad no puede resolver acceso familiar.',
      );
    });
  });
});
