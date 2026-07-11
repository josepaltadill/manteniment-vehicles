'use client';

import { useActionState } from 'react';
import { accionCorregirKilometraje } from '../acciones/acciones-eventos';

export function FormularioCorreccionKilometraje({
  vehiculoId,
  kilometrosActuales,
}: Readonly<{ vehiculoId: string; kilometrosActuales: number }>) {
  const [estado, accion, pendiente] = useActionState(accionCorregirKilometraje, undefined);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="vehiculoId" value={vehiculoId} />

      <label className="text-sm font-medium text-slate-800">
        Corregir kilometraje actual ({kilometrosActuales.toLocaleString('es-ES')} km)
        <input
          name="kilometrosActuales"
          type="number"
          min={0}
          required
          className="mt-1 block w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-60"
      >
        {pendiente ? 'Guardando…' : 'Corregir'}
      </button>

      {estado && !estado.exito && (
        <p role="alert" className="w-full text-sm text-red-800">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
