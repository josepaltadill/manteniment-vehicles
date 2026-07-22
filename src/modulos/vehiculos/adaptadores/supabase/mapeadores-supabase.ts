// Mapeadores dominio <-> filas Supabase contra el esquema REAL de
// `supabase/migrations/20260710000000_supabase_persistence_short.sql`.
//
// Reglas de este adaptador (ver diseño §6.2 y §7.1):
// - Las tablas son `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo`; no existen columnas
//   `creado_en`/`actualizado_en` en `fam_ve_vehiculos`: NO se mapean.
// - La columna de auditoría de eventos se llama `fecha_creacion`, no `creado_en`.
// - Toda fila lleva `household_id`, inyectado explícitamente por el llamador
//   (el dominio no conoce el hogar).
// - `fam_ve_eventos_vehiculo` usa la FK compuesta `(household_id, vehiculo_id)` hacia
//   `fam_ve_vehiculos (household_id, id)`; por eso toda fila de evento incluye ambos.
import { crearIdentificador, type Identificador } from '../../../../compartido/dominio/identificador';
import {
  crearEventoVehiculo,
  type EventoVehiculo,
  type TipoEventoVehiculo,
} from '../../dominio/evento-vehiculo';
import { reconstruirVehiculo, type EstadoVehiculo, type Vehiculo } from '../../dominio/vehiculo';

export type FilaVehiculo = Readonly<{
  id: string;
  household_id: string;
  marca: string;
  modelo: string;
  combustible: string;
  matricula: string;
  anio: number;
  kilometros_actuales: number;
  estado: EstadoVehiculo;
  fecha_compra: string;
  fecha_alta_aplicacion: string;
  fecha_desactivacion: string | null;
}>;

export type FilaEventoVehiculo = Readonly<{
  id: string;
  household_id: string;
  vehiculo_id: string;
  tipo: TipoEventoVehiculo;
  descripcion: string;
  kilometros: number;
  fecha: string;
  proveedor: string | null;
  moneda: string | null;
  notas: string | null;
  coste: number | null;
  proximo_vencimiento_km: number | null;
  proximo_vencimiento_fecha: string | null;
  fecha_creacion: string;
}>;

export function aFilaVehiculo(householdId: Identificador, vehiculo: Vehiculo): FilaVehiculo {
  return {
    id: vehiculo.id.valor,
    household_id: householdId.valor,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    combustible: vehiculo.combustible,
    matricula: vehiculo.matricula,
    anio: vehiculo.anio,
    kilometros_actuales: vehiculo.kilometrosActuales,
    estado: vehiculo.estado,
    fecha_compra: vehiculo.fechaCompra.toISOString(),
    fecha_alta_aplicacion: vehiculo.fechaAltaAplicacion.toISOString(),
    fecha_desactivacion: vehiculo.fechaDesactivacion?.toISOString() ?? null,
  };
}

export function aVehiculoDesdeFila(fila: FilaVehiculo): Vehiculo {
  return reconstruirVehiculo({
    id: crearIdentificador(fila.id),
    marca: fila.marca,
    modelo: fila.modelo,
    combustible: fila.combustible,
    matricula: fila.matricula,
    anio: fila.anio,
    kilometrosActuales: fila.kilometros_actuales,
    estado: fila.estado,
    fechaCompra: new Date(fila.fecha_compra),
    fechaAltaAplicacion: new Date(fila.fecha_alta_aplicacion),
    fechaDesactivacion: fila.fecha_desactivacion ? new Date(fila.fecha_desactivacion) : undefined,
  });
}

export function aFilaEventoVehiculo(
  householdId: Identificador,
  evento: EventoVehiculo,
): FilaEventoVehiculo {
  return {
    id: evento.id.valor,
    household_id: householdId.valor,
    vehiculo_id: evento.vehiculoId.valor,
    tipo: evento.tipo,
    descripcion: evento.descripcion,
    kilometros: evento.kilometros,
    fecha: evento.fecha.toISOString(),
    proveedor: evento.proveedor ?? null,
    moneda: evento.moneda ?? null,
    notas: evento.notas ?? null,
    coste: evento.coste ?? null,
    proximo_vencimiento_km: evento.proximoVencimientoKm ?? null,
    proximo_vencimiento_fecha: evento.proximoVencimientoFecha?.toISOString() ?? null,
    fecha_creacion: evento.fechaCreacion.toISOString(),
  };
}

export function aEventoVehiculoDesdeFila(fila: FilaEventoVehiculo): EventoVehiculo {
  return crearEventoVehiculo({
    id: crearIdentificador(fila.id),
    vehiculoId: crearIdentificador(fila.vehiculo_id),
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    kilometros: fila.kilometros,
    fecha: new Date(fila.fecha),
    proveedor: fila.proveedor ?? undefined,
    coste: fila.coste ?? undefined,
    moneda: fila.moneda ?? undefined,
    notas: fila.notas ?? undefined,
    proximoVencimientoKm: fila.proximo_vencimiento_km ?? undefined,
    proximoVencimientoFecha: fila.proximo_vencimiento_fecha
      ? new Date(fila.proximo_vencimiento_fecha)
      : undefined,
    fechaCreacion: new Date(fila.fecha_creacion),
  });
}
