import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ErrorDominio } from '@/modulos/vehiculos/dominio/errores-dominio';
import { listarEventosVehiculo } from '@/modulos/vehiculos/aplicacion/casos-uso/listar-eventos-vehiculo';
import { obtenerVehiculo } from '@/modulos/vehiculos/aplicacion/casos-uso/obtener-vehiculo';
import { crearDependenciasVehiculos } from '@/modulos/vehiculos/interfaz/composicion/dependencias-servidor';
import { FormularioCorreccionKilometraje } from '@/modulos/vehiculos/interfaz/componentes/formulario-correccion-kilometraje';
import { HistorialEventos } from '@/modulos/vehiculos/interfaz/componentes/historial-eventos';
import { crearIdentificador } from '@/compartido/dominio/identificador';
import { aEventoVista } from '@/modulos/vehiculos/interfaz/vistas/evento-vista';
import { aVehiculoVista } from '@/modulos/vehiculos/interfaz/vistas/vehiculo-vista';

export const dynamic = 'force-dynamic';

export default async function PaginaDetalleVehiculo({
  params,
}: Readonly<{ params: Promise<{ vehiculoId: string }> }>) {
  const { vehiculoId } = await params;
  const dependencias = await crearDependenciasVehiculos();

  let vehiculo;
  try {
    vehiculo = await obtenerVehiculo(dependencias, { vehiculoId: crearIdentificador(vehiculoId) });
  } catch (error) {
    if (error instanceof ErrorDominio) {
      notFound();
    }
    throw error;
  }

  const eventos = await listarEventosVehiculo(dependencias, { vehiculoId: vehiculo.id });
  const vehiculoVista = aVehiculoVista(vehiculo);
  const fechaActual = dependencias.proveedorFecha.ahora();
  const eventosVista = eventos.map((evento) =>
    aEventoVista(evento, { kilometrosActuales: vehiculo.kilometrosActuales, fechaActual }),
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <Link href="/vehiculos" className="text-sm text-slate-600 hover:underline">
          ← Volver al listado
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {vehiculoVista.matricula} — {vehiculoVista.marca} {vehiculoVista.modelo}
        </h1>
        <p className="text-sm text-slate-600">
          {vehiculoVista.anio} · {vehiculoVista.combustible} ·{' '}
          <span data-estado={vehiculoVista.estado}>
            {vehiculoVista.estado === 'activo' ? 'Activo' : 'Inactivo'}
          </span>
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-950">Kilometraje</h2>
        <FormularioCorreccionKilometraje
          vehiculoId={vehiculoVista.id}
          kilometrosActuales={vehiculoVista.kilometrosActuales}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Histórico de eventos</h2>
          <Link
            href={`/vehiculos/${vehiculoVista.id}/eventos/nuevo`}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Añadir evento
          </Link>
        </div>
        <HistorialEventos eventos={eventosVista} />
      </section>
    </main>
  );
}
