// Adaptador Supabase de SERVIDOR para `fam_ve_vehiculos`. Solo debe importarse desde
// server actions, Server Components o adaptadores de servidor (nunca desde
// componentes cliente). RLS ya activa por hogar es la frontera real; este
// adaptador es responsable de inyectar/filtrar `household_id` explícitamente en
// toda escritura y lectura (ver diseño §6.2 y §7.2).
import type { Identificador } from '../../../../compartido/dominio/identificador';
import type { Vehiculo } from '../../dominio/vehiculo';
import type { RepositorioVehiculos } from '../../aplicacion/puertos/repositorio-vehiculos';
import type { ClienteSupabaseServidor } from '../../../../compartido/infraestructura/supabase/cliente-servidor';
import { aFilaVehiculo, aVehiculoDesdeFila, type FilaVehiculo } from './mapeadores-supabase';
import { errorAdaptadorSupabaseDesde } from '../../../../compartido/infraestructura/supabase/errores-adaptador';

const TABLA = 'fam_ve_vehiculos';

export class RepositorioVehiculosSupabase implements RepositorioVehiculos {
  constructor(private readonly cliente: ClienteSupabaseServidor) {}

  async guardar(householdId: Identificador, vehiculo: Vehiculo): Promise<void> {
    const fila = aFilaVehiculo(householdId, vehiculo);
    const { error } = await this.cliente.from(TABLA).upsert(fila);

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo guardar el vehículo en ${TABLA}`, error);
    }
  }

  async buscarPorId(householdId: Identificador, id: Identificador): Promise<Vehiculo | null> {
    const { data, error } = await this.cliente
      .from(TABLA)
      .select('*')
      .eq('household_id', householdId.valor)
      .eq('id', id.valor)
      .maybeSingle();

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo buscar el vehículo en ${TABLA}`, error);
    }

    return data ? aVehiculoDesdeFila(data as FilaVehiculo) : null;
  }

  async listar(householdId: Identificador): Promise<Vehiculo[]> {
    const { data, error } = await this.cliente
      .from(TABLA)
      .select('*')
      .eq('household_id', householdId.valor)
      .order('matricula', { ascending: true });

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo listar vehículos en ${TABLA}`, error);
    }

    return ((data as FilaVehiculo[] | null) ?? []).map(aVehiculoDesdeFila);
  }

  async existeMatricula(householdId: Identificador, matricula: string): Promise<boolean> {
    const { data, error } = await this.cliente
      .from(TABLA)
      .select('id')
      .eq('household_id', householdId.valor)
      .eq('matricula', matricula)
      .limit(1);

    if (error) {
      throw errorAdaptadorSupabaseDesde(`No se pudo verificar la matrícula en ${TABLA}`, error);
    }

    return ((data as unknown[] | null)?.length ?? 0) > 0;
  }
}
