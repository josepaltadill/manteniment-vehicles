import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONTEXTO = {
  actor: { id: { valor: '11111111-1111-4111-8111-111111111111' }, rol: 'admin' },
  householdId: { valor: '22222222-2222-4222-8222-222222222222' },
} as const;
const mocks = vi.hoisted(() => ({
  cliente: { falso: true } as never,
  resolverAcceso: vi.fn(),
  redirect: vi.fn((destino: string) => { throw new Error(`redirect:${destino}`); }),
  crearVehiculos: vi.fn(), crearEventos: vi.fn(), listar: vi.fn(async () => []),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })) }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('../../../../compartido/infraestructura/entorno', () => ({
  leerEntornoRuntimeSupabase: vi.fn(() => ({ url: 'https://ejemplo.supabase.co', anonKey: 'anon' })),
}));
vi.mock('../../../../compartido/infraestructura/supabase/cliente-supabase-ssr', () => ({
  crearClienteSupabaseSsrPorSolicitud: vi.fn(() => mocks.cliente),
}));
vi.mock('../../adaptadores/supabase/proveedor-identidad-supabase-servidor', () => ({
  ProveedorIdentidadSupabaseServidor: class { resolverAcceso = mocks.resolverAcceso; },
}));
vi.mock('../../adaptadores/supabase/repositorio-vehiculos-supabase', () => ({
  RepositorioVehiculosSupabase: class { constructor() { mocks.crearVehiculos(); } listar = mocks.listar; },
}));
vi.mock('../../adaptadores/supabase/repositorio-eventos-supabase', () => ({
  RepositorioEventosSupabase: class { constructor() { mocks.crearEventos(); } },
}));
vi.mock('../componentes/formulario-evento', () => ({ FormularioEvento: vi.fn() }));
vi.mock('../componentes/formulario-vehiculo', () => ({ FormularioVehiculo: vi.fn() }));

import PaginaInicio from '../../../../app/page';
import PaginaNuevoEvento from '../../../../app/vehiculos/[vehiculoId]/eventos/nuevo/page';
import PaginaNuevoVehiculo from '../../../../app/vehiculos/nuevo/page';
import { crearClienteSupabaseSsrPorSolicitud } from '../../../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import { listarVehiculos } from '../../aplicacion/casos-uso/listar-vehiculos';
import { crearDependenciasVehiculos } from './dependencias-servidor';
const ENTORNO = { url: 'https://ejemplo.supabase.co', anonKey: 'anon' };
const PAGINAS_PROTEGIDAS = [
  ['inicio', () => PaginaInicio()],
  ['nuevo vehículo', () => PaginaNuevoVehiculo()],
  ['nuevo evento', () => PaginaNuevoEvento({ params: Promise.resolve({ vehiculoId: 'vehiculo-1' }) })],
] as const;

describe('crearDependenciasVehiculos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolverAcceso.mockResolvedValue({ estado: 'concedido', contexto: CONTEXTO });
  });

  it('reutiliza una única resolución y contexto durante la solicitud', async () => {
    const dependencias = await crearDependenciasVehiculos(ENTORNO);
    await listarVehiculos(dependencias);
    await dependencias.proveedorIdentidad.obtenerContexto();
    expect(crearClienteSupabaseSsrPorSolicitud).toHaveBeenCalledOnce();
    expect(mocks.resolverAcceso).toHaveBeenCalledOnce();
    expect(mocks.listar).toHaveBeenCalledWith(CONTEXTO.householdId);
  });

  it.each([
    [{ estado: 'anonimo' } as const, '/login'],
    [{ estado: 'sin-acceso', motivo: 'sin-membresia' } as const, '/acceso-no-disponible'],
  ])('redirige el acceso denegado antes de construir o consultar repositorios', async (acceso, destino) => {
    mocks.resolverAcceso.mockResolvedValue(acceso);
    await expect(crearDependenciasVehiculos(ENTORNO)).rejects.toThrow(`redirect:${destino}`);
    expect(mocks.crearVehiculos).not.toHaveBeenCalled();
    expect(mocks.crearEventos).not.toHaveBeenCalled();
    expect(mocks.listar).not.toHaveBeenCalled();
  });

  it('ignora autoridad manipulada y conserva el contexto del servidor', async () => {
    const dependencias = await crearDependenciasVehiculos(ENTORNO);
    const dependenciasManipuladas = { ...dependencias,
      householdId: { valor: '99999999-9999-4999-8999-999999999999' },
      actor: { id: { valor: '99999999-9999-4999-8999-999999999999' }, rol: 'admin' },
    };
    await listarVehiculos(dependenciasManipuladas);
    expect(mocks.listar).toHaveBeenCalledWith(CONTEXTO.householdId);
    expect(mocks.resolverAcceso).toHaveBeenCalledOnce();
  });
});

describe.each(PAGINAS_PROTEGIDAS)('guard de la página %s', (_nombre, invocarPagina) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ estado: 'anonimo' } as const, '/login'],
    [{ estado: 'sin-acceso', motivo: 'sin-membresia' } as const, '/acceso-no-disponible'],
  ])('deniega %o antes de devolver contenido protegido o construir repositorios', async (acceso, destino) => {
    mocks.resolverAcceso.mockResolvedValue(acceso);

    await expect(invocarPagina()).rejects.toThrow(`redirect:${destino}`);

    expect(mocks.redirect).toHaveBeenCalledWith(destino);
    expect(mocks.crearVehiculos).not.toHaveBeenCalled();
    expect(mocks.crearEventos).not.toHaveBeenCalled();
    expect(mocks.listar).not.toHaveBeenCalled();
  });
});
