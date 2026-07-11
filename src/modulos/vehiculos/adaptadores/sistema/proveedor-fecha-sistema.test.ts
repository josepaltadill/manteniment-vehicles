import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProveedorFechaSistema } from './proveedor-fecha-sistema';

describe('ProveedorFechaSistema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devuelve la fecha/hora real del sistema en el momento de la llamada', () => {
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'));
    const proveedor = new ProveedorFechaSistema();

    expect(proveedor.ahora().toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });

  it('refleja el avance real del reloj entre llamadas sucesivas', () => {
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'));
    const proveedor = new ProveedorFechaSistema();
    const primera = proveedor.ahora();

    vi.setSystemTime(new Date('2026-05-02T00:00:00.000Z'));
    const segunda = proveedor.ahora();

    expect(segunda.getTime()).toBeGreaterThan(primera.getTime());
  });
});
