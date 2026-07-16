import type { Identificador } from '../../../../compartido/dominio/identificador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import type { ProveedorFecha } from '../puertos/proveedor-fecha';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasDesactivarVehiculo = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  contextoFamiliar: ContextoAplicacion;
  proveedorFecha: ProveedorFecha;
}>;

export type EntradaDesactivarVehiculo = Readonly<{
  vehiculoId: Identificador;
}>;

export async function desactivarVehiculo(
  dependencias: DependenciasDesactivarVehiculo,
  entrada: EntradaDesactivarVehiculo,
): Promise<void> {
  const { householdId } = dependencias.contextoFamiliar;
  const vehiculo = await dependencias.repositorioVehiculos.buscarPorId(householdId, entrada.vehiculoId);

  if (!vehiculo) {
    throw new ErrorDominio('No existe el vehículo indicado.');
  }

  await dependencias.repositorioVehiculos.guardar(
    householdId,
    vehiculo.desactivar(dependencias.proveedorFecha.ahora()),
  );
}
