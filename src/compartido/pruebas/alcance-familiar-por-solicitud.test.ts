import { describe, expect, it, vi } from 'vitest';

const redirect = vi.hoisted(() => vi.fn((ruta: string) => { throw new Error(`REDIRECT:${ruta}`); }));
vi.mock('next/navigation', () => ({ redirect }));

type Contexto = Readonly<{ actor: Readonly<{ id: string; rol: 'admin' | 'editor' }>; householdId: string }>;
type Acceso = Readonly<{ estado: 'anonimo' }> | Readonly<{ estado: 'sin-acceso'; motivo: 'sin-membresia' | 'multiples-membresias' }> | Readonly<{ estado: 'concedido'; contexto: Contexto }>;
type Dependencias = Readonly<{ crearClienteSupabase: () => unknown; crearProveedorIdentidad: (cliente: unknown) => Readonly<{ resolverAcceso(): Promise<Acceso> }> }>;
type Composicion = Readonly<{
  resolverAlcanceFamiliarPorSolicitud(dependencias: Dependencias): Promise<Readonly<{ clienteSupabase: unknown; contextoFamiliar: Contexto }>>;
  crearDependenciasVehiculosPorSolicitud(resolver?: () => Promise<never>): Promise<unknown>;
}>;
const CONTEXTO: Contexto = { actor: { id: '11111111-1111-4111-8111-111111111111', rol: 'admin' }, householdId: '22222222-2222-4222-8222-222222222222' };
const cargar = () => import('../../composicion/servidor/alcance-familiar-por-solicitud') as Promise<Composicion>;
function dependenciasPara(acceso: Acceso) { const cliente = { origen: 'ssr' }; const resolverAcceso = vi.fn(async () => acceso); const crearClienteSupabase = vi.fn(() => cliente); const crearProveedorIdentidad = vi.fn(() => ({ resolverAcceso }));
  return { cliente, resolverAcceso, crearClienteSupabase, crearProveedorIdentidad }; }

describe('resolverAlcanceFamiliarPorSolicitud', () => {
  it.each([
    ['una sesión ausente', { estado: 'anonimo' }, 'Sesión familiar no disponible'],
    ['cero membresías utilizables', { estado: 'sin-acceso', motivo: 'sin-membresia' }, 'Contexto familiar no disponible: sin-membresia'],
    ['múltiples membresías utilizables', { estado: 'sin-acceso', motivo: 'multiples-membresias' }, 'Contexto familiar no disponible: multiples-membresias'],
  ] satisfies readonly [string, Acceso, string][])('falla cerrado ante %s', async (_caso, acceso, mensaje) => {
    const dependencias = dependenciasPara(acceso); await expect((await cargar()).resolverAlcanceFamiliarPorSolicitud(dependencias)).rejects.toThrow(mensaje); expect(dependencias.resolverAcceso).toHaveBeenCalledOnce();
  });
  it('devuelve el cliente SSR y el único contexto resuelto una sola vez', async () => {
    const dependencias = dependenciasPara({ estado: 'concedido', contexto: CONTEXTO }); const alcance = await (await cargar()).resolverAlcanceFamiliarPorSolicitud(dependencias);
    expect(alcance).toEqual({ clienteSupabase: dependencias.cliente, contextoFamiliar: CONTEXTO }); expect(Object.isFrozen(alcance)).toBe(true); expect(dependencias.crearClienteSupabase).toHaveBeenCalledOnce(); expect(dependencias.crearProveedorIdentidad).toHaveBeenCalledWith(dependencias.cliente); expect(dependencias.resolverAcceso).toHaveBeenCalledOnce();
  });
  it.each([
    [{ estado: 'anonimo' }, '/login'],
    [{ estado: 'sin-acceso', motivo: 'sin-membresia' }, '/acceso-no-disponible'],
    [{ estado: 'sin-acceso', motivo: 'multiples-membresias' }, '/acceso-no-disponible'],
  ] satisfies readonly [Acceso, string][])('redirige la denegación explícita a %s', async (acceso, ruta) => {
    const composicion = await cargar();
    await expect(composicion.crearDependenciasVehiculosPorSolicitud(() => composicion.resolverAlcanceFamiliarPorSolicitud(dependenciasPara(acceso)) as Promise<never>)).rejects.toThrow(`REDIRECT:${ruta}`);
  });
  it('propaga sin cambios un error operacional inesperado inyectado', async () => {
    const error = new Error('fallo operacional');
        redirect.mockClear();
    await expect((await cargar()).crearDependenciasVehiculosPorSolicitud(() => Promise.reject(error))).rejects.toBe(error);
  });
});
