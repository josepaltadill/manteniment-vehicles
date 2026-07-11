'use client';

import { useActionState } from 'react';
import { accionRegistrarVehiculo } from '../acciones/acciones-vehiculos';

const campoBase = 'mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
const etiquetaBase = 'block text-sm font-medium text-slate-800';

export function FormularioVehiculo() {
  const [estado, accion, pendiente] = useActionState(accionRegistrarVehiculo, undefined);

  return (
    <form action={accion} className="flex max-w-md flex-col gap-4">
      {estado && !estado.exito && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {estado.mensaje}
        </p>
      )}

      <label className={etiquetaBase}>
        Marca
        <input name="marca" required className={campoBase} />
        {estado && !estado.exito && estado.erroresCampos?.marca && (
          <span className="text-xs text-red-700">{estado.erroresCampos.marca[0]}</span>
        )}
      </label>

      <label className={etiquetaBase}>
        Modelo
        <input name="modelo" required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Año
        <input name="anio" type="number" required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Combustible
        <input name="combustible" required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Matrícula
        <input name="matricula" required className={campoBase} />
        {estado && !estado.exito && estado.erroresCampos?.matricula && (
          <span className="text-xs text-red-700">{estado.erroresCampos.matricula[0]}</span>
        )}
      </label>

      <label className={etiquetaBase}>
        Kilometraje actual
        <input name="kilometrosActuales" type="number" min={0} required className={campoBase} />
      </label>

      <label className={etiquetaBase}>
        Fecha de compra
        <input name="fechaCompra" type="date" required className={campoBase} />
      </label>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pendiente ? 'Guardando…' : 'Registrar vehículo'}
      </button>
    </form>
  );
}
