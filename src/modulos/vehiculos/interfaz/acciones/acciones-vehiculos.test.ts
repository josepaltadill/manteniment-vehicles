import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { ContextoFamiliarTemporal } from '../../aplicacion/pruebas/contexto-familiar-temporal';
import { RepositorioVehiculosEnMemoria } from '../../aplicacion/pruebas/repositorio-vehiculos-en-memoria';

const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();
const crearDependenciasVehiculosMock = vi.fn();

vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePathMock(...args) }));
vi.mock('next/navigation', () => ({ redirect: (...args: unknown[]) => redirectMock(...args) }));
vi.mock('../../../../composicion/servidor/alcance-familiar-por-solicitud', () => ({
  crearDependenciasVehiculosPorSolicitud: (...args: unknown[]) => crearDependenciasVehiculosMock(...args),
}));

const {
  accionDesactivarVehiculo,
  accionRegistrarVehiculo,
  procesarDesactivarVehiculo,
  procesarRegistrarVehiculo,
} = await import('./acciones-vehiculos');

const hogarA = crearIdentificador('hogar-a');
const proveedorFechaFija = { ahora: () => new Date('2026-05-01T10:00:00.000Z') };

const entradaFormularioValida = () => ({
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: '2019',
  combustible: 'gasolina',
  matricula: '1234 ABC',
  kilometrosActuales: '120000',
  fechaCompra: '2020-02-01',
});

function dependencias() {
  return {
    repositorioVehiculos: new RepositorioVehiculosEnMemoria(),
    contextoFamiliar: new ContextoFamiliarTemporal(hogarA),
    proveedorFecha: proveedorFechaFija,
  };
}

describe('procesarRegistrarVehiculo', () => {
  it('registra un vehículo válido y devuelve su vista', async () => {
    const resultado = await procesarRegistrarVehiculo(dependencias(), entradaFormularioValida());

    expect(resultado.exito).toBe(true);
    if (resultado.exito) {
      expect(resultado.datos.matricula).toBe('1234 ABC');
      expect(resultado.datos.fechaAltaAplicacion).toBe('2026-05-01T10:00:00.000Z');
    }
  });

  it('rechaza el alta incompleta e informa qué campo falta', async () => {
    const { matricula: _omitida, ...entradaIncompleta } = entradaFormularioValida();

    const resultado = await procesarRegistrarVehiculo(dependencias(), entradaIncompleta);

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.erroresCampos?.matricula).toBeDefined();
    }
  });

  it('informa un mensaje comprensible cuando la matrícula ya existe en el hogar', async () => {
    const deps = dependencias();
    await procesarRegistrarVehiculo(deps, entradaFormularioValida());

    const resultado = await procesarRegistrarVehiculo(deps, entradaFormularioValida());

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.mensaje).toBe('Ya existe un vehículo con esa matrícula.');
    }
  });
});

describe('procesarDesactivarVehiculo', () => {
  it('desactiva un vehículo existente', async () => {
    const deps = dependencias();
    const registro = await procesarRegistrarVehiculo(deps, entradaFormularioValida());
    if (!registro.exito) throw new Error('setup falló');

    const resultado = await procesarDesactivarVehiculo(deps, { vehiculoId: registro.datos.id });

    expect(resultado.exito).toBe(true);
    const vehiculo = await deps.repositorioVehiculos.buscarPorId(hogarA, crearIdentificador(registro.datos.id));
    expect(vehiculo?.estado).toBe('inactivo');
  });

  it('informa un mensaje comprensible si el vehículo no existe', async () => {
    const resultado = await procesarDesactivarVehiculo(dependencias(), { vehiculoId: 'vehiculo-inexistente' });

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.mensaje).toBe('No existe el vehículo indicado.');
    }
  });
});

describe('accionRegistrarVehiculo (envoltorio de server action)', () => {
  afterEach(() => {
    revalidatePathMock.mockClear();
    redirectMock.mockClear();
    crearDependenciasVehiculosMock.mockClear();
  });

  function formDataDesde(entrada: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [clave, valor] of Object.entries(entrada)) {
      formData.set(clave, valor);
    }
    return formData;
  }

  it('parsea el FormData, invoca procesarRegistrarVehiculo y redirige solo si hay éxito', async () => {
    crearDependenciasVehiculosMock.mockResolvedValue(dependencias());

    const resultado = await accionRegistrarVehiculo(undefined, formDataDesde(entradaFormularioValida()));

    expect(resultado.exito).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith('/vehiculos');
    expect(redirectMock).toHaveBeenCalledWith('/vehiculos');
  });

  it('no redirige ni revalida cuando el FormData es inválido', async () => {
    crearDependenciasVehiculosMock.mockResolvedValue(dependencias());
    const { matricula: _omitida, ...entradaIncompleta } = entradaFormularioValida();

    const resultado = await accionRegistrarVehiculo(undefined, formDataDesde(entradaIncompleta));

    expect(resultado.exito).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe('accionDesactivarVehiculo (envoltorio de server action)', () => {
  afterEach(() => {
    revalidatePathMock.mockClear();
    crearDependenciasVehiculosMock.mockClear();
  });

  it('devuelve el resultado de fallo en vez de descartarlo cuando el vehículo no existe', async () => {
    crearDependenciasVehiculosMock.mockResolvedValue(dependencias());
    const formData = new FormData();
    formData.set('vehiculoId', 'vehiculo-inexistente');

    const resultado = await accionDesactivarVehiculo(undefined, formData);

    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.mensaje).toBe('No existe el vehículo indicado.');
    }
    expect(revalidatePathMock).toHaveBeenCalledWith('/vehiculos');
  });

  it('devuelve éxito cuando el vehículo se desactiva correctamente', async () => {
    const deps = dependencias();
    crearDependenciasVehiculosMock.mockResolvedValue(deps);
    const registro = await procesarRegistrarVehiculo(deps, entradaFormularioValida());
    if (!registro.exito) throw new Error('setup falló');

    const formData = new FormData();
    formData.set('vehiculoId', registro.datos.id);

    const resultado = await accionDesactivarVehiculo(undefined, formData);

    expect(resultado.exito).toBe(true);
  });
});
