import type { Identificador } from '../../../../compartido/dominio/identificador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import type { Vehiculo } from '../../dominio/vehiculo';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasObtenerVehiculo = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  contextoFamiliar: ContextoAplicacion;
}>;

export type EntradaObtenerVehiculo = Readonly<{
  vehiculoId: Identificador;
}>;

export async function obtenerVehiculo(
  dependencias: DependenciasObtenerVehiculo,
  entrada: EntradaObtenerVehiculo,
): Promise<Vehiculo> {
  const { householdId } = dependencias.contextoFamiliar;
  const vehiculo = await dependencias.repositorioVehiculos.buscarPorId(householdId, entrada.vehiculoId);

  if (!vehiculo) {
    throw new ErrorDominio('No existe el vehículo indicado.');
  }

  return vehiculo;
}
