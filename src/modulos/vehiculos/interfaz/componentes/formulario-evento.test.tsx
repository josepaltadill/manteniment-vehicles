// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const accionRegistrarEventoMock = vi.fn();

vi.mock('../acciones/acciones-eventos', () => ({
  accionRegistrarEvento: (...args: unknown[]) => accionRegistrarEventoMock(...args),
}));

const { FormularioEvento } = await import('./formulario-evento');

describe('FormularioEvento', () => {
  afterEach(() => {
    cleanup();
    accionRegistrarEventoMock.mockReset();
  });

  it('renderiza los campos del evento e incluye el vehiculoId como campo oculto', () => {
    const { container } = render(<FormularioEvento vehiculoId="vehiculo-1" />);

    expect(screen.getByText('Descripción')).not.toBeNull();
    expect(screen.getByText('Kilometraje del evento')).not.toBeNull();
    expect(screen.getByText('Fecha')).not.toBeNull();

    const campoOculto = container.querySelector('input[name="vehiculoId"]') as HTMLInputElement | null;
    expect(campoOculto?.value).toBe('vehiculo-1');
  });

  it('invoca la server action al enviar el formulario', async () => {
    accionRegistrarEventoMock.mockResolvedValue({ exito: true, datos: { id: 'evento-1' } });

    const { container } = render(<FormularioEvento vehiculoId="vehiculo-1" />);
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(accionRegistrarEventoMock).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de error y los errores por campo cuando la acción falla', async () => {
    accionRegistrarEventoMock.mockResolvedValue({
      exito: false,
      mensaje: 'Revisa los datos del evento: hay campos obligatorios sin completar o inválidos.',
      erroresCampos: { descripcion: ['La descripción es obligatoria.'] },
    });

    const { container } = render(<FormularioEvento vehiculoId="vehiculo-1" />);
    const form = container.querySelector('form');
    if (!form) throw new Error('formulario no encontrado');

    await act(async () => {
      fireEvent.submit(form);
    });

    expect(screen.getByRole('alert').textContent).toContain('Revisa los datos del evento');
    expect(screen.queryByText('La descripción es obligatoria.')).not.toBeNull();
  });
});
