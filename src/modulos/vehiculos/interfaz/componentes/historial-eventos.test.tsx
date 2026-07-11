// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { EventoVista } from '../vistas/evento-vista';
import { HistorialEventos } from './historial-eventos';

const eventoBase: EventoVista = {
  id: 'evento-1',
  tipo: 'mantenimiento',
  descripcion: 'Cambio de aceite',
  kilometros: 120_005,
  fecha: '2026-02-01T00:00:00.000Z',
  proveedor: 'Taller X',
  coste: 300,
  moneda: 'EUR',
  estadoVencimiento: 'sin_vencimiento',
};

describe('HistorialEventos', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra el estado vacío cuando no hay eventos', () => {
    render(<HistorialEventos eventos={[]} />);

    expect(screen.queryByText(/todavía no hay eventos/i)).not.toBeNull();
  });

  it('renderiza cada evento con tipo, descripción y kilómetros', () => {
    render(<HistorialEventos eventos={[eventoBase]} />);

    expect(screen.queryByText('Mantenimiento')).not.toBeNull();
    expect(screen.queryByText('Cambio de aceite')).not.toBeNull();
    expect(screen.queryByText(/120.005 km/)).not.toBeNull();
  });

  it('muestra una fecha ISO de medianoche en UTC aunque la zona local sea anterior', () => {
    const zonaHorariaOriginal = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';

    try {
      expect(new Date(eventoBase.fecha).toLocaleDateString('es-ES')).toBe('31/1/2026');

      render(<HistorialEventos eventos={[eventoBase]} />);

      expect(screen.queryByText(/1\/2\/2026/)).not.toBeNull();
    } finally {
      process.env.TZ = zonaHorariaOriginal;
    }
  });

  it('no muestra insignia de vencimiento cuando el evento no tiene vencimiento', () => {
    render(<HistorialEventos eventos={[eventoBase]} />);

    expect(screen.queryByText(/próximo vencimiento/i)).toBeNull();
  });

  it('muestra la insignia de vencimiento "Vencido" cuando el evento está vencido', () => {
    render(<HistorialEventos eventos={[{ ...eventoBase, id: 'evento-2', estadoVencimiento: 'vencido' }]} />);

    const insignia = screen.getByText(/próximo vencimiento/i);
    expect(insignia.textContent).toContain('Vencido');
  });

  it('muestra la insignia de vencimiento "Pendiente" cuando el evento está pendiente', () => {
    render(<HistorialEventos eventos={[{ ...eventoBase, id: 'evento-3', estadoVencimiento: 'pendiente' }]} />);

    const insignia = screen.getByText(/próximo vencimiento/i);
    expect(insignia.textContent).toContain('Pendiente');
  });
});
