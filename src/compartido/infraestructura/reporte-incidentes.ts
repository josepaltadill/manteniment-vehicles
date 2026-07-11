export type Incidente = Readonly<{
  contexto: string;
  error: unknown;
  metadatos?: Readonly<Record<string, unknown>>;
}>;

export type ReportadorIncidentes = Readonly<{
  reportar(incidente: Incidente): void | Promise<void>;
}>;

let reportadorInyectado: ReportadorIncidentes | undefined;

/** Permite sustituir la integración HTTP por un SDK (Sentry, OpenTelemetry, etc.). */
export function establecerReportadorIncidentes(reportador?: ReportadorIncidentes): void {
  reportadorInyectado = reportador;
}

function describirError(error: unknown): Readonly<{ nombre: string; mensaje: string }> {
  return {
    nombre: error instanceof Error ? error.name : 'Error',
    mensaje: 'Detalles del error omitidos',
  };
}

function sanitizarMetadatos(
  metadatos?: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  const seguros: Record<string, string> = {};
  const codigo = metadatos?.codigo;
  if (typeof codigo === 'string' && /^[a-z0-9_-]{1,32}$/i.test(codigo)) {
    seguros.codigo = codigo;
  }
  if (Object.hasOwn(metadatos ?? {}, 'digest')) {
    seguros.digest = '[redacted]';
  }
  return seguros;
}

function fallbackConsola(incidente: Incidente): void {
  console.error(
    `[incidente:${incidente.contexto}]`,
    sanitizarMetadatos(incidente.metadatos),
    describirError(incidente.error),
  );
}

function crearReportadorHttp(): ReportadorIncidentes | undefined {
  const endpoint = process.env.NEXT_PUBLIC_INCIDENT_REPORT_URL;
  if (!endpoint) return undefined;

  return {
    async reportar(incidente) {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contexto: incidente.contexto,
          metadatos: sanitizarMetadatos(incidente.metadatos),
          error: describirError(incidente.error),
        }),
        keepalive: true,
      });
      if (!respuesta.ok) throw new Error(`El endpoint de incidentes respondió ${respuesta.status}`);
    },
  };
}

/**
 * Envía el incidente al reportador inyectado o al endpoint configurado mediante
 * NEXT_PUBLIC_INCIDENT_REPORT_URL. Sin configuración, o si el envío falla, usa
 * un fallback de consola sanitizado y nunca propaga el fallo del reportador.
 */
export function reportarIncidente(incidente: Incidente): void {
  const reportador = reportadorInyectado ?? crearReportadorHttp();
  if (!reportador) {
    fallbackConsola(incidente);
    return;
  }

  try {
    const resultado = reportador.reportar(incidente);
    if (resultado && typeof resultado.then === 'function') {
      void Promise.resolve(resultado).catch(() => fallbackConsola(incidente));
    }
  } catch {
    fallbackConsola(incidente);
  }
}
