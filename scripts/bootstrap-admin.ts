import { leerSolicitudBootstrap, serializarPlanBootstrap } from '../src/modulos/vehiculos/adaptadores/supabase/bootstrap-cli';
import {
  crearOperacionesBootstrapPostgres,
  ejecutarBootstrapPostgresDesdeEntorno,
  leerOpcionesConexionBootstrapDesdeEntorno,
} from '../src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres';

async function ejecutarPreflight(): Promise<void> {
  const solicitud = leerSolicitudBootstrap(process.argv.slice(2), process.env);
  const databaseUrl = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
  if (!databaseUrl?.trim()) throw new Error('Falta la variable privada obligatoria SUPABASE_BOOTSTRAP_DATABASE_URL.');

  const operaciones = await crearOperacionesBootstrapPostgres(
    databaseUrl,
    leerOpcionesConexionBootstrapDesdeEntorno(process.env),
  );
  try {
    const plan = await operaciones.planificarBootstrapFamiliar(
      solicitud.nombreDestino,
      solicitud.adminUserId,
      solicitud.confirmarRenombradoDesde,
    );
    console.log(serializarPlanBootstrap(plan));
    if (plan.estado === 'conflicto') process.exitCode = 1;
    if (solicitud.modo === 'apply') {
      throw new Error('--apply no está habilitado hasta que un operador apruebe y ejecute el plan transaccional revisado.');
    }
  } finally {
    await operaciones.cerrar();
  }
}

async function ejecutarSiembraHistorica(): Promise<void> {
  const resultado = await ejecutarBootstrapPostgresDesdeEntorno();
  console.log('Bootstrap administrativo completado.');
  console.log(`  householdId: ${resultado.householdId.valor}`);
  console.log(`  userId: ${resultado.userId.valor}`);
}

async function main(): Promise<void> {
  const preflightSolicitado = process.argv.slice(2).some((argumento) => argumento === '--check' || argumento === '--apply');
  await (preflightSolicitado ? ejecutarPreflight() : ejecutarSiembraHistorica());
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error: unknown) => {
    console.error('Bootstrap administrativo falló.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
