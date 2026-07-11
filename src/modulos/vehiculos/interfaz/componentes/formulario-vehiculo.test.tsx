// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const accionRegistrarVehiculoMock = vi.fn();

vi.mock('../acciones/acciones-vehiculos', () => ({
  accionRegistrarVehiculo: (...args: unknown[]) => accionRegistrarVehiculoMock(...args),
}));

const { FormularioVehiculo } = await import('./formulario-vehiculo');

describe('FormularioVehiculo', () => {
  afterEach(() => {
    cleanup();
    accionRegistrarVehiculoMock.mockReset();
  });

  it('renderiza los campos obligatorios del vehículo', () => {
    render(<FormularioVehiculo />);

    expect(screen.getByText('Marca')).not.toBeNull();
    expect(screen.getByText('Modelo')).not.toBeNull();
    expect(screen.getByText('Matrícula')).not.toBeNull();
    expect(screen.getByText('Kilometraje actual')).not.toBeNull();
    expect(screen.getByRole('button', { name: /registrar vehículo/i })).not.toBeNull();
  });

  it('invoca la server action al enviar el formulario', async () => {
    accionRegistrarVehiculoMock.mockResolvedValue({
      exito: true,
      datos: { id: 'vehiculo-1' },
    });

    const { container } = render(<FormularioVehiculo />);
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(accionRegistrarVehiculoMock).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de error y los errores por campo cuando la acción falla', async () => {
    accionRegistrarVehiculoMock.mockResolvedValue({
      exito: false,
      mensaje: 'Revisa los datos del vehículo: hay campos obligatorios sin completar o inválidos.',
      erroresCampos: { matricula: ['La matrícula es obligatoria.'] },
    });

    const { container } = render(<FormularioVehiculo />);
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByRole('alert').textContent).toContain('Revisa los datos del vehículo');
    expect(screen.queryByText('La matrícula es obligatoria.')).not.toBeNull();
  });
});
