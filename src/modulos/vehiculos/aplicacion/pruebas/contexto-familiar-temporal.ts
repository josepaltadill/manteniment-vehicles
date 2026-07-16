import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import type { ContextoAplicacion } from '../../../../nucleo-familiar/aplicacion/puertos/alcance-familiar';

const HOGAR_DESARROLLO_POR_DEFECTO = crearIdentificador('hogar-desarrollo');

export class ContextoFamiliarTemporal implements ContextoAplicacion {
  readonly actor = { id: crearIdentificador('actor-temporal'), rol: 'admin' } as const;

  constructor(readonly householdId = HOGAR_DESARROLLO_POR_DEFECTO) {}
}
