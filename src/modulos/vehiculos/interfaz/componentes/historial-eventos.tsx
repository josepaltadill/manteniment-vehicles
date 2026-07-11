import type { EventoVista } from '../vistas/evento-vista';

const ETIQUETA_ESTADO_VENCIMIENTO: Record<EventoVista['estadoVencimiento'], string> = {
  sin_vencimiento: 'Sin vencimiento',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
};

// Componente presentacional: el estado de vencimiento ya llega calculado
// (diseño §5.6, nunca persistido) desde `aEventoVista`; aquí solo se etiqueta.
export function HistorialEventos({ eventos }: Readonly<{ eventos: EventoVista[] }>) {
  if (eventos.length === 0) {
    return <p className="text-slate-600">Todavía no hay eventos registrados para este vehículo.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {eventos.map((evento) => (
        <li key={evento.id} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-950">
              {evento.tipo === 'mantenimiento' ? 'Mantenimiento' : 'Avería'}
            </span>
            <span className="text-sm text-slate-600">{evento.kilometros.toLocaleString('es-ES')} km</span>
          </div>
          <p className="text-sm text-slate-800">{evento.descripcion}</p>
          <p className="text-xs text-slate-600">
            {new Date(evento.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
            {evento.proveedor ? ` · ${evento.proveedor}` : ''}
            {evento.coste !== undefined ? ` · ${evento.coste} ${evento.moneda}` : ''}
          </p>
          {evento.notas && <p className="text-xs text-slate-600">{evento.notas}</p>}
          {evento.estadoVencimiento !== 'sin_vencimiento' && (
            <p className="mt-1 text-xs font-medium" data-estado-vencimiento={evento.estadoVencimiento}>
              Próximo vencimiento: {ETIQUETA_ESTADO_VENCIMIENTO[evento.estadoVencimiento]}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
