import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../compartido/dominio/identificador';
import { ErrorDominio } from './errores-dominio';
import { crearVehiculo } from './vehiculo';

const datosValidos = () => ({
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

describe('Vehiculo', () => {
  it('crea un vehículo válido activo con sus datos obligatorios', () => {
    const vehiculo = crearVehiculo(datosValidos());

    expect(vehiculo.id.valor).toBe('vehiculo-1');
    expect(vehiculo.marca).toBe('Toyota');
    expect(vehiculo.modelo).toBe('Corolla');
    expect(vehiculo.anio).toBe(2019);
    expect(vehiculo.combustible).toBe('gasolina');
    expect(vehiculo.matricula).toBe('1234 ABC');
    expect(vehiculo.kilometrosActuales).toBe(120_000);
    expect(vehiculo.estado).toBe('activo');
    expect(vehiculo.fechaCompra.toISOString()).toBe('2020-02-01T00:00:00.000Z');
    expect(vehiculo.fechaAltaAplicacion.toISOString()).toBe('2026-01-10T10:00:00.000Z');
    expect(vehiculo.fechaDesactivacion).toBeUndefined();
  });

  it('rechaza kilometraje negativo', () => {
    expect(() =>
      crearVehiculo({
        ...datosValidos(),
        kilometrosActuales: -1,
      }),
    ).toThrow(new ErrorDominio('El kilometraje actual no puede ser negativo.'));
  });

  it('desactiva un vehículo con baja lógica sin borrar sus datos', () => {
    const vehiculo = crearVehiculo(datosValidos());
    const fechaDesactivacion = new Date('2026-03-15T08:30:00.000Z');

    const vehiculoInactivo = vehiculo.desactivar(fechaDesactivacion);

    expect(vehiculoInactivo.estado).toBe('inactivo');
    expect(vehiculoInactivo.fechaDesactivacion?.toISOString()).toBe('2026-03-15T08:30:00.000Z');
    expect(vehiculoInactivo.id.valor).toBe('vehiculo-1');
    expect(vehiculoInactivo.matricula).toBe('1234 ABC');
    expect(vehiculoInactivo.kilometrosActuales).toBe(120_000);
  });

  it('permite corregir manualmente el kilometraje hacia arriba', () => {
    const vehiculo = crearVehiculo(datosValidos());

    const vehiculoCorregido = vehiculo.corregirKilometraje(121_000);

    expect(vehiculoCorregido.kilometrosActuales).toBe(121_000);
    expect(vehiculoCorregido.estado).toBe('activo');
  });

  it('permite corregir manualmente el kilometraje hacia abajo', () => {
    const vehiculo = crearVehiculo(datosValidos());

    const vehiculoCorregido = vehiculo.corregirKilometraje(119_500);

    expect(vehiculoCorregido.kilometrosActuales).toBe(119_500);
    expect(vehiculoCorregido.estado).toBe('activo');
  });

  it('rechaza correcciones manuales con kilometraje negativo', () => {
    const vehiculo = crearVehiculo(datosValidos());

    expect(() => vehiculo.corregirKilometraje(-10)).toThrow(
      new ErrorDominio('El kilometraje actual no puede ser negativo.'),
    );
  });

  it('protege sus fechas contra mutaciones externas', () => {
    const fechaCompraOriginal = '2020-02-01T00:00:00.000Z';
    const fechaAltaOriginal = '2026-01-10T10:00:00.000Z';
    const vehiculo = crearVehiculo(datosValidos());

    vehiculo.fechaCompra.setUTCFullYear(1999);
    vehiculo.fechaAltaAplicacion.setUTCFullYear(1999);

    expect(vehiculo.fechaCompra.toISOString()).toBe(fechaCompraOriginal);
    expect(vehiculo.fechaAltaAplicacion.toISOString()).toBe(fechaAltaOriginal);
  });

  it('protege la fecha de desactivación contra mutaciones externas', () => {
    const vehiculo = crearVehiculo(datosValidos()).desactivar(
      new Date('2026-03-15T08:30:00.000Z'),
    );

    vehiculo.fechaDesactivacion?.setUTCFullYear(1999);

    expect(vehiculo.fechaDesactivacion?.toISOString()).toBe('2026-03-15T08:30:00.000Z');
  });

  it('conserva identidad, matrícula y fecha de alta cuando el vehículo queda inactivo', () => {
    const vehiculo = crearVehiculo(datosValidos());
    const vehiculoInactivo = vehiculo.desactivar(new Date('2026-04-01T12:00:00.000Z'));

    expect(vehiculoInactivo.id.valor).toBe(vehiculo.id.valor);
    expect(vehiculoInactivo.matricula).toBe(vehiculo.matricula);
    expect(vehiculoInactivo.fechaAltaAplicacion.toISOString()).toBe(
      vehiculo.fechaAltaAplicacion.toISOString(),
    );
  });
});
