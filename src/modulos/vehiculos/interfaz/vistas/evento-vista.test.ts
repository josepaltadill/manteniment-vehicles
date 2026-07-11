import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { aEventoVista } from './evento-vista';

const eventoBase = () =>
  crearEventoVehiculo({
    id: crearIdentificador('evento-1'),
    vehiculoId: crearIdentificador('vehiculo-1'),
    tipo: 'mantenimiento',
    descripcion: 'Cambio de aceite',
    kilometros: 120_005,
    fecha: new Date('2026-02-01T00:00:00.000Z'),
    proveedor: 'Taller X',
    coste: 300,
    proximoVencimientoKm: 130_000,
    proximoVencimientoFecha: new Date('2027-01-01T00:00:00.000Z'),
    fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
  });

describe('aEventoVista', () => {
  it('marca el evento como vencido cuando el kilometraje actual ya alcanzó el próximo vencimiento por km', () => {
    const vista = aEventoVista(eventoBase(), {
      kilometrosActuales: 130_000,
      fechaActual: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(vista.estadoVencimiento).toBe('vencido');
    expect(vista.coste).toBe(300);
    expect(vista.moneda).toBe('EUR');
  });

  it('marca el evento como vencido cuando solo la fecha de vencimiento ya se alcanzó (km bajo el umbral)', () => {
    const vista = aEventoVista(eventoBase(), {
      kilometrosActuales: 121_000,
      fechaActual: new Date('2027-02-01T00:00:00.000Z'),
    });

    expect(vista.estadoVencimiento).toBe('vencido');
  });

  it('marca el evento como pendiente cuando el km está justo por debajo del umbral y la fecha justo por debajo (ambos forwarded correctamente)', () => {
    const vista = aEventoVista(eventoBase(), {
      kilometrosActuales: 129_999,
      fechaActual: new Date('2026-12-31T23:59:59.999Z'),
    });

    expect(vista.estadoVencimiento).toBe('pendiente');
  });

  it('marca el evento como pendiente cuando ninguna condición de vencimiento llegó', () => {
    const vista = aEventoVista(eventoBase(), {
      kilometrosActuales: 125_000,
      fechaActual: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(vista.estadoVencimiento).toBe('pendiente');
  });

  it('marca el evento como sin vencimiento cuando no tiene próximos vencimientos', () => {
    const eventoSinVencimiento = crearEventoVehiculo({
      id: crearIdentificador('evento-2'),
      vehiculoId: crearIdentificador('vehiculo-1'),
      tipo: 'averia',
      descripcion: 'Pinchazo',
      kilometros: 100,
      fecha: new Date('2026-02-01T00:00:00.000Z'),
      fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
    });

    const vista = aEventoVista(eventoSinVencimiento, {
      kilometrosActuales: 125_000,
      fechaActual: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(vista.estadoVencimiento).toBe('sin_vencimiento');
    expect(vista.coste).toBeUndefined();
  });
});
