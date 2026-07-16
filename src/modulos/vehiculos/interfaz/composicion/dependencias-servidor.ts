import 'server-only';

import type { ProveedorFecha } from '../../aplicacion/puertos/proveedor-fecha';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';
import { ProveedorFechaSistema } from '../../adaptadores/sistema/proveedor-fecha-sistema';
import { RepositorioEventosSupabase } from '../../adaptadores/supabase/repositorio-eventos-supabase';
import { RepositorioVehiculosSupabase } from '../../adaptadores/supabase/repositorio-vehiculos-supabase';
import type { ClienteSupabaseSsr } from '../../../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import type { RepositorioEventosVehiculo, UnidadTrabajoVehiculos } from '../../aplicacion/puertos/repositorio-eventos-vehiculo';
import type { RepositorioVehiculos } from '../../aplicacion/puertos/repositorio-vehiculos';

export type AlcanceFamiliar = Readonly<{ clienteSupabase: ClienteSupabaseSsr; contextoFamiliar: ContextoAplicacion }>;
export type DependenciasVehiculos = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  repositorioEventosVehiculo: RepositorioEventosVehiculo;
  unidadTrabajoVehiculos: UnidadTrabajoVehiculos;
  contextoFamiliar: ContextoAplicacion;
  proveedorFecha: ProveedorFecha;
}>;

export function crearDependenciasVehiculos(alcance: AlcanceFamiliar): DependenciasVehiculos {
  const repositorioEventosSupabase = new RepositorioEventosSupabase(alcance.clienteSupabase);
  return {
    repositorioVehiculos: new RepositorioVehiculosSupabase(alcance.clienteSupabase),
    repositorioEventosVehiculo: repositorioEventosSupabase,
    unidadTrabajoVehiculos: repositorioEventosSupabase,
    contextoFamiliar: alcance.contextoFamiliar,
    proveedorFecha: new ProveedorFechaSistema(),
  };
}
