import { reportarIncidente } from '../../../../compartido/infraestructura/reporte-incidentes';
import { ErrorAdaptadorSupabase } from '../../adaptadores/supabase/errores-adaptador';
import { ErrorDominio } from '../../dominio/errores-dominio';

export type ResultadoAccion<T> =
  | Readonly<{ exito: true; datos: T }>
  | Readonly<{ exito: false; mensaje: string; erroresCampos?: Record<string, string[]> }>;

export function mensajeDeErrorAccion(error: unknown): string {
  if (error instanceof ErrorDominio) return error.message;
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

function registrarErrorAccion(contexto: string, error: unknown): void {
  if (error instanceof ErrorDominio) return;

  reportarIncidente({
    contexto: `accion:${contexto}`,
    error,
    ...(error instanceof ErrorAdaptadorSupabase
      ? { metadatos: { codigo: error.codigo } }
      : {}),
  });
}

export async function ejecutarComoResultado<T>(
  contexto: string,
  fn: () => Promise<T>,
): Promise<ResultadoAccion<T>> {
  try {
    return { exito: true, datos: await fn() };
  } catch (error) {
    registrarErrorAccion(contexto, error);
    return { exito: false, mensaje: mensajeDeErrorAccion(error) };
  }
}
