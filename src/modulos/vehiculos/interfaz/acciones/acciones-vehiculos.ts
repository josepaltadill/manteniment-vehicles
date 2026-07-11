'use server';

// Server actions de vehículos (diseño §6.3): la mutación real ocurre aquí, nunca en
// el cliente. Cada acción exportada con `'use server'` es un envoltorio delgado
// (composición de dependencias + `revalidatePath`/`redirect`) alrededor de una
// función `procesar*` pura en el sentido de que solo depende de sus parámetros: se
// prueba con dependencias falsas/en memoria sin necesitar Next.js en el test.
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { desactivarVehiculo, type DependenciasDesactivarVehiculo } from '../../aplicacion/casos-uso/desactivar-vehiculo';
import { registrarVehiculo, type DependenciasRegistrarVehiculo } from '../../aplicacion/casos-uso/registrar-vehiculo';
import type { ProveedorFecha } from '../../aplicacion/puertos/proveedor-fecha';
import { crearDependenciasVehiculos } from '../composicion/dependencias-servidor';
import { esquemaRegistrarVehiculo } from '../validacion/esquemas-vehiculo';
import { aVehiculoVista, type VehiculoVista } from '../vistas/vehiculo-vista';
import { ejecutarComoResultado, type ResultadoAccion } from './resultado-accion';

export type DependenciasAccionesVehiculos = DependenciasRegistrarVehiculo &
  DependenciasDesactivarVehiculo &
  Readonly<{ proveedorFecha: ProveedorFecha }>;

export async function procesarRegistrarVehiculo(
  dependencias: DependenciasAccionesVehiculos,
  entradaCruda: unknown,
): Promise<ResultadoAccion<VehiculoVista>> {
  const parseo = esquemaRegistrarVehiculo.safeParse(entradaCruda);

  if (!parseo.success) {
    return {
      exito: false,
      mensaje: 'Revisa los datos del vehículo: hay campos obligatorios sin completar o inválidos.',
      erroresCampos: parseo.error.flatten().fieldErrors,
    };
  }

  return ejecutarComoResultado('procesarRegistrarVehiculo', async () => {
    const vehiculo = await registrarVehiculo(dependencias, {
      id: crearIdentificador(crypto.randomUUID()),
      ...parseo.data,
      fechaAltaAplicacion: dependencias.proveedorFecha.ahora(),
    });

    return aVehiculoVista(vehiculo);
  });
}

export type EntradaProcesarDesactivarVehiculo = Readonly<{ vehiculoId: string }>;

export async function procesarDesactivarVehiculo(
  dependencias: DependenciasAccionesVehiculos,
  entrada: EntradaProcesarDesactivarVehiculo,
): Promise<ResultadoAccion<void>> {
  return ejecutarComoResultado('procesarDesactivarVehiculo', async () => {
    await desactivarVehiculo(dependencias, { vehiculoId: crearIdentificador(entrada.vehiculoId) });
  });
}

export async function accionRegistrarVehiculo(
  _estadoPrevio: ResultadoAccion<VehiculoVista> | undefined,
  formData: FormData,
): Promise<ResultadoAccion<VehiculoVista>> {
  const dependencias = await crearDependenciasVehiculos();
  const resultado = await procesarRegistrarVehiculo(dependencias, Object.fromEntries(formData));

  if (resultado.exito) {
    revalidatePath('/vehiculos');
    redirect('/vehiculos');
  }

  return resultado;
}

export async function accionDesactivarVehiculo(
  _estadoPrevio: ResultadoAccion<void> | undefined,
  formData: FormData,
): Promise<ResultadoAccion<void>> {
  const dependencias = await crearDependenciasVehiculos();
  const resultado = await procesarDesactivarVehiculo(dependencias, {
    vehiculoId: String(formData.get('vehiculoId') ?? ''),
  });
  revalidatePath('/vehiculos');

  return resultado;
}
