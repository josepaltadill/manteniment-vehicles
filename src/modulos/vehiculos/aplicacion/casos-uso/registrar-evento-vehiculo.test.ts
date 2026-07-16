import { describe, expect, it, vi } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearVehiculo } from '../../dominio/vehiculo';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';
import type { UnidadTrabajoVehiculos } from '../puertos/repositorio-eventos-vehiculo';
import { ContextoFamiliarTemporal } from '../pruebas/contexto-familiar-temporal';
import { registrarEventoVehiculo } from './registrar-evento-vehiculo';

// Contrato de atomicidad evento + kilometraje (tarea 8, diseño §5.4/§14). Este
// caso de uso NUNCA debe hacer dos escrituras independientes e inseguras
// (guardar vehículo por un lado y evento por otro); toda la coordinación debe
// pasar por una única llamada a `UnidadTrabajoVehiculos.registrarEventoYActualizarKilometraje`.
const hogarA = crearIdentificador('hogar-a');
const vehiculoId = crearIdentificador('vehiculo-1234 ABC');

const vehiculo = () =>
  crearVehiculo({
    id: vehiculoId,
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2019,
    combustible: 'gasolina',
    matricula: '1234 ABC',
    kilometrosActuales: 120_000,
    fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
    fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
  });

function repositorioVehiculosFalso(): RepositorioVehiculos {
  return {
    guardar: vi.fn(async () => {
      throw new Error('guardar() no debe llamarse directamente: solo la unidad de trabajo coordina la escritura.');
    }),
    buscarPorId: vi.fn(async () => vehiculo()),
    listar: vi.fn(async () => []),
    existeMatricula: vi.fn(async () => false),
  };
}

describe('registrarEventoVehiculo — contrato atómico evento + kilometraje', () => {
  it('coordina evento y kilometraje en una única llamada a la unidad de trabajo, sin escrituras separadas', async () => {
    const unidadTrabajo: UnidadTrabajoVehiculos = {
      registrarEventoYActualizarKilometraje: vi.fn(async () => undefined),
    };

    await registrarEventoVehiculo(
      {
        repositorioVehiculos: repositorioVehiculosFalso(),
        unidadTrabajoVehiculos: unidadTrabajo,
        contextoFamiliar: new ContextoFamiliarTemporal(hogarA),
        proveedorFecha: { ahora: () => new Date('2026-02-01T10:00:00.000Z') },
      },
      {
        id: crearIdentificador('evento-1'),
        vehiculoId,
        tipo: 'mantenimiento',
        descripcion: 'Cambio de aceite',
        kilometros: 120_005,
        fecha: new Date('2026-02-01T00:00:00.000Z'),
      },
    );

    expect(unidadTrabajo.registrarEventoYActualizarKilometraje).toHaveBeenCalledTimes(1);
    const [, datos] = vi.mocked(unidadTrabajo.registrarEventoYActualizarKilometraje).mock.calls[0]!;
    expect(datos.vehiculoActualizado?.kilometrosActuales).toBe(120_005);
  });

  it('propaga el error y NO deja el evento guardado si falla la actualización de kilometraje requerida', async () => {
    const unidadTrabajo: UnidadTrabajoVehiculos = {
      registrarEventoYActualizarKilometraje: vi.fn(async () => {
        throw new Error('Fallo persistiendo kilometraje del vehículo.');
      }),
    };

    await expect(
      registrarEventoVehiculo(
        {
          repositorioVehiculos: repositorioVehiculosFalso(),
          unidadTrabajoVehiculos: unidadTrabajo,
          contextoFamiliar: new ContextoFamiliarTemporal(hogarA),
          proveedorFecha: { ahora: () => new Date('2026-02-01T10:00:00.000Z') },
        },
        {
          id: crearIdentificador('evento-1'),
          vehiculoId,
          tipo: 'mantenimiento',
          descripcion: 'Cambio de aceite',
          kilometros: 120_005,
          fecha: new Date('2026-02-01T00:00:00.000Z'),
        },
      ),
    ).rejects.toThrow('Fallo persistiendo kilometraje del vehículo.');

    expect(unidadTrabajo.registrarEventoYActualizarKilometraje).toHaveBeenCalledTimes(1);
  });

  it('registra un evento histórico sin exigir actualización de kilometraje (vehiculoActualizado queda undefined)', async () => {
    const unidadTrabajo: UnidadTrabajoVehiculos = {
      registrarEventoYActualizarKilometraje: vi.fn(async () => undefined),
    };

    await registrarEventoVehiculo(
      {
        repositorioVehiculos: repositorioVehiculosFalso(),
        unidadTrabajoVehiculos: unidadTrabajo,
        contextoFamiliar: new ContextoFamiliarTemporal(hogarA),
        proveedorFecha: { ahora: () => new Date('2026-02-01T10:00:00.000Z') },
      },
      {
        id: crearIdentificador('evento-2'),
        vehiculoId,
        tipo: 'mantenimiento',
        descripcion: 'Revisión histórica',
        kilometros: 118_000,
        fecha: new Date('2025-06-01T00:00:00.000Z'),
      },
    );

    const [, datos] = vi.mocked(unidadTrabajo.registrarEventoYActualizarKilometraje).mock.calls[0]!;
    expect(datos.vehiculoActualizado).toBeUndefined();
    expect(datos.evento.kilometros).toBe(118_000);
  });
});
