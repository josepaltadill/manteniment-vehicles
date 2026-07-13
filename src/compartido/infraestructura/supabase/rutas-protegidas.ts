export function esRutaProtegida(ruta: string): boolean {
  return ruta === '/' || ruta === '/vehiculos' || ruta.startsWith('/vehiculos/');
}

export function destinoLoginPara(rutaConBusqueda: string): string {
  return `/login?next=${encodeURIComponent(rutaConBusqueda)}`;
}

export function sesionPermiteRutaProtegida(respuesta: Readonly<{ error: unknown; user: unknown | null }>): boolean {
  return !respuesta.error && Boolean(respuesta.user);
}

export function esFalloIdentidadTransitorio(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const { status, name } = error as { status?: unknown; name?: unknown };
  return (
    (typeof status === 'number' && (status === 429 || status >= 500 || status === 0))
    || (typeof name === 'string' && ['AbortError', 'AuthRetryableFetchError', 'TypeError'].includes(name))
  );
}
