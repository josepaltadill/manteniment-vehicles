import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { ContextoFamiliarTemporal } from '../pruebas/contexto-familiar-temporal';
import { RepositorioEventosVehiculoEnMemoria } from '../pruebas/repositorio-eventos-vehiculo-en-memoria';
import { listarEventosVehiculo } from './listar-eventos-vehiculo';

const hogarA = crearIdentificador('hogar-a');
const hogarB = crearIdentificador('hogar-b');
const vehiculoId = crearIdentificador('vehiculo-1234 ABC');

const entradaEvento = (id: string, kilometros: number) => ({
  id: crearIdentificador(id),
  vehiculoId,
  tipo: 'mantenimiento' as const,
  descripcion: 'Cambio de aceite',
  kilometros,
  fecha: new Date('2026-02-01T00:00:00.000Z'),
  fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
});

describe('listarEventosVehiculo', () => {
  it('lista los eventos del vehículo indicado en el hogar actual', async () => {
    const repositorioEventos = new RepositorioEventosVehiculoEnMemoria();
    const contextoFamiliar = new ContextoFamiliarTemporal(hogarA);
    await repositorioEventos.guardar(hogarA, crearEventoVehiculo(entradaEvento('evento-1', 120_005)));

    const eventos = await listarEventosVehiculo(
      { repositorioEventosVehiculo: repositorioEventos, contextoFamiliar },
      { vehiculoId },
    );

    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.kilometros).toBe(120_005);
  });

  it('no devuelve eventos de otro hogar aunque compartan vehiculoId', async () => {
    const repositorioEventos = new RepositorioEventosVehiculoEnMemoria();
    await repositorioEventos.guardar(hogarA, crearEventoVehiculo(entradaEvento('evento-1', 120_005)));
    const contextoFamiliarHogarB = new ContextoFamiliarTemporal(hogarB);

    const eventos = await listarEventosVehiculo(
      { repositorioEventosVehiculo: repositorioEventos, contextoFamiliar: contextoFamiliarHogarB },
      { vehiculoId },
    );

    expect(eventos).toHaveLength(0);
  });
});
