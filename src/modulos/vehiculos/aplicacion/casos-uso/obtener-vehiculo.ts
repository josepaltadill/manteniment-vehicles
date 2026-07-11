import type { Identificador } from '../../../../compartido/dominio/identificador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import type { Vehiculo } from '../../dominio/vehiculo';
import type { ProveedorIdentidad } from '../puertos/proveedor-identidad';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasObtenerVehiculo = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  proveedorIdentidad: ProveedorIdentidad;
}>;

export type EntradaObtenerVehiculo = Readonly<{
  vehiculoId: Identificador;
}>;

export async function obtenerVehiculo(
  dependencias: DependenciasObtenerVehiculo,
  entrada: EntradaObtenerVehiculo,
): Promise<Vehiculo> {
  const { householdId } = await dependencias.proveedorIdentidad.obtenerContexto();
  const vehiculo = await dependencias.repositorioVehiculos.buscarPorId(householdId, entrada.vehiculoId);

  if (!vehiculo) {
    throw new ErrorDominio('No existe el vehículo indicado.');
  }

  return vehiculo;
}
