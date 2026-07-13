import 'server-only';

import { cookies } from 'next/headers';
import { leerEntornoRuntimeSupabase, type EntornoRuntimeSupabase } from '../../../../compartido/infraestructura/entorno';
import { crearClienteSupabaseSsrPorSolicitud } from '../../../../compartido/infraestructura/supabase/cliente-supabase-ssr';
import type { ProveedorFecha } from '../../aplicacion/puertos/proveedor-fecha';
import type { ProveedorIdentidad } from '../../aplicacion/puertos/proveedor-identidad';
import { exigirContextoFamiliar } from '../../aplicacion/servicios/resolver-acceso-familiar';
import { ProveedorFechaSistema } from '../../adaptadores/sistema/proveedor-fecha-sistema';
import { ProveedorIdentidadSupabaseServidor } from '../../adaptadores/supabase/proveedor-identidad-supabase-servidor';
import { RepositorioEventosSupabase } from '../../adaptadores/supabase/repositorio-eventos-supabase';
import { RepositorioVehiculosSupabase } from '../../adaptadores/supabase/repositorio-vehiculos-supabase';
import type { RepositorioEventosVehiculo, UnidadTrabajoVehiculos } from '../../aplicacion/puertos/repositorio-eventos-vehiculo';
import type { RepositorioVehiculos } from '../../aplicacion/puertos/repositorio-vehiculos';

export type DependenciasVehiculos = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  repositorioEventosVehiculo: RepositorioEventosVehiculo;
  unidadTrabajoVehiculos: UnidadTrabajoVehiculos;
  proveedorIdentidad: ProveedorIdentidad;
  proveedorFecha: ProveedorFecha;
}>;

export async function crearDependenciasVehiculos(
  entorno: EntornoRuntimeSupabase = leerEntornoRuntimeSupabase(),
): Promise<DependenciasVehiculos> {
  const almacenCookies = await cookies();
  const cliente = crearClienteSupabaseSsrPorSolicitud(entorno, {
    getAll: () => almacenCookies.getAll(),
    setAll: (cookiesParaEscribir) => {
      for (const { name, value, options } of cookiesParaEscribir) almacenCookies.set(name, value, options);
    },
  });
  const proveedorResolucion = new ProveedorIdentidadSupabaseServidor(cliente);
  const contexto = await exigirContextoFamiliar(proveedorResolucion);
  const proveedorIdentidad: ProveedorIdentidad = {
    obtenerContexto: async () => contexto,
    resolverAcceso: async () => ({ estado: 'concedido', contexto }),
  };
  const repositorioEventosSupabase = new RepositorioEventosSupabase(cliente);

  return {
    repositorioVehiculos: new RepositorioVehiculosSupabase(cliente),
    repositorioEventosVehiculo: repositorioEventosSupabase,
    unidadTrabajoVehiculos: repositorioEventosSupabase,
    proveedorIdentidad,
    proveedorFecha: new ProveedorFechaSistema(),
  };
}
