import { z } from 'zod';

// Frontera de validación de interfaz (diseño §8): protege tipos/campos obligatorios
// antes de llegar al dominio. El dominio (`Vehiculo`) sigue siendo responsable de sus
// propias invariantes (p. ej. kilometraje no negativo) aunque esta capa ya filtre lo
// obvio; no es duplicación inútil, cada capa protege una frontera distinta.
export const esquemaRegistrarVehiculo = z.object({
  marca: z.string().trim().min(1, 'La marca es obligatoria.'),
  modelo: z.string().trim().min(1, 'El modelo es obligatorio.'),
  anio: z.coerce
    .number({ error: 'El año debe ser un número.' })
    .int('El año debe ser un número entero.')
    .min(1900, 'El año no es válido.'),
  combustible: z.string().trim().min(1, 'El combustible es obligatorio.'),
  matricula: z.string().trim().min(1, 'La matrícula es obligatoria.'),
  kilometrosActuales: z.coerce
    .number({ error: 'El kilometraje debe ser un número.' })
    .min(0, 'El kilometraje actual no puede ser negativo.'),
  fechaCompra: z.coerce.date({ error: 'La fecha de compra no es válida.' }),
});

export type EntradaFormularioVehiculo = z.infer<typeof esquemaRegistrarVehiculo>;

export const esquemaCorregirKilometraje = z.object({
  vehiculoId: z.string().trim().min(1, 'El vehículo es obligatorio.'),
  kilometrosActuales: z.coerce
    .number({ error: 'El kilometraje debe ser un número.' })
    .min(0, 'El kilometraje no puede ser negativo.'),
});

export type EntradaFormularioCorregirKilometraje = z.infer<typeof esquemaCorregirKilometraje>;
