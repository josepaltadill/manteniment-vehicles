// Adaptador Supabase de SERVIDOR para `fam_ve_eventos_vehiculo`. Igual que el
// repositorio de vehículos, solo debe importarse desde servidor.
import type { Identificador } from '../../../../compartido/dominio/identificador';
import type { EventoVehiculo } from '../../dominio/evento-vehiculo';
import type { Vehiculo } from '../../dominio/vehiculo';
import type {
  RepositorioEventosVehiculo,
  UnidadTrabajoVehiculos,
} from '../../aplicacion/puertos/repositorio-eventos-vehiculo';
import type { ClienteSupabaseServidor } from '../../../../compartido/infraestructura/supabase/cliente-servidor';
import {
  aFilaEventoVehiculo,
  aFilaVehiculo,
  aEventoVehiculoDesdeFila,
  type FilaEventoVehiculo,
} from './mapeadores-supabase';
import { errorAdaptadorSupabaseDesde } from '../../../../compartido/infraestructura/supabase/errores-adaptador';

const TABLA_VEHICULOS = 'fam_ve_vehiculos';
const TABLA_EVENTOS = 'fam_ve_eventos_vehiculo';

export class RepositorioEventosSupabase
  implements RepositorioEventosVehiculo, UnidadTrabajoVehiculos
{
  constructor(private readonly cliente: ClienteSupabaseServidor) {}

  async guardar(householdId: Identificador, evento: EventoVehiculo): Promise<void> {
    // `insert` (no `upsert`): los eventos son registros de auditoría inmutables sin
    // ruta de actualización en el puerto `RepositorioEventosVehiculo`. `upsert`
    // sobrescribiría en silencio una fila existente ante una colisión de id en vez de
    // fallar por violación de restricción, que es el comportamiento correcto aquí.
    const fila = aFilaEventoVehiculo(householdId, evento);
    const { error } = await this.cliente.from(TABLA_EVENTOS).insert(fila);

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo guardar el evento en ${TABLA_EVENTOS}`, error);
    }
  }

  async listarPorVehiculo(
    householdId: Identificador,
    vehiculoId: Identificador,
  ): Promise<EventoVehiculo[]> {
    const { data, error } = await this.cliente
      .from(TABLA_EVENTOS)
      .select('*')
      .eq('household_id', householdId.valor)
      .eq('vehiculo_id', vehiculoId.valor)
      .order('fecha', { ascending: false });

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo listar eventos en ${TABLA_EVENTOS}`, error);
    }

    return ((data as FilaEventoVehiculo[] | null) ?? []).map(aEventoVehiculoDesdeFila);
  }

  async listarConVencimiento(householdId: Identificador): Promise<EventoVehiculo[]> {
    const { data, error } = await this.cliente
      .from(TABLA_EVENTOS)
      .select('*')
      .eq('household_id', householdId.valor)
      .or('proximo_vencimiento_km.not.is.null,proximo_vencimiento_fecha.not.is.null');

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo listar vencimientos en ${TABLA_EVENTOS}`, error);
    }

    return ((data as FilaEventoVehiculo[] | null) ?? []).map(aEventoVehiculoDesdeFila);
  }

  /**
   * NOTA DE ATOMICIDAD (tarea 8): este PR no crea una migración nueva, por lo que no
   * hay una función RPC/transacción SQL disponible para coordinar ambas escrituras en
   * una sola operación de base de datos. Se coordina en aplicación: si corresponde
   * actualizar el kilometraje del vehículo, esa escritura se confirma PRIMERO; el
   * evento solo se confirma después y solo si la primera escritura tuvo éxito. Si la
   * actualización del vehículo falla, el evento NO se guarda y el error se propaga
   * (mismo contrato que `RepositorioEventosVehiculoEnMemoria`).
   *
   * Riesgo de consistencia aceptado y documentado: si el proceso de servidor cae
   * ENTRE ambas escrituras (vehículo ya actualizado, evento aún no guardado), el
   * kilometraje quedaría actualizado sin evento que lo respalde. No hay rollback
   * automático sin RPC; la compensación es detectar y reconciliar manualmente ese
   * caso (auditoría futura), no revertir el kilometraje de forma automática.
   */
  async registrarEventoYActualizarKilometraje(
    householdId: Identificador,
    datos: Readonly<{ evento: EventoVehiculo; vehiculoActualizado?: Vehiculo }>,
  ): Promise<void> {
    if (datos.vehiculoActualizado) {
      const filaVehiculo = aFilaVehiculo(householdId, datos.vehiculoActualizado);
      const { error: errorVehiculo } = await this.cliente.from(TABLA_VEHICULOS).upsert(filaVehiculo);

      if (errorVehiculo) {
        // Si la actualización del vehículo falla AQUÍ, el evento nunca llega a
        // confirmarse (se relanza antes de la escritura del evento): no hay
        // inconsistencia todavía, por eso este punto no necesita el log estructurado
        // de reconciliación (ver el punto real de riesgo más abajo).
        throw errorAdaptadorSupabaseDesde(
          'No se pudo actualizar el kilometraje del vehículo antes de confirmar el evento',
          errorVehiculo,
        );
      }
    }

    // `insert` (no `upsert`) por la misma razón que en `guardar()`: el evento es un
    // registro inmutable y una colisión de id debe fallar de forma distinguible
    // (violación de restricción), no sobrescribirse en silencio.
    const filaEvento = aFilaEventoVehiculo(householdId, datos.evento);
    const { error: errorEvento } = await this.cliente.from(TABLA_EVENTOS).insert(filaEvento);

    if (errorEvento) {
      const error = errorAdaptadorSupabaseDesde(`No se pudo guardar el evento en ${TABLA_EVENTOS}`, errorEvento);
      // AQUÍ SÍ está el riesgo de consistencia real documentado arriba: si llegamos a
      // este punto es porque la actualización del vehículo (si correspondía) YA se
      // confirmó, y ahora el evento falla. El kilometraje queda actualizado sin evento
      // que lo respalde. Este log estructurado es la señal concreta y grepeable que la
      // futura reconciliación manual necesita (household/vehículo/código de error), ya
      // que no hay rollback automático sin RPC/transacción.
      console.error('Fallo de atomicidad evento+kilometraje (evento no confirmado tras actualizar vehículo)', {
        householdId: householdId.valor,
        vehiculoId: datos.evento.vehiculoId.valor,
        codigo: error.codigo,
        mensaje: error.message,
      });
      throw error;
    }
  }
}
