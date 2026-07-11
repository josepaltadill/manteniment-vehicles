import { describe, expect, it, vi } from 'vitest';
import {
  ErrorMembresiaNoAdminBootstrap,
  ErrorRaceBootstrapHogar,
  sembrarHogarDeDesarrollo,
  type OperacionesBootstrap,
} from './bootstrap-servidor';
import type { RolUsuario } from '../../dominio/rol-usuario';

const entornoBootstrap = {
  bootstrapEmail: 'admin-desarrollo@ejemplo.local',
  bootstrapPassword: 'password-desarrollo-segura',
  bootstrapHouseholdNombre: 'Hogar de desarrollo',
};

function crearOperacionesFalsas(
  overrides: Partial<OperacionesBootstrap> = {},
): { operaciones: OperacionesBootstrap; estado: {
  usuario: { id: string } | null;
  hogar: { id: string } | null;
  membresia: { rol: RolUsuario } | null;
} } {
  const estado: {
    usuario: { id: string } | null;
    hogar: { id: string } | null;
    membresia: { rol: RolUsuario } | null;
  } = { usuario: null, hogar: null, membresia: null };

  const operaciones: OperacionesBootstrap = {
    buscarUsuarioPorEmail: vi.fn(async () => estado.usuario),
    crearUsuario: vi.fn(async () => {
      estado.usuario = { id: 'usuario-real-1' };
      return estado.usuario;
    }),
    buscarHogarPorNombre: vi.fn(async () => estado.hogar),
    crearHogar: vi.fn(async () => {
      estado.hogar = { id: 'hogar-real-1' };
      return estado.hogar;
    }),
    // Por defecto, sin condición de carrera: tras crear, solo existe un hogar con ese nombre.
    contarHogaresPorNombre: vi.fn(async () => 1),
    buscarMembresia: vi.fn(async () => estado.membresia),
    crearMembresiaAdmin: vi.fn(async () => {
      estado.membresia = { rol: 'admin' };
    }),
    ...overrides,
  };

  return { operaciones, estado };
}

describe('sembrarHogarDeDesarrollo', () => {
  it('crea usuario, hogar y membresía admin cuando no existen todavía', async () => {
    const { operaciones } = crearOperacionesFalsas();

    const resultado = await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);

    expect(operaciones.crearUsuario).toHaveBeenCalledTimes(1);
    expect(operaciones.crearHogar).toHaveBeenCalledTimes(1);
    expect(operaciones.crearMembresiaAdmin).toHaveBeenCalledTimes(1);
    expect(resultado.householdId.valor).toBe('hogar-real-1');
    expect(resultado.userId.valor).toBe('usuario-real-1');
  });

  it('es idempotente: reejecutar no duplica usuario/hogar/membresía y devuelve los mismos ids reales', async () => {
    const { operaciones } = crearOperacionesFalsas();

    const primeraEjecucion = await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);
    const segundaEjecucion = await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);

    expect(operaciones.crearUsuario).toHaveBeenCalledTimes(1);
    expect(operaciones.crearHogar).toHaveBeenCalledTimes(1);
    expect(operaciones.crearMembresiaAdmin).toHaveBeenCalledTimes(1);
    expect(segundaEjecucion.householdId.valor).toBe(primeraEjecucion.householdId.valor);
    expect(segundaEjecucion.userId.valor).toBe(primeraEjecucion.userId.valor);
  });

  it('detecta una condición de carrera y lanza un error tipado si tras crear el hogar existe más de uno con el mismo nombre', async () => {
    // Simula dos bootstraps concurrentes: ambos buscan (no existe todavía), ambos crean.
    // El re-query tras crear detecta que ahora hay 2 hogares con el mismo nombre.
    const { operaciones } = crearOperacionesFalsas({ contarHogaresPorNombre: vi.fn(async () => 2) });

    let errorCapturado: unknown;
    try {
      await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorRaceBootstrapHogar);
    expect((errorCapturado as Error).message).toMatch(/condición de carrera/i);
    expect(operaciones.contarHogaresPorNombre).toHaveBeenCalledTimes(1);
  });

  it('falla explícito en vez de sobrescribir un rol no-admin ya existente', async () => {
    const { operaciones, estado } = crearOperacionesFalsas();
    estado.usuario = { id: 'usuario-real-1' };
    estado.hogar = { id: 'hogar-real-1' };
    estado.membresia = { rol: 'editor' };

    let errorCapturado: unknown;
    try {
      await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorMembresiaNoAdminBootstrap);
    expect((errorCapturado as Error).message).toMatch(/editor/i);
    expect((errorCapturado as Error).message).toMatch(/hogar-real-1/);
    expect((errorCapturado as Error).message).toMatch(/usuario-real-1/);
    expect(operaciones.crearMembresiaAdmin).not.toHaveBeenCalled();
  });

  it('no hace nada si la membresía existente ya es admin', async () => {
    const { operaciones, estado } = crearOperacionesFalsas();
    estado.usuario = { id: 'usuario-real-1' };
    estado.hogar = { id: 'hogar-real-1' };
    estado.membresia = { rol: 'admin' };

    const resultado = await sembrarHogarDeDesarrollo(operaciones, entornoBootstrap);

    expect(operaciones.crearMembresiaAdmin).not.toHaveBeenCalled();
    expect(resultado.householdId.valor).toBe('hogar-real-1');
    expect(resultado.userId.valor).toBe('usuario-real-1');
  });
});
