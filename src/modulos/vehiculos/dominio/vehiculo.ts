import type { Identificador } from '../../../compartido/dominio/identificador';
import { ErrorDominio } from './errores-dominio';

export type EstadoVehiculo = 'activo' | 'inactivo';

export type DatosCrearVehiculo = Readonly<{
  id: Identificador;
  marca: string;
  modelo: string;
  anio: number;
  combustible: string;
  matricula: string;
  kilometrosActuales: number;
  fechaCompra: Date;
  fechaAltaAplicacion: Date;
}>;

type DatosVehiculo = DatosCrearVehiculo &
  Readonly<{
    estado: EstadoVehiculo;
    fechaDesactivacion?: Date;
  }>;

export class Vehiculo {
  readonly id: Identificador;
  readonly marca: string;
  readonly modelo: string;
  readonly anio: number;
  readonly combustible: string;
  readonly matricula: string;
  readonly kilometrosActuales: number;
  readonly estado: EstadoVehiculo;
  readonly #fechaCompra: Date;
  readonly #fechaAltaAplicacion: Date;
  readonly #fechaDesactivacion?: Date;

  static crear(datos: DatosCrearVehiculo): Vehiculo {
    return new Vehiculo({
      ...datos,
      estado: 'activo',
    });
  }

  private constructor(datos: DatosVehiculo) {
    validarKilometraje(datos.kilometrosActuales);

    this.id = datos.id;
    this.marca = datos.marca;
    this.modelo = datos.modelo;
    this.anio = datos.anio;
    this.combustible = datos.combustible;
    this.matricula = datos.matricula;
    this.kilometrosActuales = datos.kilometrosActuales;
    this.estado = datos.estado;
    this.#fechaCompra = copiarFecha(datos.fechaCompra);
    this.#fechaAltaAplicacion = copiarFecha(datos.fechaAltaAplicacion);
    this.#fechaDesactivacion = datos.fechaDesactivacion
      ? copiarFecha(datos.fechaDesactivacion)
      : undefined;
  }

  get fechaCompra(): Date {
    return copiarFecha(this.#fechaCompra);
  }

  get fechaAltaAplicacion(): Date {
    return copiarFecha(this.#fechaAltaAplicacion);
  }

  get fechaDesactivacion(): Date | undefined {
    return this.#fechaDesactivacion ? copiarFecha(this.#fechaDesactivacion) : undefined;
  }

  desactivar(fechaDesactivacion: Date): Vehiculo {
    return new Vehiculo({
      ...this.datosBase(),
      estado: 'inactivo',
      fechaDesactivacion,
    });
  }

  corregirKilometraje(kilometrosActuales: number): Vehiculo {
    return new Vehiculo({
      ...this.datosBase(),
      kilometrosActuales,
    });
  }

  private datosBase(): DatosVehiculo {
    return {
      id: this.id,
      marca: this.marca,
      modelo: this.modelo,
      anio: this.anio,
      combustible: this.combustible,
      matricula: this.matricula,
      kilometrosActuales: this.kilometrosActuales,
      estado: this.estado,
      fechaCompra: this.#fechaCompra,
      fechaAltaAplicacion: this.#fechaAltaAplicacion,
      fechaDesactivacion: this.#fechaDesactivacion,
    };
  }
}

export function crearVehiculo(datos: DatosCrearVehiculo): Vehiculo {
  return Vehiculo.crear(datos);
}

function validarKilometraje(kilometrosActuales: number): void {
  if (kilometrosActuales < 0) {
    throw new ErrorDominio('El kilometraje actual no puede ser negativo.');
  }
}

function copiarFecha(fecha: Date): Date {
  return new Date(fecha.getTime());
}
