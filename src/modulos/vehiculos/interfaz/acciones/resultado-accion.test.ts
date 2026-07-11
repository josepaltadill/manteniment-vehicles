import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  establecerReportadorIncidentes,
  reportarIncidente,
} from '../../../../compartido/infraestructura/reporte-incidentes';
import { ErrorAdaptadorSupabase } from '../../adaptadores/supabase/errores-adaptador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import { ejecutarComoResultado, mensajeDeErrorAccion } from './resultado-accion';

describe('mensajeDeErrorAccion', () => {
  it('devuelve el mensaje literal cuando el error es de dominio', () => {
    const error = new ErrorDominio('Ya existe un vehículo con esa matrícula.');

    expect(mensajeDeErrorAccion(error)).toBe('Ya existe un vehículo con esa matrícula.');
  });

  it('devuelve un mensaje genérico para errores que no son de dominio, sin filtrar detalles internos', () => {
    const error = new Error('connection refused at 10.0.0.5:5432');

    expect(mensajeDeErrorAccion(error)).toBe('No se pudo completar la operación. Inténtalo de nuevo.');
  });
});

describe('ejecutarComoResultado', () => {
  afterEach(() => {
    establecerReportadorIncidentes();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('devuelve éxito con los datos cuando la función no lanza', async () => {
    const resultado = await ejecutarComoResultado('contextoDePrueba', async () => 'ok');

    expect(resultado).toEqual({ exito: true, datos: 'ok' });
  });

  it('usa el fallback de consola y devuelve un mensaje genérico sin endpoint configurado', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new ErrorAdaptadorSupabase('fallo de conexión', '08006');

    const resultado = await ejecutarComoResultado('registrarVehiculo', async () => {
      throw error;
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('registrarVehiculo');
    expect(errorSpy.mock.calls[0][1]).toEqual(expect.objectContaining({ codigo: '08006' }));
    expect(resultado).toEqual({
      exito: false,
      mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.',
    });
  });

  it('captura errores mediante el reportador inyectable sin duplicarlos en consola', async () => {
    const reportar = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    establecerReportadorIncidentes({ reportar });
    const error = new ErrorAdaptadorSupabase('fallo de conexión', '08006');

    await ejecutarComoResultado('registrarVehiculo', async () => {
      throw error;
    });

    expect(reportar).toHaveBeenCalledWith(expect.objectContaining({
      contexto: 'accion:registrarVehiculo',
      error,
      metadatos: { codigo: '08006' },
    }));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('mantiene el resultado genérico y usa el fallback cuando el reportador lanza', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    establecerReportadorIncidentes({ reportar: () => { throw new Error('reportador caído'); } });

    const resultado = await ejecutarComoResultado('registrarVehiculo', async () => {
      throw new Error('fallo interno');
    });

    expect(resultado).toEqual({
      exito: false,
      mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.',
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('aísla el rechazo asíncrono del reportador y usa un fallback seguro', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    establecerReportadorIncidentes({
      reportar: async () => Promise.reject(new Error('token-del-reportador')),
    });

    expect(() => reportarIncidente({
      contexto: 'accion:registrarVehiculo',
      error: new Error('contraseña-interna'),
      metadatos: { codigo: '08006', token: 'token-secreto' },
    })).not.toThrow();
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalledTimes(1));

    const salida = JSON.stringify(errorSpy.mock.calls);
    expect(salida).toContain('08006');
    expect(salida).not.toContain('token-secreto');
    expect(salida).not.toContain('contraseña-interna');
    expect(salida).not.toContain('token-del-reportador');
  });

  it('no escribe metadatos arbitrarios ni mensajes de error en el fallback de consola', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    reportarIncidente({
      contexto: 'error-boundary:vehiculos',
      error: new Error('postgres://usuario:clave@servidor/base'),
      metadatos: { digest: 'digest-1', authorization: 'Bearer secreto' },
    });

    const salida = JSON.stringify(errorSpy.mock.calls);
    expect(salida).toContain('digest');
    expect(salida).not.toContain('Bearer secreto');
    expect(salida).not.toContain('usuario:clave');
  });

  it('usa el endpoint configurado como integración de producción', async () => {
    vi.stubEnv('NEXT_PUBLIC_INCIDENT_REPORT_URL', 'https://incidentes.example.test/reportar');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));

    await ejecutarComoResultado('registrarVehiculo', async () => {
      throw new Error('fallo interno');
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://incidentes.example.test/reportar',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('NO registra el error cuando es un ErrorDominio esperado', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const resultado = await ejecutarComoResultado('registrarVehiculo', async () => {
      throw new ErrorDominio('Ya existe un vehículo con esa matrícula.');
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      exito: false,
      mensaje: 'Ya existe un vehículo con esa matrícula.',
    });
  });
});
