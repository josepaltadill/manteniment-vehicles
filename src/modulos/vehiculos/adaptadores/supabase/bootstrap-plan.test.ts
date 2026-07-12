import { describe, expect, it } from 'vitest';
import { crearPlanBootstrapFamiliar } from './bootstrap-plan';

const adminId = '00000000-0000-4000-8000-000000000001';
const hogarId = '10000000-0000-4000-8000-000000000001';

function entrada(overrides = {}) {
  return {
    nombreDestino: 'Familia Altadill',
    adminUserId: adminId,
    hogares: [],
    ...overrides,
  };
}

describe('crearPlanBootstrapFamiliar', () => {
  it('crea un plan limpio sin aplicar mutaciones cuando no hay hogar candidato', () => {
    expect(crearPlanBootstrapFamiliar(entrada())).toEqual({
      estado: 'listo',
      acciones: [{ tipo: 'create-household', nombre: 'Familia Altadill' }, { tipo: 'insert-membership', householdId: null, userId: adminId }],
      conteos: { vehiculos: 0, eventos: 0 },
    });
  });

  it('es un no-op idempotente para el hogar destino con la membresía admin exacta', () => {
    expect(crearPlanBootstrapFamiliar(entrada({
      hogares: [{ id: hogarId, nombre: 'Familia Altadill', vehiculos: 2, eventos: 4, miembros: [{ userId: adminId, rol: 'admin' }] }],
    }))).toEqual({
      estado: 'listo',
      acciones: [{ tipo: 'noop', householdId: hogarId }],
      conteos: { vehiculos: 2, eventos: 4 },
    });
  });

  it('requiere confirmación explícita para planificar el renombrado que preserva el UUID y los conteos', () => {
    const resultado = crearPlanBootstrapFamiliar(entrada({
      confirmarRenombradoDesde: hogarId,
      hogares: [{ id: hogarId, nombre: 'Hogar de desarrollo', vehiculos: 2, eventos: 4, miembros: [{ userId: adminId, rol: 'admin' }] }],
    }));

    expect(resultado).toEqual({
      estado: 'listo',
      acciones: [{ tipo: 'rename-household', householdId: hogarId, nombre: 'Familia Altadill' }, { tipo: 'noop-membership', householdId: hogarId, userId: adminId }],
      conteos: { vehiculos: 2, eventos: 4 },
    });
  });

  it.each([
    ['destino duplicado', { hogares: [{ id: hogarId, nombre: 'Familia Altadill', vehiculos: 0, eventos: 0, miembros: [] }, { id: '20000000-0000-4000-8000-000000000002', nombre: ' familia altadill ', vehiculos: 0, eventos: 0, miembros: [] }] }],
    ['membresía inesperada', { hogares: [{ id: hogarId, nombre: 'Familia Altadill', vehiculos: 0, eventos: 0, miembros: [{ userId: adminId, rol: 'editor' }] }] }],
    ['varios candidatos', { hogares: [{ id: hogarId, nombre: 'Hogar A', vehiculos: 1, eventos: 0, miembros: [{ userId: adminId, rol: 'admin' }] }, { id: '20000000-0000-4000-8000-000000000002', nombre: 'Hogar B', vehiculos: 0, eventos: 1, miembros: [{ userId: adminId, rol: 'admin' }] }] }],
  ])('aborta sin acciones ante %s', (_caso, datos) => {
    expect(crearPlanBootstrapFamiliar(entrada(datos))).toEqual(expect.objectContaining({ estado: 'conflicto', acciones: [] }));
  });
});
