import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const databaseUrl = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
const ejecutar = databaseUrl ? describe : describe.skip;
const rutaMigracion = new URL(
  '../../../../../supabase/migrations/20260711000000_mv_households_nombre_unique.sql',
  import.meta.url,
);

async function ejecutarMigracionContraTabla(cliente: Client, tabla: string): Promise<void> {
  const sql = await readFile(rutaMigracion, 'utf8');
  // El nombre de constraint también debe sustituirse: Postgres nombra el índice
  // único subyacente igual que la constraint, y los nombres de índice son
  // únicos por esquema, no por tabla. Reusar el literal de la migración real
  // colisionaría con el índice que `mv_households` ya tiene en este mismo `public`.
  const sqlAdaptado = sql
    .replaceAll('public.mv_households', `public.${tabla}`)
    .replaceAll('mv_households_nombre_key', `${tabla}_nombre_key`);
  await cliente.query(sqlAdaptado);
}

ejecutar('preflight de la migración de unicidad de hogares (Postgres local)', () => {
  it('rechaza la migración con un mensaje claro si ya existen nombres duplicados', async () => {
    const cliente = new Client({ connectionString: databaseUrl });
    await cliente.connect();
    const tabla = `mvhp_${randomUUID().slice(0, 8)}`;

    try {
      await cliente.query(`create table public.${tabla} (nombre text not null)`);
      await cliente.query(`insert into public.${tabla} (nombre) values ('Hogar duplicado'), ('Hogar duplicado')`);

      await expect(ejecutarMigracionContraTabla(cliente, tabla)).rejects.toThrow(/nombre\(s\) duplicado\(s\)/);
      await cliente.query('rollback');

      const constraints = await cliente.query(
        `select conname from pg_constraint where conrelid = $1::regclass`,
        [`public.${tabla}`],
      );
      expect(constraints.rows).toEqual([]);
    } finally {
      await cliente.query(`drop table if exists public.${tabla}`);
      await cliente.end();
    }
  });

  it('aplica la restricción única sin error cuando no hay nombres duplicados', async () => {
    const cliente = new Client({ connectionString: databaseUrl });
    await cliente.connect();
    const tabla = `mvhp_${randomUUID().slice(0, 8)}`;

    try {
      await cliente.query(`create table public.${tabla} (nombre text not null)`);
      await cliente.query(`insert into public.${tabla} (nombre) values ('Hogar A'), ('Hogar B')`);

      await expect(ejecutarMigracionContraTabla(cliente, tabla)).resolves.not.toThrow();

      const constraints = await cliente.query(
        `select conname from pg_constraint where conrelid = $1::regclass`,
        [`public.${tabla}`],
      );
      expect(constraints.rows).toEqual([{ conname: `${tabla}_nombre_key` }]);
    } finally {
      await cliente.query(`drop table if exists public.${tabla}`);
      await cliente.end();
    }
  });
});
