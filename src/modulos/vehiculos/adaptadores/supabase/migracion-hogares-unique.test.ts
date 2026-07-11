import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const rutaMigracion = new URL('../../../../../supabase/migrations/20260711000000_mv_households_nombre_unique.sql', import.meta.url);

describe('migración de unicidad de hogares', () => {
  it('declara un índice único normalizado (mayúsculas/espacios/tabs/saltos de línea) para mv_households.nombre', async () => {
    const sql = await readFile(rutaMigracion, 'utf8');

    expect(sql).toMatch(/create unique index mv_households_nombre_key/i);
    expect(sql).toMatch(/on public\.mv_households \(lower\(btrim\(nombre, E' \\t\\n\\r'\)\)\)/i);
  });

  it('bloquea la migración con un preflight automático si ya existen nombres duplicados tras normalizar', async () => {
    const sql = await readFile(rutaMigracion, 'utf8');

    expect(sql).toMatch(/raise exception/i);
    expect(sql).toMatch(/group by lower\(btrim\(nombre, E' \\t\\n\\r'\)\)/i);
    expect(sql).toMatch(/having count\(\*\) > 1/i);

    const indiceGuardia = sql.search(/raise exception/i);
    const indiceIndice = sql.search(/create unique index mv_households_nombre_key/i);
    expect(indiceGuardia).toBeGreaterThan(-1);
    expect(indiceGuardia).toBeLessThan(indiceIndice);
  });
});
