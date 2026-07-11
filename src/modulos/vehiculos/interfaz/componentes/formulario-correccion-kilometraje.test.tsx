// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const accionCorregirKilometrajeMock = vi.fn();

vi.mock('../acciones/acciones-eventos', () => ({
  accionCorregirKilometraje: (...args: unknown[]) => accionCorregirKilometrajeMock(...args),
}));

const { FormularioCorreccionKilometraje } = await import('./formulario-correccion-kilometraje');

describe('FormularioCorreccionKilometraje', () => {
  afterEach(() => {
    cleanup();
    accionCorregirKilometrajeMock.mockReset();
  });

  it('renderiza el campo de kilometraje con el valor actual en la etiqueta', () => {
    render(<FormularioCorreccionKilometraje vehiculoId="vehiculo-1" kilometrosActuales={120_000} />);

    expect(screen.queryByText(/120.000 km/)).not.toBeNull();
    expect(screen.getByRole('button', { name: /corregir/i })).not.toBeNull();
  });

  it('invoca la server action al enviar el formulario', async () => {
    accionCorregirKilometrajeMock.mockResolvedValue({ exito: true, datos: undefined });

    const { container } = render(
      <FormularioCorreccionKilometraje vehiculoId="vehiculo-1" kilometrosActuales={120_000} />,
    );
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(accionCorregirKilometrajeMock).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de error cuando la acción falla', async () => {
    accionCorregirKilometrajeMock.mockResolvedValue({
      exito: false,
      mensaje: 'Revisa el kilometraje: debe ser un número válido y no negativo.',
    });

    const { container } = render(
      <FormularioCorreccionKilometraje vehiculoId="vehiculo-1" kilometrosActuales={120_000} />,
    );
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByRole('alert').textContent).toContain('Revisa el kilometraje');
  });
});
