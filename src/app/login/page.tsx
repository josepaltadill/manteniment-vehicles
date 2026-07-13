import { iniciarSesion } from './acciones';

type PropiedadesPaginaLogin = Readonly<{
  searchParams: Promise<{ next?: string; error?: string }>;
}>;

export default async function PaginaLogin({ searchParams }: PropiedadesPaginaLogin) {
  const parametros = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Iniciar sesión</h1>
      <p className="mt-3 text-slate-700">Accedé con tus credenciales para continuar.</p>
      {parametros.error ? <p className="mt-4 text-sm text-red-700">No se pudo iniciar sesión con esas credenciales.</p> : null}
      <form action={iniciarSesion} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={parametros.next ?? ''} />
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
          Email
          <input className="rounded border border-slate-300 px-3 py-2" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-800">
          Contraseña
          <input className="rounded border border-slate-300 px-3 py-2" name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 font-semibold text-white" type="submit">Entrar</button>
      </form>
    </main>
  );
}
