import { FormularioEvento } from '@/modulos/vehiculos/interfaz/componentes/formulario-evento';

export default async function PaginaNuevoEvento({
  params,
}: Readonly<{ params: Promise<{ vehiculoId: string }> }>) {
  const { vehiculoId } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Añadir evento</h1>
      <FormularioEvento vehiculoId={vehiculoId} />
    </main>
  );
}
