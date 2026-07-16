import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { ErrorDominio } from '../../dominio/errores-dominio';
import { corregirKilometraje } from './corregir-kilometraje';
import { desactivarVehiculo } from './desactivar-vehiculo';
import { listarVehiculos } from './listar-vehiculos';
import { registrarEventoVehiculo } from './registrar-evento-vehiculo';
import { registrarVehiculo } from './registrar-vehiculo';
import { ContextoFamiliarTemporal } from '../pruebas/contexto-familiar-temporal';
import { RepositorioEventosVehiculoEnMemoria } from '../pruebas/repositorio-eventos-vehiculo-en-memoria';
import { RepositorioVehiculosEnMemoria } from '../pruebas/repositorio-vehiculos-en-memoria';
const fecha = (iso: string) => new Date(iso);
const entradaVehiculo = (matricula = '1234 ABC') => ({
  id: crearIdentificador(`vehiculo-${matricula}`),
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2019,
  combustible: 'gasolina',
  matricula,
  kilometrosActuales: 120_000,
  fechaCompra: fecha('2020-02-01T00:00:00.000Z'),
  fechaAltaAplicacion: fecha('2026-01-10T10:00:00.000Z'),
});
const entradaEvento = (vehiculoId = crearIdentificador('vehiculo-1234 ABC'), kilometros = 120_005) => ({
  id: crearIdentificador(`evento-${kilometros}`),
  vehiculoId,
  tipo: 'mantenimiento' as const,
  descripcion: 'Cambio de aceite',
  kilometros,
  fecha: fecha('2026-02-01T00:00:00.000Z'),
  proveedor: 'Taller X',
  coste: 300,
  notas: 'Filtro incluido',
});
class RepositorioVehiculosEnMemoriaConFallo extends RepositorioVehiculosEnMemoria {
  #fallarSiguienteGuardado = false;

  fallarSiguienteGuardado(): void {
    this.#fallarSiguienteGuardado = true;
  }

  override async guardar(...parametros: Parameters<RepositorioVehiculosEnMemoria['guardar']>): Promise<void> {
    if (this.#fallarSiguienteGuardado) {
      this.#fallarSiguienteGuardado = false;
      throw new Error('Fallo persistiendo vehículo.');
    }

    await super.guardar(...parametros);
  }
}
const hogarA = crearIdentificador('hogar-a');
const hogarB = crearIdentificador('hogar-b');
describe('casos de uso de vehículos', () => {
  it('registra y lista vehículos con actor temporal', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    const vehiculos = await listarVehiculos({ repositorioVehiculos, contextoFamiliar });
    expect(vehiculos).toHaveLength(1);
    expect(vehiculos[0]?.matricula).toBe('1234 ABC');
  });
  it('rechaza matrícula duplicada dentro del mismo hogar aunque el vehículo anterior esté inactivo', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo('1234 ABC'));
    await desactivarVehiculo(
      { repositorioVehiculos, contextoFamiliar, proveedorFecha: { ahora: () => fecha('2026-03-01T00:00:00.000Z') } },
      { vehiculoId: crearIdentificador('vehiculo-1234 ABC') },
    );
    await expect(
      registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo('1234 ABC')),
    ).rejects.toThrow(new ErrorDominio('Ya existe un vehículo con esa matrícula.'));
  });
  it('permite matrículas que difieren solo en mayúsculas/minúsculas dentro del mismo hogar (comparación sensible a mayúsculas, igual que el adaptador Supabase real y la restricción `unique` de la migración)', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo('1234 ABC'));

    const vehiculoMinusculas = await registrarVehiculo(
      { repositorioVehiculos, contextoFamiliar },
      { ...entradaVehiculo('1234 abc'), id: crearIdentificador('vehiculo-1234-abc-minusculas') },
    );

    expect(vehiculoMinusculas.matricula).toBe('1234 abc');
  });

  it('permite la misma matrícula en un hogar distinto', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliarHogarA = new ContextoFamiliarTemporal(hogarA);
    const contextoFamiliarHogarB = new ContextoFamiliarTemporal(hogarB);
    await registrarVehiculo(
      { repositorioVehiculos, contextoFamiliar: contextoFamiliarHogarA },
      entradaVehiculo('1234 ABC'),
    );
    const vehiculoHogarB = await registrarVehiculo(
      { repositorioVehiculos, contextoFamiliar: contextoFamiliarHogarB },
      entradaVehiculo('1234 ABC'),
    );
    expect(vehiculoHogarB.matricula).toBe('1234 ABC');
  });
  it('aísla listar y buscarPorId por hogar: un hogar no ve vehículos de otro', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliarHogarA = new ContextoFamiliarTemporal(hogarA);
    const contextoFamiliarHogarB = new ContextoFamiliarTemporal(hogarB);
    await registrarVehiculo(
      { repositorioVehiculos, contextoFamiliar: contextoFamiliarHogarA },
      entradaVehiculo('1234 ABC'),
    );
    const vehiculosHogarB = await listarVehiculos({ repositorioVehiculos, contextoFamiliar: contextoFamiliarHogarB });
    const vehiculoDesdeHogarB = await repositorioVehiculos.buscarPorId(
      hogarB,
      crearIdentificador('vehiculo-1234 ABC'),
    );
    expect(vehiculosHogarB).toHaveLength(0);
    expect(vehiculoDesdeHogarB).toBeNull();
  });
  it('desactiva un vehículo sin borrar sus eventos', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const repositorioEventos = new RepositorioEventosVehiculoEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    await repositorioEventos.guardar(hogarA, crearEventoVehiculo({
      ...entradaEvento(),
      fechaCreacion: fecha('2026-02-01T10:00:00.000Z'),
    }));
    await desactivarVehiculo(
      { repositorioVehiculos, contextoFamiliar, proveedorFecha: { ahora: () => fecha('2026-03-01T00:00:00.000Z') } },
      { vehiculoId: crearIdentificador('vehiculo-1234 ABC') },
    );
    const vehiculo = await repositorioVehiculos.buscarPorId(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    const eventos = await repositorioEventos.listarPorVehiculo(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    expect(vehiculo?.estado).toBe('inactivo');
    expect(eventos).toHaveLength(1);
  });
  it('registra evento y actualiza kilometraje cuando el evento es más reciente', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const unidadTrabajo = new RepositorioEventosVehiculoEnMemoria(repositorioVehiculos);
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    await registrarEventoVehiculo(
      { repositorioVehiculos, unidadTrabajoVehiculos: unidadTrabajo, contextoFamiliar, proveedorFecha: { ahora: () => fecha('2026-02-01T10:00:00.000Z') } },
      entradaEvento(),
    );
    const vehiculo = await repositorioVehiculos.buscarPorId(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    const eventos = await unidadTrabajo.listarPorVehiculo(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    expect(vehiculo?.kilometrosActuales).toBe(120_005);
    expect(eventos[0]?.kilometros).toBe(120_005);
  });
  it('no deja guardado el evento si falla la actualización de kilometraje', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoriaConFallo();
    const unidadTrabajo = new RepositorioEventosVehiculoEnMemoria(repositorioVehiculos);
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    repositorioVehiculos.fallarSiguienteGuardado();
    await expect(
      registrarEventoVehiculo(
        { repositorioVehiculos, unidadTrabajoVehiculos: unidadTrabajo, contextoFamiliar, proveedorFecha: { ahora: () => fecha('2026-02-01T10:00:00.000Z') } },
        entradaEvento(),
      ),
    ).rejects.toThrow('Fallo persistiendo vehículo.');
    const vehiculo = await repositorioVehiculos.buscarPorId(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    const eventos = await unidadTrabajo.listarPorVehiculo(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    expect(vehiculo?.kilometrosActuales).toBe(120_000);
    expect(eventos).toHaveLength(0);
  });
  it('registra evento histórico sin bajar automáticamente el kilometraje', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const unidadTrabajo = new RepositorioEventosVehiculoEnMemoria(repositorioVehiculos);
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    await registrarEventoVehiculo(
      { repositorioVehiculos, unidadTrabajoVehiculos: unidadTrabajo, contextoFamiliar, proveedorFecha: { ahora: () => fecha('2026-02-01T10:00:00.000Z') } },
      entradaEvento(crearIdentificador('vehiculo-1234 ABC'), 118_000),
    );
    const vehiculo = await repositorioVehiculos.buscarPorId(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    const eventos = await unidadTrabajo.listarPorVehiculo(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    expect(vehiculo?.kilometrosActuales).toBe(120_000);
    expect(eventos[0]?.kilometros).toBe(118_000);
  });
  it('corrige manualmente el kilometraje hacia arriba o hacia abajo', async () => {
    const repositorioVehiculos = new RepositorioVehiculosEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await registrarVehiculo({ repositorioVehiculos, contextoFamiliar }, entradaVehiculo());
    await corregirKilometraje({ repositorioVehiculos, contextoFamiliar }, { vehiculoId: crearIdentificador('vehiculo-1234 ABC'), kilometrosActuales: 121_000 });
    await corregirKilometraje({ repositorioVehiculos, contextoFamiliar }, { vehiculoId: crearIdentificador('vehiculo-1234 ABC'), kilometrosActuales: 119_500 });
    const vehiculo = await repositorioVehiculos.buscarPorId(hogarA, crearIdentificador('vehiculo-1234 ABC'));
    expect(vehiculo?.kilometrosActuales).toBe(119_500);
  });
});
