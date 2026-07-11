// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VehiculoVista } from '../vistas/vehiculo-vista';

const accionDesactivarVehiculoMock = vi.fn();

vi.mock('../acciones/acciones-vehiculos', () => ({
  accionDesactivarVehiculo: (...args: unknown[]) => accionDesactivarVehiculoMock(...args),
}));

const { ListaVehiculos } = await import('./lista-vehiculos');

const vehiculoActivo: VehiculoVista = {
  id: 'vehiculo-1',
  marca: 'Toyota',
  modelo: 'Corolla',
  anio: 2019,
  combustible: 'gasolina',
  matricula: '1234 ABC',
  kilometrosActuales: 120_000,
  estado: 'activo',
  fechaCompra: '2020-02-01T00:00:00.000Z',
  fechaAltaAplicacion: '2026-01-10T10:00:00.000Z',
};

const vehiculoInactivo: VehiculoVista = {
  ...vehiculoActivo,
  id: 'vehiculo-2',
  matricula: '5678 XYZ',
  estado: 'inactivo',
};

describe('ListaVehiculos', () => {
  afterEach(() => {
    cleanup();
    accionDesactivarVehiculoMock.mockReset();
  });

  it('muestra el estado vacío cuando no hay vehículos', () => {
    render(<ListaVehiculos vehiculos={[]} />);

    expect(screen.queryByText(/todavía no hay vehículos/i)).not.toBeNull();
  });

  it('renderiza una fila por vehículo con matrícula, marca, modelo y estado', () => {
    render(<ListaVehiculos vehiculos={[vehiculoActivo, vehiculoInactivo]} />);

    expect(screen.queryByText(/1234 ABC/)).not.toBeNull();
    expect(screen.queryByText(/5678 XYZ/)).not.toBeNull();
    expect(screen.getAllByText('Activo')).toHaveLength(1);
    expect(screen.getAllByText('Inactivo')).toHaveLength(1);
  });

  it('solo muestra el botón de desactivar para vehículos activos', () => {
    render(<ListaVehiculos vehiculos={[vehiculoActivo, vehiculoInactivo]} />);

    expect(screen.getAllByRole('button', { name: /desactivar/i })).toHaveLength(1);
  });

  it('muestra el mensaje de fallo devuelto por la server action en vez de descartarlo', async () => {
    accionDesactivarVehiculoMock.mockResolvedValue({
      exito: false,
      mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.',
    });

    render(<ListaVehiculos vehiculos={[vehiculoActivo]} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /desactivar/i }));
    });

    expect(screen.queryByRole('alert')).not.toBeNull();
    expect(accionDesactivarVehiculoMock).toHaveBeenCalledTimes(1);
  });
});
