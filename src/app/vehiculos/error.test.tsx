// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorVehiculos from './error';
import { establecerReportadorIncidentes } from '../../compartido/infraestructura/reporte-incidentes';

describe('ErrorVehiculos (error boundary de /vehiculos)', () => {
  afterEach(() => {
    cleanup();
    establecerReportadorIncidentes();
  });

  it('muestra un mensaje de degradación en lugar de la pantalla de error de Next.js', () => {
    render(<ErrorVehiculos error={new Error('fallo de Supabase')} reset={() => {}} />);

    expect(screen.queryByText(/no se ha podido/i)).not.toBeNull();
  });

  it('captura el error de la frontera con contexto mediante el reportador inyectable', () => {
    const reportar = vi.fn();
    establecerReportadorIncidentes({ reportar });
    const error = Object.assign(new Error('fallo de Supabase'), { digest: 'digest-1' });

    render(<ErrorVehiculos error={error} reset={() => {}} />);

    expect(reportar).toHaveBeenCalledWith(expect.objectContaining({
      contexto: 'error-boundary:vehiculos',
      error,
      metadatos: { digest: 'digest-1' },
    }));
  });

  it('sigue mostrando la degradación y permite reintentar si el reportador lanza', () => {
    const reset = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    establecerReportadorIncidentes({ reportar: () => { throw new Error('reportador caído'); } });

    render(<ErrorVehiculos error={new Error('fallo de Supabase')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(screen.queryByText(/no se ha podido/i)).not.toBeNull();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
