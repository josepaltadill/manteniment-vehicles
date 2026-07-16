import type { Identificador } from '../../../../compartido/dominio/identificador';
import { ErrorDominio } from '../../dominio/errores-dominio';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import type { RepositorioVehiculos } from '../puertos/repositorio-vehiculos';

export type DependenciasCorregirKilometraje = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  contextoFamiliar: ContextoAplicacion;
}>;

export type EntradaCorregirKilometraje = Readonly<{
  vehiculoId: Identificador;
  kilometrosActuales: number;
}>;

export async function corregirKilometraje(
  dependencias: DependenciasCorregirKilometraje,
  entrada: EntradaCorregirKilometraje,
): Promise<void> {
  const { householdId } = dependencias.contextoFamiliar;
  const vehiculo = await dependencias.repositorioVehiculos.buscarPorId(householdId, entrada.vehiculoId);

  if (!vehiculo) {
    throw new ErrorDominio('No existe el vehículo indicado.');
  }

  await dependencias.repositorioVehiculos.guardar(
    householdId,
    vehiculo.corregirKilometraje(entrada.kilometrosActuales),
  );
}
