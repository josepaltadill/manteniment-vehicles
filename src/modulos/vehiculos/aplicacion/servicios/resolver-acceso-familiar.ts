import { redirect } from 'next/navigation';
import type { ContextoAplicacion, ProveedorIdentidad } from '../puertos/proveedor-identidad';
export async function exigirContextoFamiliar(proveedor: ProveedorIdentidad): Promise<ContextoAplicacion> {
  const acceso = await proveedor.resolverAcceso?.();
  if (!acceso) throw new Error('El proveedor de identidad no puede resolver acceso familiar.');
  if (acceso.estado === 'concedido') return acceso.contexto;
  redirect(acceso.estado === 'anonimo' ? '/login' : '/acceso-no-disponible');
}
