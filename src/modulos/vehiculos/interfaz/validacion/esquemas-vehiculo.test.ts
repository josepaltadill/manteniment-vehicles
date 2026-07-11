import { describe, expect, it } from 'vitest';
import { esquemaCorregirKilometraje, esquemaRegistrarVehiculo } from './esquemas-vehiculo';

const datosValidos = () => ({
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: '2019',
  combustible: 'gasolina',
  matricula: '1234 ABC',
  kilometrosActuales: '120000',
  fechaCompra: '2020-02-01',
});

describe('esquemaRegistrarVehiculo', () => {
  it('acepta datos válidos y convierte tipos numéricos/fecha', () => {
    const resultado = esquemaRegistrarVehiculo.safeParse(datosValidos());

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.anio).toBe(2019);
      expect(resultado.data.kilometrosActuales).toBe(120_000);
      expect(resultado.data.fechaCompra).toBeInstanceOf(Date);
    }
  });

  it('rechaza alta incompleta cuando falta la matrícula', () => {
    const { matricula: _omitida, ...resto } = datosValidos();
    const resultado = esquemaRegistrarVehiculo.safeParse(resto);

    expect(resultado.success).toBe(false);
  });

  it('rechaza kilometraje negativo', () => {
    const resultado = esquemaRegistrarVehiculo.safeParse({
      ...datosValidos(),
      kilometrosActuales: '-1',
    });

    expect(resultado.success).toBe(false);
  });
});

describe('esquemaCorregirKilometraje', () => {
  it('acepta una corrección válida', () => {
    const resultado = esquemaCorregirKilometraje.safeParse({
      vehiculoId: 'vehiculo-1',
      kilometrosActuales: '119500',
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.kilometrosActuales).toBe(119_500);
    }
  });

  it('rechaza kilometraje negativo', () => {
    const resultado = esquemaCorregirKilometraje.safeParse({
      vehiculoId: 'vehiculo-1',
      kilometrosActuales: '-1',
    });

    expect(resultado.success).toBe(false);
  });
});
