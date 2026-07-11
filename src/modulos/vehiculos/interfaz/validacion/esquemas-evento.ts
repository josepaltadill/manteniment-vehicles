import { z } from 'zod';

// Convierte un campo opcional de formulario ('' u undefined) a undefined antes de
// aplicar el esquema numérico/fecha real, para que un input vacío no sea tratado
// como error de tipo (diseño §8: coste opcional, próximos vencimientos opcionales).
const vacioComoIndefinido = (valor: unknown) =>
  valor === '' || valor === null || valor === undefined ? undefined : valor;

const textoOpcional = z.preprocess(vacioComoIndefinido, z.string().trim().min(1).optional());

const numeroOpcionalNoNegativo = (mensaje: string) =>
  z.preprocess(vacioComoIndefinido, z.coerce.number({ error: mensaje }).min(0, mensaje).optional());

const fechaOpcional = z.preprocess(vacioComoIndefinido, z.coerce.date().optional());

export const esquemaRegistrarEvento = z.object({
  vehiculoId: z.string().trim().min(1, 'El vehículo es obligatorio.'),
  tipo: z.enum(['mantenimiento', 'averia'], { error: 'El tipo de evento no es válido.' }),
  descripcion: z.string().trim().min(1, 'La descripción es obligatoria.'),
  kilometros: z.coerce
    .number({ error: 'El kilometraje debe ser un número.' })
    .min(0, 'El kilometraje del evento no puede ser negativo.'),
  fecha: z.coerce.date({ error: 'La fecha del evento no es válida.' }),
  proveedor: textoOpcional,
  coste: numeroOpcionalNoNegativo('El coste no puede ser negativo.'),
  notas: textoOpcional,
  proximoVencimientoKm: numeroOpcionalNoNegativo('El próximo vencimiento por kilómetros no puede ser negativo.'),
  proximoVencimientoFecha: fechaOpcional,
});

export type EntradaFormularioEvento = z.infer<typeof esquemaRegistrarEvento>;
