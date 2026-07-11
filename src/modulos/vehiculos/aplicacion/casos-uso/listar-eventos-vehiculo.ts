import type { Identificador } from '../../../../compartido/dominio/identificador';
import type { EventoVehiculo } from '../../dominio/evento-vehiculo';
import type { ProveedorIdentidad } from '../puertos/proveedor-identidad';
import type { RepositorioEventosVehiculo } from '../puertos/repositorio-eventos-vehiculo';

export type DependenciasListarEventosVehiculo = Readonly<{
  repositorioEventosVehiculo: RepositorioEventosVehiculo;
  proveedorIdentidad: ProveedorIdentidad;
}>;

export type EntradaListarEventosVehiculo = Readonly<{
  vehiculoId: Identificador;
}>;

export async function listarEventosVehiculo(
  dependencias: DependenciasListarEventosVehiculo,
  entrada: EntradaListarEventosVehiculo,
): Promise<EventoVehiculo[]> {
  const { householdId } = await dependencias.proveedorIdentidad.obtenerContexto();

  return dependencias.repositorioEventosVehiculo.listarPorVehiculo(householdId, entrada.vehiculoId);
}
