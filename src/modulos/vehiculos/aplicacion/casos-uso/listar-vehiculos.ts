import type { Vehiculo } from '../../dominio/vehiculo';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasListarVehiculos = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  contextoFamiliar: ContextoAplicacion;
}>;

export async function listarVehiculos(
  dependencias: DependenciasListarVehiculos,
): Promise<Vehiculo[]> {
  const { householdId } = dependencias.contextoFamiliar;

  return dependencias.repositorioVehiculos.listar(householdId);
}
