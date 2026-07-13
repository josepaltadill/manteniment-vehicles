import { FormularioVehiculo } from '../../../modulos/vehiculos/interfaz/componentes/formulario-vehiculo';
import { crearDependenciasVehiculos } from '../../../modulos/vehiculos/interfaz/composicion/dependencias-servidor';

export const dynamic = 'force-dynamic';

export default async function PaginaNuevoVehiculo() {
  await crearDependenciasVehiculos();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Añadir vehículo</h1>
      <FormularioVehiculo />
    </main>
  );
}
