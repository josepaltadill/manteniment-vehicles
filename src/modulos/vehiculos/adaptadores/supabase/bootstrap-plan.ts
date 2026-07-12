import 'server-only';

type MiembroBootstrap = Readonly<{ userId: string; rol: 'admin' | 'editor' }>;
type HogarBootstrap = Readonly<{
  id: string;
  nombre: string;
  vehiculos: number;
  eventos: number;
  miembros: readonly MiembroBootstrap[];
}>;

export type EntradaPlanBootstrapFamiliar = Readonly<{
  nombreDestino: string;
  adminUserId: string;
  confirmarRenombradoDesde?: string;
  hogares: readonly HogarBootstrap[];
}>;

type AccionPlan =
  | Readonly<{ tipo: 'noop'; householdId: string }>
  | Readonly<{ tipo: 'create-household'; nombre: string }>
  | Readonly<{ tipo: 'rename-household'; householdId: string; nombre: string }>
  | Readonly<{ tipo: 'insert-membership'; householdId: string | null; userId: string }>
  | Readonly<{ tipo: 'noop-membership'; householdId: string; userId: string }>;

type PlanListo = Readonly<{
  estado: 'listo';
  acciones: readonly AccionPlan[];
  conteos: Readonly<{ vehiculos: number; eventos: number }>;
}>;
type PlanConflicto = Readonly<{ estado: 'conflicto'; acciones: readonly []; conflictos: readonly string[] }>;
export type PlanBootstrapFamiliar = PlanListo | PlanConflicto;

const normalizar = (valor: string) => valor.trim().toLocaleLowerCase('es');

export function crearPlanBootstrapFamiliar(entrada: EntradaPlanBootstrapFamiliar): PlanBootstrapFamiliar {
  const destino = normalizar(entrada.nombreDestino);
  const destinos = entrada.hogares.filter((hogar) => normalizar(hogar.nombre) === destino);
  if (destinos.length > 1) return conflicto('nombre-destino-ambiguo');

  const hogaresDelAdmin = entrada.hogares.filter((hogar) =>
    hogar.miembros.some((miembro) => miembro.userId === entrada.adminUserId),
  );
  if (hogaresDelAdmin.length > 1) return conflicto('admin-con-varias-membresias');

  const destinoExistente = destinos[0];
  if (destinoExistente) return planParaHogarDestino(destinoExistente, entrada.adminUserId);

  const candidato = hogaresDelAdmin[0];
  if (!candidato) {
    return { estado: 'listo', acciones: [{ tipo: 'create-household', nombre: entrada.nombreDestino }, { tipo: 'insert-membership', householdId: null, userId: entrada.adminUserId }], conteos: { vehiculos: 0, eventos: 0 } };
  }
  if (entrada.confirmarRenombradoDesde !== candidato.id) return conflicto('renombrado-no-confirmado');

  const membresia = candidato.miembros.find((miembro) => miembro.userId === entrada.adminUserId);
  if (membresia?.rol !== 'admin') return conflicto('membresia-inesperada');
  return {
    estado: 'listo',
    acciones: [{ tipo: 'rename-household', householdId: candidato.id, nombre: entrada.nombreDestino }, { tipo: 'noop-membership', householdId: candidato.id, userId: entrada.adminUserId }],
    conteos: { vehiculos: candidato.vehiculos, eventos: candidato.eventos },
  };
}

function planParaHogarDestino(hogar: HogarBootstrap, adminUserId: string): PlanBootstrapFamiliar {
  const membresia = hogar.miembros.find((miembro) => miembro.userId === adminUserId);
  if (membresia && membresia.rol !== 'admin') return conflicto('membresia-inesperada');
  if (membresia) return { estado: 'listo', acciones: [{ tipo: 'noop', householdId: hogar.id }], conteos: { vehiculos: hogar.vehiculos, eventos: hogar.eventos } };
  return { estado: 'listo', acciones: [{ tipo: 'noop', householdId: hogar.id }, { tipo: 'insert-membership', householdId: hogar.id, userId: adminUserId }], conteos: { vehiculos: hogar.vehiculos, eventos: hogar.eventos } };
}

function conflicto(motivo: string): PlanConflicto {
  return { estado: 'conflicto', acciones: [], conflictos: [motivo] };
}
