import type { ProveedorFecha } from '../../aplicacion/puertos/proveedor-fecha';

/**
 * Implementación real de `ProveedorFecha` para composición de servidor: delega
 * en el reloj del sistema. Los casos de uso siguen dependiendo del puerto, no de
 * esta clase concreta, para poder inyectar fechas fijas en pruebas.
 */
export class ProveedorFechaSistema implements ProveedorFecha {
  ahora(): Date {
    return new Date();
  }
}
