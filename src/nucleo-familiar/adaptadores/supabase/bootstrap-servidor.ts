// Bootstrap SERVIDOR-ONLY del hogar/usuario de desarrollo (diseño §15.6/§15.7).
//
// Por qué no pasa por el cliente Supabase normal (anon key + RLS): la migración
// NO otorga privilegio de insert sobre `fam_hogares` a `authenticated`
// (solo select/update/delete), y `fam_miembros_hogar_insert_admin` exige YA
// ser admin del hogar para insertar la primera membresía. Es decir: RLS impide,
// a propósito, que cualquier usuario autenticado normal se auto-nombre admin de
// un hogar nuevo. El primer admin de un hogar solo puede sembrarse fuera de esa
// frontera (acceso administrativo directo a la base, ejecutado una única vez por
// un operador/proceso de bootstrap, nunca con la `service_role` key de la app en
// ejecución ni desde código cliente). `OperacionesBootstrap` representa ese acceso
// aislado y `OperacionesBootstrapPostgres` lo implementa usando una conexión Postgres
// administrativa que solo debe existir en un proceso server-only de bootstrap.
//
// La migración `20260711000000_fam_hogares_nombre_unique.sql` protege la creación
// concurrente de hogares. La reconsulta posterior se conserva como defensa adicional
// para detectar datos históricos corruptos o un adaptador administrativo incorrecto.
//
// El `import 'server-only'` de abajo solo hace fallar el build si este módulo se
// bundlea para un Client Component; no impide que una Server Action u otra ruta de
// servidor lo importe indebidamente, ya que ambas comparten el mismo grafo de
// compilación server-side. La protección real contra eso es la allowlist en
// `seguridad-servidor.ts` (`detectarImportadoresNoPermitidosDeBootstrap`):
// solo `operaciones-bootstrap-postgres.ts` y `scripts/bootstrap-admin.ts`
// pueden importar este módulo; el test falla si aparece un import estático o
// dinámico (`import()`/`require()`) desde cualquier otro archivo. No cubre un
// re-export vía barrel ni un alias de `tsconfig.json` que renombre el
// specifier sin conservar el nombre del módulo.
import 'server-only';
import { crearIdentificador, type Identificador } from '../../../compartido/dominio/identificador';
import type { RolUsuario } from '../../dominio/rol-familiar';

export class ErrorRaceBootstrapHogar extends Error {
  constructor(nombre: string, cantidadEncontrada: number) {
    super(
      `Condición de carrera detectada al sembrar el hogar de desarrollo "${nombre}": ` +
        `se encontraron ${cantidadEncontrada} hogares con ese nombre justo después de crearlo. ` +
        'La restricción `fam_hogares_nombre_key` debería impedir este estado; ' +
        'se aborta para evitar continuar con datos históricos corruptos o un adaptador administrativo incorrecto.',
    );
    this.name = 'ErrorRaceBootstrapHogar';
  }
}

export class ErrorMembresiaNoAdminBootstrap extends Error {
  constructor(householdId: string, userId: string, rolActual: string) {
    super(
      `El usuario de bootstrap ${userId} ya tiene una membresía en el hogar ${householdId} ` +
        `con rol "${rolActual}", no "admin". El bootstrap no sobrescribe roles existentes: ` +
        'si este cambio de rol fue intencional, resolver manualmente (decidir si corresponde ' +
        'promover a admin o si el bootstrap está apuntando al hogar/usuario equivocado) antes de reintentar.',
    );
    this.name = 'ErrorMembresiaNoAdminBootstrap';
  }
}

export type OperacionesBootstrap = Readonly<{
  buscarUsuarioPorEmail(email: string): Promise<{ id: string } | null>;
  crearUsuario(email: string, password: string): Promise<{ id: string }>;
  buscarHogarPorNombre(nombre: string): Promise<{ id: string } | null>;
  crearHogar(nombre: string): Promise<{ id: string }>;
  /** Re-query usado tras crear un hogar para detectar duplicados por condición de carrera (ver comentario de módulo). */
  contarHogaresPorNombre(nombre: string): Promise<number>;
  buscarMembresia(householdId: string, userId: string): Promise<{ rol: RolUsuario } | null>;
  crearMembresiaAdmin(householdId: string, userId: string): Promise<void>;
}>;

export type EntradaBootstrap = Readonly<{
  bootstrapEmail: string;
  bootstrapPassword: string;
  bootstrapHouseholdNombre: string;
}>;

export type ContextoBootstrap = Readonly<{
  householdId: Identificador;
  userId: Identificador;
}>;

export async function sembrarHogarDeDesarrollo(
  operaciones: OperacionesBootstrap,
  entrada: EntradaBootstrap,
): Promise<ContextoBootstrap> {
  const usuario =
    (await operaciones.buscarUsuarioPorEmail(entrada.bootstrapEmail)) ??
    (await operaciones.crearUsuario(entrada.bootstrapEmail, entrada.bootstrapPassword));

  const hogarExistente = await operaciones.buscarHogarPorNombre(entrada.bootstrapHouseholdNombre);
  const hogar = hogarExistente ?? (await operaciones.crearHogar(entrada.bootstrapHouseholdNombre));

  if (!hogarExistente) {
    // Solo verificamos tras CREAR (no tras encontrar uno existente): es el único
    // momento en que esta invocación pudo introducir un duplicado por condición de carrera.
    const cantidadConEseNombre = await operaciones.contarHogaresPorNombre(
      entrada.bootstrapHouseholdNombre,
    );

    if (cantidadConEseNombre > 1) {
      throw new ErrorRaceBootstrapHogar(entrada.bootstrapHouseholdNombre, cantidadConEseNombre);
    }
  }

  const membresia = await operaciones.buscarMembresia(hogar.id, usuario.id);

  if (!membresia) {
    await operaciones.crearMembresiaAdmin(hogar.id, usuario.id);
  } else if (membresia.rol !== 'admin') {
    throw new ErrorMembresiaNoAdminBootstrap(hogar.id, usuario.id, membresia.rol);
  }

  return {
    householdId: crearIdentificador(hogar.id),
    userId: crearIdentificador(usuario.id),
  };
}
