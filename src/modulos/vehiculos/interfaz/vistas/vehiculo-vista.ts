import type { EstadoVehiculo, Vehiculo } from '../../dominio/vehiculo';

// Vista de solo lectura para Server Components/componentes presentacionales:
// nunca se reconstruye un `Vehiculo` de dominio a partir de esto (solo lectura).
export type VehiculoVista = Readonly<{
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  combustible: string;
  matricula: string;
  kilometrosActuales: number;
  estado: EstadoVehiculo;
  fechaCompra: string;
  fechaAltaAplicacion: string;
  fechaDesactivacion?: string;
}>;

export function aVehiculoVista(vehiculo: Vehiculo): VehiculoVista {
  return {
    id: vehiculo.id.valor,
    marca: vehiculo.marca,
    modelo: vehiculo.modelo,
    anio: vehiculo.anio,
    combustible: vehiculo.combustible,
    matricula: vehiculo.matricula,
    kilometrosActuales: vehiculo.kilometrosActuales,
    estado: vehiculo.estado,
    fechaCompra: vehiculo.fechaCompra.toISOString(),
    fechaAltaAplicacion: vehiculo.fechaAltaAplicacion.toISOString(),
    fechaDesactivacion: vehiculo.fechaDesactivacion?.toISOString(),
  };
}
