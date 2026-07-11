'use client';

import { useEffect } from 'react';
import { reportarIncidente } from '../../compartido/infraestructura/reporte-incidentes';

// Frontera de error de Next.js para el segmento `/vehiculos` (convención
// `error.tsx`): si un Server Component de este árbol lanza sin capturar (p. ej.
// una caída de Supabase al listar/obtener un vehículo), esto sustituye la
// pantalla de error por defecto de Next.js por una degradación mínima.
export default function ErrorVehiculos({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    reportarIncidente({
      contexto: 'error-boundary:vehiculos',
      error,
      metadatos: error.digest ? { digest: error.digest } : undefined,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h1 className="text-2xl font-bold text-slate-950">Algo ha ido mal</h1>
      <p className="text-sm text-slate-600">
        No se ha podido cargar la información de vehículos. Inténtalo de nuevo.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
