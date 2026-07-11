import Link from 'next/link';
import { listarVehiculos } from '@/modulos/vehiculos/aplicacion/casos-uso/listar-vehiculos';
import { crearDependenciasVehiculos } from '@/modulos/vehiculos/interfaz/composicion/dependencias-servidor';
import { ListaVehiculos } from '@/modulos/vehiculos/interfaz/componentes/lista-vehiculos';
import { aVehiculoVista } from '@/modulos/vehiculos/interfaz/vistas/vehiculo-vista';

export const dynamic = 'force-dynamic';

export default async function PaginaListadoVehiculos() {
  const dependencias = await crearDependenciasVehiculos();
  const vehiculos = await listarVehiculos(dependencias);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Vehículos</h1>
        <Link
          href="/vehiculos/nuevo"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Añadir vehículo
        </Link>
      </div>
      <ListaVehiculos vehiculos={vehiculos.map(aVehiculoVista)} />
    </main>
  );
}
