import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const rutaMigracion = new URL('../../../../../supabase/migrations/20260711000000_mv_households_nombre_unique.sql', import.meta.url);

describe('migración de unicidad de hogares', () => {
  it('declara una restricción única nominal para mv_households.nombre', async () => {
    const sql = await readFile(rutaMigracion, 'utf8');

    expect(sql).toMatch(/add constraint mv_households_nombre_key unique \(nombre\)/i);
  });

  it('bloquea la migración con un preflight automático si ya existen nombres duplicados', async () => {
    const sql = await readFile(rutaMigracion, 'utf8');

    expect(sql).toMatch(/raise exception/i);
    expect(sql).toMatch(/group by nombre/i);
    expect(sql).toMatch(/having count\(\*\) > 1/i);

    const indiceGuardia = sql.search(/raise exception/i);
    const indiceConstraint = sql.search(/add constraint mv_households_nombre_key unique \(nombre\)/i);
    expect(indiceGuardia).toBeGreaterThan(-1);
    expect(indiceGuardia).toBeLessThan(indiceConstraint);
  });
});
