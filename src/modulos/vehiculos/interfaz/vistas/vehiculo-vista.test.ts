import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearVehiculo } from '../../dominio/vehiculo';
import { aVehiculoVista } from './vehiculo-vista';

const datosBase = () => ({
  id: crearIdentificador('vehiculo-1'),
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2019,
  combustible: 'gasolina',
  matricula: '1234 ABC',
  kilometrosActuales: 120_000,
  fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
  fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
});

describe('aVehiculoVista', () => {
  it('proyecta un vehículo activo sin fecha de desactivación', () => {
    const vehiculo = crearVehiculo(datosBase());

    const vista = aVehiculoVista(vehiculo);

    expect(vista).toEqual({
      id: 'vehiculo-1',
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2019,
      combustible: 'gasolina',
      matricula: '1234 ABC',
      kilometrosActuales: 120_000,
      estado: 'activo',
      fechaCompra: '2020-02-01T00:00:00.000Z',
      fechaAltaAplicacion: '2026-01-10T10:00:00.000Z',
      fechaDesactivacion: undefined,
    });
  });

  it('proyecta un vehículo inactivo con su fecha de desactivación', () => {
    const vehiculo = crearVehiculo(datosBase()).desactivar(new Date('2026-03-01T00:00:00.000Z'));

    const vista = aVehiculoVista(vehiculo);

    expect(vista.estado).toBe('inactivo');
    expect(vista.fechaDesactivacion).toBe('2026-03-01T00:00:00.000Z');
  });
});
