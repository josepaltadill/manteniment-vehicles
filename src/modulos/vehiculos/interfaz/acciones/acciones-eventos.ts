'use server';

// Server actions de eventos/kilometraje (diseño §6.3/§8), mismo patrón de
// envoltorio delgado que `acciones-vehiculos.ts`: la lógica probable de negocio y
// mapeo de errores vive en las funciones `procesar*`, que se prueban con
// dependencias en memoria sin necesitar Next.js.
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import {
  corregirKilometraje,
  type DependenciasCorregirKilometraje,
} from '../../aplicacion/casos-uso/corregir-kilometraje';
import {
  registrarEventoVehiculo,
  type DependenciasRegistrarEventoVehiculo,
} from '../../aplicacion/casos-uso/registrar-evento-vehiculo';
import { crearDependenciasVehiculos } from '../composicion/dependencias-servidor';
import { esquemaCorregirKilometraje } from '../validacion/esquemas-vehiculo';
import { esquemaRegistrarEvento } from '../validacion/esquemas-evento';
import { ejecutarComoResultado, type ResultadoAccion } from './resultado-accion';

export type DependenciasAccionesEventos = DependenciasRegistrarEventoVehiculo &
  DependenciasCorregirKilometraje;

export async function procesarRegistrarEvento(
  dependencias: DependenciasAccionesEventos,
  entradaCruda: unknown,
): Promise<ResultadoAccion<{ id: string }>> {
  const parseo = esquemaRegistrarEvento.safeParse(entradaCruda);

  if (!parseo.success) {
    return {
      exito: false,
      mensaje: 'Revisa los datos del evento: hay campos obligatorios sin completar o inválidos.',
      erroresCampos: parseo.error.flatten().fieldErrors,
    };
  }

  return ejecutarComoResultado('procesarRegistrarEvento', async () => {
    const evento = await registrarEventoVehiculo(dependencias, {
      id: crearIdentificador(crypto.randomUUID()),
      vehiculoId: crearIdentificador(parseo.data.vehiculoId),
      tipo: parseo.data.tipo,
      descripcion: parseo.data.descripcion,
      kilometros: parseo.data.kilometros,
      fecha: parseo.data.fecha,
      proveedor: parseo.data.proveedor,
      coste: parseo.data.coste,
      notas: parseo.data.notas,
      proximoVencimientoKm: parseo.data.proximoVencimientoKm,
      proximoVencimientoFecha: parseo.data.proximoVencimientoFecha,
    });

    return { id: evento.id.valor };
  });
}

export async function procesarCorregirKilometraje(
  dependencias: DependenciasAccionesEventos,
  entradaCruda: unknown,
): Promise<ResultadoAccion<void>> {
  const parseo = esquemaCorregirKilometraje.safeParse(entradaCruda);

  if (!parseo.success) {
    return {
      exito: false,
      mensaje: 'Revisa el kilometraje: debe ser un número válido y no negativo.',
      erroresCampos: parseo.error.flatten().fieldErrors,
    };
  }

  return ejecutarComoResultado('procesarCorregirKilometraje', async () => {
    await corregirKilometraje(dependencias, {
      vehiculoId: crearIdentificador(parseo.data.vehiculoId),
      kilometrosActuales: parseo.data.kilometrosActuales,
    });
  });
}

export async function accionRegistrarEvento(
  _estadoPrevio: ResultadoAccion<{ id: string }> | undefined,
  formData: FormData,
): Promise<ResultadoAccion<{ id: string }>> {
  const dependencias = await crearDependenciasVehiculos();
  const vehiculoId = String(formData.get('vehiculoId') ?? '');
  const resultado = await procesarRegistrarEvento(dependencias, Object.fromEntries(formData));

  if (resultado.exito) {
    revalidatePath(`/vehiculos/${vehiculoId}`);
    redirect(`/vehiculos/${vehiculoId}`);
  }

  return resultado;
}

export async function accionCorregirKilometraje(
  _estadoPrevio: ResultadoAccion<void> | undefined,
  formData: FormData,
): Promise<ResultadoAccion<void>> {
  const dependencias = await crearDependenciasVehiculos();
  const vehiculoId = String(formData.get('vehiculoId') ?? '');
  const resultado = await procesarCorregirKilometraje(dependencias, Object.fromEntries(formData));
  revalidatePath(`/vehiculos/${vehiculoId}`);

  return resultado;
}
