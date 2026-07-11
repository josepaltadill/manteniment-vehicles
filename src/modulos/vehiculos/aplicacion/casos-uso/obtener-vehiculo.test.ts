import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import { ProveedorIdentidadTemporal } from '../pruebas/proveedor-identidad-temporal';
import { RepositorioVehiculosEnMemoria } from '../pruebas/repositorio-vehiculos-en-memoria';
import { registrarVehiculo } from './registrar-vehiculo';
import { obtenerVehiculo } from './obtener-vehiculo';

const hogarA = crearIdentificador('hogar-a');
const hogarB = crearIdentificador('hogar-b');

const entradaVehiculo = () => ({
  id: crearIdentificador('vehiculo-1234 ABC'),
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2019,
  combustible: 'gasolina',
  matricula: '1234 ABC',
  kilometrosActuales: 120_000,
  fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
  fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
});

describe('obtenerVehiculo', () => {
  it('devuelve el vehículo cuando existe en el hogar actual', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const proveedorIdentidad = new ProveedorIdentidadTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, proveedorIdentidad }, entradaVehiculo());

    const vehiculo = await obtenerVehiculo(
      { repositorioVehiculos, proveedorIdentidad },
      { vehiculoId: crearIdentificador('vehiculo-1234 ABC') },
    );

    expect(vehiculo.matricula).toBe('1234 ABC');
  });

  it('lanza ErrorDominio si el vehículo no existe en el hogar actual', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const proveedorIdentidad = new ProveedorIdentidadTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, proveedorIdentidad }, entradaVehiculo());

    const proveedorIdentidadHogarB = new ProveedorIdentidadTemporal(hogarB);

    await expect(
      obtenerVehiculo(
        { repositorioVehiculos, proveedorIdentidad: proveedorIdentidadHogarB },
        { vehiculoId: crearIdentificador('vehiculo-1234 ABC') },
      ),
    ).rejects.toThrow(new ErrorDominio('No existe el vehículo indicado.'));
  });
});
