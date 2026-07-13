import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { reportarIncidente } from '../../../../compartido/infraestructura/reporte-incidentes';
import type { ClienteSupabaseSsr } from '../../../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import type { AccesoFamiliar, ContextoAplicacion, ProveedorIdentidad } from '../../aplicacion/puertos/proveedor-identidad';
import { esRolUsuario } from '../../dominio/rol-usuario';

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type FilaMembresia = Readonly<{ household_id: string; rol: string }>;

function esFilaMembresia(valor: unknown): valor is FilaMembresia {
  if (typeof valor !== 'object' || valor === null) return false;
  const fila = valor as Record<string, unknown>;
  return typeof fila.household_id === 'string' && typeof fila.rol === 'string';
}

function reportarFalloOperativo(codigo: 'auth_get_user' | 'membership_query'): void {
  reportarIncidente({
    contexto: 'resolver-acceso-familiar',
    error: new Error('Fallo operativo al resolver el acceso familiar.'),
    metadatos: { codigo },
  });
}

export class ProveedorIdentidadSupabaseServidor implements ProveedorIdentidad {
  constructor(private readonly cliente: ClienteSupabaseSsr) {}

  async resolverAcceso(): Promise<AccesoFamiliar> {
    const { data, error } = await this.cliente.auth.getUser();
    if (error) reportarFalloOperativo('auth_get_user');
    if (error || !data.user) return { estado: 'anonimo' };
    const respuesta = await this.cliente.from('mv_household_members')
      .select('household_id, rol').eq('user_id', data.user.id).limit(2);
    if (respuesta.error) {
      reportarFalloOperativo('membership_query');
      return { estado: 'sin-acceso', motivo: 'error-operativo' };
    }

    const membresias = respuesta.data ?? [];
    if (!membresias.length) return { estado: 'sin-acceso', motivo: 'sin-membresia' };
    if (membresias.length > 1) return { estado: 'sin-acceso', motivo: 'multiples-membresias' };
    const [membresia] = membresias;
    if (!esFilaMembresia(membresia)) return { estado: 'sin-acceso', motivo: 'datos-invalidos' };
    if (![data.user.id, membresia.household_id].every((id) => PATRON_UUID.test(id)) || !esRolUsuario(membresia.rol)) {
      return { estado: 'sin-acceso', motivo: 'datos-invalidos' };
    }
    return { estado: 'concedido', contexto: {
      actor: { id: crearIdentificador(data.user.id), rol: membresia.rol },
      householdId: crearIdentificador(membresia.household_id),
    } };
  }

  async obtenerContexto(): Promise<ContextoAplicacion> {
    const acceso = await this.resolverAcceso();
    if (acceso.estado !== 'concedido') throw new Error('Contexto familiar no disponible.');
    return acceso.contexto;
  }
}
