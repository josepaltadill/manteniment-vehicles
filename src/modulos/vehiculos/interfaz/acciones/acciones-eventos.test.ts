import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { ContextoFamiliarTemporal } from '../../aplicacion/pruebas/contexto-familiar-temporal';
import { RepositorioEventosVehiculoEnMemoria } from '../../aplicacion/pruebas/repositorio-eventos-vehiculo-en-memoria';
import { RepositorioVehiculosEnMemoria } from '../../aplicacion/pruebas/repositorio-vehiculos-en-memoria';
import { registrarVehiculo } from '../../aplicacion/casos-uso/registrar-vehiculo';
import { procesarCorregirKilometraje, procesarRegistrarEvento } from './acciones-eventos';

const hogarA = crearIdentificador('hogar-a');
const proveedorFechaFija = { ahora: () => new Date('2026-05-01T10:00:00.000Z') };

async function dependenciasConVehiculo() {
  const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
  const repositorioEventosVehiculo = new RepositorioEventosVehiculoEnMemoria(repositorioVehiculos);
  const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);

  const vehiculo = await registrarVehiculo(
    { repositorioVehiculos, contextoFamiliar },
    {
      id: crearIdentificador('vehiculo-1'),
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2019,
      combustible: 'gasolina',
      matricula: '1234 ABC',
      kilometrosActuales: 120_000,
      fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
      fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
    },
  );

  return {
    dependencias: {
      repositorioVehiculos,
      unidadTrabajoVehiculos: repositorioEventosVehiculo,
      contextoFamiliar,
      proveedorFecha: proveedorFechaFija,
    },
    vehiculo,
  };
}

const entradaEventoValida = (vehiculoId: string) => ({
  vehiculoId,
  tipo: 'mantenimiento',
  descripcion: 'Cambio de aceite',
  kilometros: '120005',
  fecha: '2026-02-01',
  proveedor: 'Taller X',
  coste: '300',
});

describe('procesarRegistrarEvento', () => {
  it('registra un evento válido y actualiza el kilometraje del vehículo', async () => {
    const { dependencias, vehiculo } = await dependenciasConVehiculo();

    const resultado = await procesarRegistrarEvento(dependencias, entradaEventoValida(vehiculo.id.valor));

    expect(resultado.exito).toBe(true);
    const vehiculoActualizado = await dependencias.repositorioVehiculos.buscarPorId(hogarA, vehiculo.id);
    expect(vehiculoActualizado?.kilometrosActuales).toBe(120_005);
  });

  it('rechaza un evento sin descripción', async () => {
    const { dependencias, vehiculo } = await dependenciasConVehiculo();
    const { descripcion: _omitida, ...entradaIncompleta } = entradaEventoValida(vehiculo.id.valor);

    const resultado = await procesarRegistrarEvento(dependencias, entradaIncompleta);

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.erroresCampos?.descripcion).toBeDefined();
    }
  });

  it('informa un mensaje comprensible si el vehículo no existe', async () => {
    const { dependencias } = await dependenciasConVehiculo();

    const resultado = await procesarRegistrarEvento(dependencias, entradaEventoValida('vehiculo-inexistente'));

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.mensaje).toBe('No existe el vehículo indicado.');
    }
  });
});

describe('procesarCorregirKilometraje', () => {
  it('corrige el kilometraje hacia abajo', async () => {
    const { dependencias, vehiculo } = await dependenciasConVehiculo();

    const resultado = await procesarCorregirKilometraje(dependencias, {
      vehiculoId: vehiculo.id.valor,
      kilometrosActuales: '119500',
    });

    expect(resultado.exito).toBe(true);
    const vehiculoActualizado = await dependencias.repositorioVehiculos.buscarPorId(hogarA, vehiculo.id);
    expect(vehiculoActualizado?.kilometrosActuales).toBe(119_500);
  });

  it('rechaza un kilometraje negativo', async () => {
    const { dependencias, vehiculo } = await dependenciasConVehiculo();

    const resultado = await procesarCorregirKilometraje(dependencias, {
      vehiculoId: vehiculo.id.valor,
      kilometrosActuales: '-1',
    });

    expect(resultado.exito).toBe(false);
  });
});
