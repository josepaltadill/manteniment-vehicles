import type { Identificador } from '../../../../compartido/dominio/identificador';
import type { RolUsuario } from '../../dominio/rol-usuario';

export type ActorAplicacion = Readonly<{
  id: Identificador;
  rol: RolUsuario;
}>;

// El hogar entra a la aplicación por aquí, igual que el actor: es contexto de sesión
// ambiental. Los puertos de persistencia reciben `householdId` explícito por llamada;
// el dominio permanece agnóstico al hogar.
export type ContextoAplicacion = Readonly<{
  actor: ActorAplicacion;
  householdId: Identificador;
}>;

export type AccesoFamiliar =
  | Readonly<{ estado: 'anonimo' }>
  | Readonly<{ estado: 'sin-acceso'; motivo: 'sin-membresia' | 'multiples-membresias' | 'datos-invalidos' | 'error-operativo' }>
  | Readonly<{ estado: 'concedido'; contexto: ContextoAplicacion }>;

export interface ProveedorIdentidad {
  obtenerContexto(): Promise<ContextoAplicacion>;
  resolverAcceso?(): Promise<AccesoFamiliar>;
}
