import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { crearVehiculo } from '../../dominio/vehiculo';
import {
  aEventoVehiculoDesdeFila,
  aFilaEventoVehiculo,
  aFilaVehiculo,
  aVehiculoDesdeFila,
} from './mapeadores-supabase';

const householdId = crearIdentificador('11111111-1111-4111-8111-111111111111');

describe('mapeadores Supabase de vehículo', () => {
  it('mapea un vehículo activo del dominio a una fila fam_ve_vehiculos con household_id y sin columnas inexistentes', () => {
    const vehiculo = crearVehiculo({
      id: crearIdentificador('22222222-2222-4222-8222-222222222222'),
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2019,
      combustible: 'gasolina',
      matricula: '1234 ABC',
      kilometrosActuales: 120_000,
      fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
      fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
    });

    const fila = aFilaVehiculo(householdId, vehiculo);

    expect(fila).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      household_id: '11111111-1111-4111-8111-111111111111',
      marca: 'Toyota',
      modelo: 'Corolla',
      combustible: 'gasolina',
      matricula: '1234 ABC',
      anio: 2019,
      kilometros_actuales: 120_000,
      estado: 'activo',
      fecha_compra: '2020-02-01T00:00:00.000Z',
      fecha_alta_aplicacion: '2026-01-10T10:00:00.000Z',
      fecha_desactivacion: null,
    });
    expect(fila).not.toHaveProperty('creado_en');
    expect(fila).not.toHaveProperty('actualizado_en');
  });

  it('mapea un vehículo inactivo del dominio a una fila coherente estado/fecha_desactivacion', () => {
    const vehiculoInactivo = crearVehiculo({
      id: crearIdentificador('22222222-2222-4222-8222-222222222222'),
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2019,
      combustible: 'gasolina',
      matricula: '1234 ABC',
      kilometrosActuales: 120_000,
      fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
      fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
    }).desactivar(new Date('2026-03-15T08:30:00.000Z'));

    const fila = aFilaVehiculo(householdId, vehiculoInactivo);

    expect(fila.estado).toBe('inactivo');
    expect(fila.fecha_desactivacion).toBe('2026-03-15T08:30:00.000Z');
  });

  it('mapea una fila fam_ve_vehiculos activa a un vehículo de dominio equivalente', () => {
    const vehiculo = aVehiculoDesdeFila({
      id: '22222222-2222-4222-8222-222222222222',
      household_id: '11111111-1111-4111-8111-111111111111',
      marca: 'Toyota',
      modelo: 'Corolla',
      combustible: 'gasolina',
      matricula: '1234 ABC',
      anio: 2019,
      kilometros_actuales: 120_000,
      estado: 'activo',
      fecha_compra: '2020-02-01T00:00:00.000Z',
      fecha_alta_aplicacion: '2026-01-10T10:00:00.000Z',
      fecha_desactivacion: null,
    });

    expect(vehiculo.id.valor).toBe('22222222-2222-4222-8222-222222222222');
    expect(vehiculo.estado).toBe('activo');
    expect(vehiculo.fechaDesactivacion).toBeUndefined();
    expect(vehiculo.fechaCompra.toISOString()).toBe('2020-02-01T00:00:00.000Z');
  });

  it('mapea una fila fam_ve_vehiculos inactiva a un vehículo inactivo reconstruido, sin pasar por desactivar()', () => {
    const vehiculo = aVehiculoDesdeFila({
      id: '22222222-2222-4222-8222-222222222222',
      household_id: '11111111-1111-4111-8111-111111111111',
      marca: 'Toyota',
      modelo: 'Corolla',
      combustible: 'gasolina',
      matricula: '1234 ABC',
      anio: 2019,
      kilometros_actuales: 120_000,
      estado: 'inactivo',
      fecha_compra: '2020-02-01T00:00:00.000Z',
      fecha_alta_aplicacion: '2026-01-10T10:00:00.000Z',
      fecha_desactivacion: '2026-03-15T08:30:00.000Z',
    });

    expect(vehiculo.estado).toBe('inactivo');
    expect(vehiculo.fechaDesactivacion?.toISOString()).toBe('2026-03-15T08:30:00.000Z');
  });
});

describe('mapeadores Supabase de evento de vehículo', () => {
  const vehiculoId = crearIdentificador('22222222-2222-4222-8222-222222222222');

  it('mapea un evento del dominio a una fila fam_ve_eventos_vehiculo con household_id y vehiculo_id (FK compuesta)', () => {
    const evento = crearEventoVehiculo({
      id: crearIdentificador('33333333-3333-4333-8333-333333333333'),
      vehiculoId,
      tipo: 'mantenimiento',
      descripcion: 'Cambio de aceite',
      kilometros: 120_005,
      fecha: new Date('2026-02-01T00:00:00.000Z'),
      proveedor: 'Taller X',
      coste: 300,
      notas: 'Filtro incluido',
      proximoVencimientoKm: 130_000,
      proximoVencimientoFecha: new Date('2027-02-01T00:00:00.000Z'),
      fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
    });

    const fila = aFilaEventoVehiculo(householdId, evento);

    expect(fila).toEqual({
      id: '33333333-3333-4333-8333-333333333333',
      household_id: '11111111-1111-4111-8111-111111111111',
      vehiculo_id: '22222222-2222-4222-8222-222222222222',
      tipo: 'mantenimiento',
      descripcion: 'Cambio de aceite',
      kilometros: 120_005,
      fecha: '2026-02-01T00:00:00.000Z',
      proveedor: 'Taller X',
      moneda: 'EUR',
      notas: 'Filtro incluido',
      coste: 300,
      proximo_vencimiento_km: 130_000,
      proximo_vencimiento_fecha: '2027-02-01T00:00:00.000Z',
      fecha_creacion: '2026-02-01T10:00:00.000Z',
    });
  });

  it('mapea un evento sin coste ni vencimientos a una fila con nulos explícitos, no columnas ausentes', () => {
    const evento = crearEventoVehiculo({
      id: crearIdentificador('33333333-3333-4333-8333-333333333333'),
      vehiculoId,
      tipo: 'averia',
      descripcion: 'Ruido en el motor',
      kilometros: 118_000,
      fecha: new Date('2026-02-01T00:00:00.000Z'),
      fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
    });

    const fila = aFilaEventoVehiculo(householdId, evento);

    expect(fila.coste).toBeNull();
    expect(fila.proveedor).toBeNull();
    expect(fila.moneda).toBeNull();
    expect(fila.proximo_vencimiento_km).toBeNull();
    expect(fila.proximo_vencimiento_fecha).toBeNull();
  });

  it('mapea una fila fam_ve_eventos_vehiculo a un evento de dominio equivalente, usando fecha_creacion (no creado_en)', () => {
    const evento = aEventoVehiculoDesdeFila({
      id: '33333333-3333-4333-8333-333333333333',
      household_id: '11111111-1111-4111-8111-111111111111',
      vehiculo_id: '22222222-2222-4222-8222-222222222222',
      tipo: 'mantenimiento',
      descripcion: 'Cambio de aceite',
      kilometros: 120_005,
      fecha: '2026-02-01T00:00:00.000Z',
      proveedor: 'Taller X',
      moneda: 'EUR',
      notas: 'Filtro incluido',
      coste: 300,
      proximo_vencimiento_km: 130_000,
      proximo_vencimiento_fecha: '2027-02-01T00:00:00.000Z',
      fecha_creacion: '2026-02-01T10:00:00.000Z',
    });

    expect(evento.vehiculoId.valor).toBe('22222222-2222-4222-8222-222222222222');
    expect(evento.fechaCreacion.toISOString()).toBe('2026-02-01T10:00:00.000Z');
    expect(evento.coste).toBe(300);
    expect(evento.proximoVencimientoFecha?.toISOString()).toBe('2027-02-01T00:00:00.000Z');
  });
});
