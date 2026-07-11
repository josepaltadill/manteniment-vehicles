'use client';

import { useActionState } from 'react';
import { accionRegistrarEvento } from '../acciones/acciones-eventos';

const campoBase = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
const etiquetaBase = 'block text-sm font-medium text-slate-800';

export function FormularioEvento({ vehiculoId }: Readonly<{ vehiculoId: string }>) {
  const [estado, accion, pendiente] = useActionState(accionRegistrarEvento, undefined);

  return (
    <form action={accion} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="vehiculoId" value={vehiculoId} />

      {estado && !estado.exito && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {estado.mensaje}
        </p>
      )}

      <label className={etiquetaBase}>
        Tipo
        <select name="tipo" required className={campoBase} defaultValue="mantenimiento">
          <option value="mantenimiento">Mantenimiento</option>
          <option value="averia">Avería</option>
        </select>
      </label>

      <label className={etiquetaBase}>
        Descripción
        <input name="descripcion" required className={campoBase} />
        {estado && !estado.exito && estado.erroresCampos?.descripcion && (
          <span className="text-xs text-red-700">{estado.erroresCampos.descripcion[0]}</span>
        )}
      </label>

      <label className={etiquetaBase}>
        Kilometraje del evento
        <input name="kilometros" type="number" min={0} required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Fecha
        <input name="fecha" type="date" required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Taller/proveedor (opcional)
        <input name="proveedor" className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Coste en EUR (opcional)
        <input name="coste" type="number" min={0} step="0.01" className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Notas (opcional)
        <textarea name="notas" className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Próximo vencimiento por kilómetros (opcional)
        <input name="proximoVencimientoKm" type="number" min={0} className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Próximo vencimiento por fecha (opcional)
        <input name="proximoVencimientoFecha" type="date" className={campoBase} />
      </label>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pendiente ? 'Guardando…' : 'Registrar evento'}
      </button>
    </form>
  );
}
