import { cerrarSesion } from '../login/acciones';

export default function PaginaAccesoNoDisponible() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Acceso no disponible</h1>
      <p className="mt-3 text-slate-700">Tu cuenta no tiene un acceso familiar disponible en este momento.</p>
      <form action={cerrarSesion} className="mt-6">
        <button className="rounded bg-slate-900 px-4 py-2 font-semibold text-white" type="submit">Cerrar sesión</button>
      </form>
    </main>
  );
}
