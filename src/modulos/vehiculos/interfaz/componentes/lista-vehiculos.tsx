'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { accionDesactivarVehiculo } from '../acciones/acciones-vehiculos';
import type { VehiculoVista } from '../vistas/vehiculo-vista';

// Componente presentacional (diseño §6.3/§12): sin lógica de negocio propia, solo
// muestra la vista ya calculada y delega la mutación en la server action.
export function ListaVehiculos({ vehiculos }: Readonly<{ vehiculos: VehiculoVista[] }>) {
  if (vehiculos.length === 0) {
    return <p className="text-slate-600">Todavía no hay vehículos registrados.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {vehiculos.map((vehiculo) => (
        <li key={vehiculo.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <Link href={`/vehiculos/${vehiculo.id}`} className="font-semibold text-slate-950 hover:underline">
              {vehiculo.matricula} — {vehiculo.marca} {vehiculo.modelo}
            </Link>
            <p className="text-sm text-slate-600">
              {vehiculo.kilometrosActuales.toLocaleString('es-ES')} km ·{' '}
              <span data-estado={vehiculo.estado}>{vehiculo.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
            </p>
          </div>
          {vehiculo.estado === 'activo' && <BotonDesactivarVehiculo vehiculoId={vehiculo.id} />}
        </li>
      ))}
    </ul>
  );
}

// Subcomponente propio para poder usar `useActionState` por fila (cada vehículo
// necesita su propio estado de éxito/fallo, ver Fix 3 del pase de revisión PR3):
// antes la server action se invocaba como `<form action={...}>` descartando su
// `ResultadoAccion`, por lo que un fallo (p. ej. error de infraestructura) era
// invisible para la persona usuaria.
function BotonDesactivarVehiculo({ vehiculoId }: Readonly<{ vehiculoId: string }>) {
  const [estado, accion, pendiente] = useActionState(accionDesactivarVehiculo, undefined);

  return (
    <form action={accion} className="flex flex-col items-end gap-1">
      <input type="hidden" name="vehiculoId" value={vehiculoId} />
      <button
        type="submit"
        disabled={pendiente}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {pendiente ? 'Desactivando…' : 'Desactivar'}
      </button>
      {estado && !estado.exito && (
        <p role="alert" className="text-xs text-red-800">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
