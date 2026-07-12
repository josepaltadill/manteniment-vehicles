import 'server-only';
import type { PlanBootstrapFamiliar } from './bootstrap-plan';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOMBRE_PRODUCTIVO = 'Familia Altadill';

export type SolicitudBootstrap = Readonly<{
  modo: 'check' | 'apply';
  adminUserId: string;
  nombreDestino: typeof NOMBRE_PRODUCTIVO;
  confirmarRenombradoDesde: string | undefined;
}>;

export function leerSolicitudBootstrap(argumentos: readonly string[], entorno: Readonly<Record<string, string | undefined>>): SolicitudBootstrap {
  const modo = argumentos.includes('--apply') ? 'apply' : 'check';
  if (argumentos.some((argumento) => !['--check', '--apply', '--confirm'].includes(argumento) && !argumento.startsWith('--rename-from='))) {
    throw new Error('Argumento de bootstrap no reconocido.');
  }
  if (modo === 'apply' && !argumentos.includes('--confirm')) throw new Error('--apply requiere --confirm.');
  const adminUserId = entorno.SUPABASE_BOOTSTRAP_ADMIN_USER_ID?.trim() ?? '';
  if (!UUID.test(adminUserId)) throw new Error('SUPABASE_BOOTSTRAP_ADMIN_USER_ID debe ser un UUID Auth válido.');
  const confirmarRenombradoDesde = argumentos.find((argumento) => argumento.startsWith('--rename-from='))?.slice('--rename-from='.length);
  if (confirmarRenombradoDesde && !UUID.test(confirmarRenombradoDesde)) throw new Error('--rename-from debe ser un UUID válido.');
  return { modo, adminUserId, nombreDestino: NOMBRE_PRODUCTIVO, confirmarRenombradoDesde };
}

export function serializarPlanBootstrap(plan: PlanBootstrapFamiliar): string {
  return JSON.stringify(plan, null, 2);
}
