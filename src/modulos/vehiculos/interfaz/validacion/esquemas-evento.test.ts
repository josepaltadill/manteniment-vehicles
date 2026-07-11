import { describe, expect, it } from 'vitest';
import { esquemaRegistrarEvento } from './esquemas-evento';

const datosValidos = () => ({
  vehiculoId: 'vehiculo-1',
  tipo: 'mantenimiento',
  descripcion: 'Cambio de aceite',
  kilometros: '120005',
  fecha: '2026-02-01',
  proveedor: 'Taller X',
  coste: '300',
  notas: 'Filtro incluido',
  proximoVencimientoKm: '130000',
  proximoVencimientoFecha: '2027-01-01',
});

describe('esquemaRegistrarEvento', () => {
  it('acepta datos válidos con coste y vencimientos', () => {
    const resultado = esquemaRegistrarEvento.safeParse(datosValidos());

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.coste).toBe(300);
      expect(resultado.data.proximoVencimientoKm).toBe(130_000);
      expect(resultado.data.proximoVencimientoFecha).toBeInstanceOf(Date);
    }
  });

  it('acepta coste y próximos vencimientos vacíos como opcionales', () => {
    const resultado = esquemaRegistrarEvento.safeParse({
      ...datosValidos(),
      coste: '',
      proximoVencimientoKm: '',
      proximoVencimientoFecha: '',
      notas: '',
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.coste).toBeUndefined();
      expect(resultado.data.proximoVencimientoKm).toBeUndefined();
      expect(resultado.data.proximoVencimientoFecha).toBeUndefined();
    }
  });

  it('rechaza alta incompleta cuando falta la descripción', () => {
    const { descripcion: _omitida, ...resto } = datosValidos();
    const resultado = esquemaRegistrarEvento.safeParse(resto);

    expect(resultado.success).toBe(false);
  });

  it('rechaza un coste negativo', () => {
    const resultado = esquemaRegistrarEvento.safeParse({
      ...datosValidos(),
      coste: '-5',
    });

    expect(resultado.success).toBe(false);
  });

  it('rechaza un tipo de evento desconocido', () => {
    const resultado = esquemaRegistrarEvento.safeParse({
      ...datosValidos(),
      tipo: 'revision',
    });

    expect(resultado.success).toBe(false);
  });
});
