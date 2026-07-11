import type { EventoVehiculo, TipoEventoVehiculo } from '../../dominio/evento-vehiculo';
import { evaluarVencimiento, type EstadoVencimiento } from '../../dominio/vencimiento';

export type ContextoVistaEvento = Readonly<{
  kilometrosActuales: number;
  fechaActual: Date;
}>;

export type EventoVista = Readonly<{
  id: string;
  tipo: TipoEventoVehiculo;
  descripcion: string;
  kilometros: number;
  fecha: string;
  proveedor?: string;
  coste?: number;
  moneda?: string;
  notas?: string;
  proximoVencimientoKm?: number;
  proximoVencimientoFecha?: string;
  // Calculado en cada consulta (diseño §5.6): nunca se persiste como estado
  // derivado para evitar inconsistencias con el kilometraje/fecha reales.
  estadoVencimiento: EstadoVencimiento;
}>;

export function aEventoVista(evento: EventoVehiculo, contexto: ContextoVistaEvento): EventoVista {
  const estadoVencimiento = evaluarVencimiento({
    proximoVencimientoKm: evento.proximoVencimientoKm,
    proximoVencimientoFecha: evento.proximoVencimientoFecha,
    kilometrosActuales: contexto.kilometrosActuales,
    fechaActual: contexto.fechaActual,
  });

  return {
    id: evento.id.valor,
    tipo: evento.tipo,
    descripcion: evento.descripcion,
    kilometros: evento.kilometros,
    fecha: evento.fecha.toISOString(),
    proveedor: evento.proveedor,
    coste: evento.coste,
    moneda: evento.moneda,
    notas: evento.notas,
    proximoVencimientoKm: evento.proximoVencimientoKm,
    proximoVencimientoFecha: evento.proximoVencimientoFecha?.toISOString(),
    estadoVencimiento,
  };
}
