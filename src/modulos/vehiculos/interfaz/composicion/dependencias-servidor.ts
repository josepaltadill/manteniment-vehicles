// Composición de servidor para server actions/Server Components (PR3, diseño §6.3).
//
// Solo debe importarse desde código de servidor (server actions o Server Components):
// construye un cliente Supabase autenticado como el usuario sembrado (nunca
// `service_role`) y los repositorios reales `mv_vehiculos`/`mv_eventos_vehiculo`.
//
// El `ProveedorIdentidad` sigue siendo el patrón temporal ya establecido en PR1/PR2
// (`ProveedorIdentidadTemporal`, sin auth real): este PR no resuelve login de
// usuarios ni bootstrap real contra Postgres (ver `supabase/migrations/README.md`,
// sección "PR3 — composición de servidor"). El `householdId` fijo que usa ya no es
// un texto arbitrario: debe ser el UUID real de `mv_households.id` sembrado fuera de
// banda, leído desde `SUPABASE_HOUSEHOLD_ID_DESARROLLO`.
import { timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { leerEntornoSupabase, type EntornoSupabase } from '../../../../compartido/infraestructura/entorno';
import type { ProveedorFecha } from '../../aplicacion/puertos/proveedor-fecha';
import type { ProveedorIdentidad } from '../../aplicacion/puertos/proveedor-identidad';
import type {
  RepositorioEventosVehiculo,
  UnidadTrabajoVehiculos,
} from '../../aplicacion/puertos/repositorio-eventos-vehiculo';
import type { RepositorioVehiculos } from '../../aplicacion/puertos/repositorio-vehiculos';
import { ProveedorIdentidadTemporal } from '../../aplicacion/pruebas/proveedor-identidad-temporal';
import { ProveedorFechaSistema } from '../../adaptadores/sistema/proveedor-fecha-sistema';
import { crearClienteSupabaseServidor } from '../../adaptadores/supabase/cliente-supabase-servidor';
import { RepositorioEventosSupabase } from '../../adaptadores/supabase/repositorio-eventos-supabase';
import { RepositorioVehiculosSupabase } from '../../adaptadores/supabase/repositorio-vehiculos-supabase';

export type DependenciasVehiculos = Readonly<{
  repositorioVehiculos: RepositorioVehiculos;
  repositorioEventosVehiculo: RepositorioEventosVehiculo;
  unidadTrabajoVehiculos: UnidadTrabajoVehiculos;
  proveedorIdentidad: ProveedorIdentidad;
  proveedorFecha: ProveedorFecha;
}>;

export class ErrorAccesoVehiculos extends Error {
  constructor() {
    super('Acceso a vehículos no autorizado.');
    this.name = 'ErrorAccesoVehiculos';
  }
}

type PruebaAcceso = Readonly<{ tokenPresentado: string | null; tokenEsperado: string | undefined }>;

async function leerPruebaAccesoSolicitud(): Promise<PruebaAcceso> {
  const cabeceras = await headers();
  return {
    tokenPresentado: cabeceras.get('x-vehiculos-access-token'),
    tokenEsperado: process.env.VEHICULOS_ACCESS_TOKEN,
  };
}

function validarPruebaAcceso({ tokenPresentado, tokenEsperado }: PruebaAcceso): void {
  if (!tokenPresentado || !tokenEsperado) throw new ErrorAccesoVehiculos();
  const presentado = Buffer.from(tokenPresentado);
  const esperado = Buffer.from(tokenEsperado);
  if (presentado.length !== esperado.length || !timingSafeEqual(presentado, esperado)) {
    throw new ErrorAccesoVehiculos();
  }
}

export async function crearDependenciasVehiculos(
  entorno: EntornoSupabase = leerEntornoSupabase(),
  pruebaAcceso?: PruebaAcceso,
): Promise<DependenciasVehiculos> {
  validarPruebaAcceso(pruebaAcceso ?? await leerPruebaAccesoSolicitud());
  const cliente = await crearClienteSupabaseServidor(entorno);
  // Una única instancia porque `RepositorioEventosSupabase` implementa ambos
  // puertos (`RepositorioEventosVehiculo` y `UnidadTrabajoVehiculos`): la escritura
  // coordinada de evento+kilometraje vive en la misma clase que lee eventos.
  const repositorioEventosSupabase = new RepositorioEventosSupabase(cliente);

  return {
    repositorioVehiculos: new RepositorioVehiculosSupabase(cliente),
    repositorioEventosVehiculo: repositorioEventosSupabase,
    unidadTrabajoVehiculos: repositorioEventosSupabase,
    proveedorIdentidad: new ProveedorIdentidadTemporal(
      crearIdentificador(entorno.householdIdDesarrollo),
    ),
    proveedorFecha: new ProveedorFechaSistema(),
  };
}
