export type DescripcionHarnessPruebas = {
  proyecto: 'manteniment-vehicles';
  runner: 'vitest';
  estado: 'configurado';
};

export function describirHarnessPruebas(): DescripcionHarnessPruebas {
  return {
    proyecto: 'manteniment-vehicles',
    runner: 'vitest',
    estado: 'configurado',
  };
}
