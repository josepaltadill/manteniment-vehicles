import { ErrorDominio } from '../../dominio/errores-dominio';
import { crearVehiculo, type DatosCrearVehiculo, type Vehiculo } from '../../dominio/vehiculo';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasRegistrarVehiculo = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  contextoFamiliar: ContextoAplicacion;
}>;

export async function registrarVehiculo(
  dependencias: DependenciasRegistrarVehiculo,
  datos: DatosCrearVehiculo,
): Promise<Vehiculo> {
  const { householdId } = dependencias.contextoFamiliar;

  if (await dependencias.repositorioVehiculos.existeMatricula(householdId, datos.matricula)) {
    throw new ErrorDominio('Ya existe un vehículo con esa matrícula.');
  }

  const vehiculo = crearVehiculo(datos);
  await dependencias.repositorioVehiculos.guardar(householdId, vehiculo);

  return vehiculo;
}
