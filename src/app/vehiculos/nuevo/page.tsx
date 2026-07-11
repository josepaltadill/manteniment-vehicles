import { FormularioVehiculo } from '@/modulos/vehiculos/interfaz/componentes/formulario-vehiculo';

export default function PaginaNuevoVehiculo() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Añadir vehículo</h1>
      <FormularioVehiculo />
    </main>
  );
}
