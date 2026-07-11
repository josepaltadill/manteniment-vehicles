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

export function sustituirTablaEnMigracion(sql: string, tabla: string): string {
  // El nombre de constraint también debe sustituirse: Postgres nombra el índice
  // único subyacente igual que la constraint, y los nombres de índice son
  // únicos por esquema, no por tabla. Reusar el literal de la migración real
  // colisionaría con el índice que `mv_households` ya tiene en este mismo `public`.
  //
  // El orden importa: `mv_households_nombre_key` debe sustituirse antes que el
  // `\bmv_households\b` genérico porque, sin guion bajo de por medio, ese `\b`
  // no cruza la frontera de palabra hacia `_nombre_key` y dejaría el nombre de
  // constraint sin tocar si se corriera después.
  const sqlAdaptado = sql
    .replace(/\bmv_households_nombre_key\b/g, `${tabla}_nombre_key`)
    .replace(/\bmv_households\b/g, tabla);

  // Case-insensitive a propósito: la sustitución de arriba es sensible a
  // mayúsculas (los identificadores reales de la migración son siempre
  // minúscula), pero este canary debe atrapar cualquier variante de mayúsculas
  // que se cuele en una edición futura, aunque la sustitución no la cubra.
  if (/\bmv_households\b/i.test(sqlAdaptado)) {
    throw new Error(
      'La migración adaptada todavía referencia mv_households sin sustituir; ' +
        'abortando para no ejecutar DDL contra la tabla real.',
    );
  }

  return sqlAdaptado;
}

async function ejecutarMigracionContraTabla(cliente: Client, tabla: string): Promise<void> {
  const sql = await readFile(rutaMigracion, 'utf8');
  await cliente.query(sustituirTablaEnMigracion(sql, tabla));
}

describe('sustituirTablaEnMigracion', () => {
  it('lanza si queda una referencia a mv_households sin sustituir, sin ejecutar nada', () => {
    // Variante de mayúsculas: Postgres la trataría como el mismo identificador
    // sin comillas (pliega a minúsculas), pero la sustitución de texto es
    // sensible a mayúsculas y no la vería — exactamente el tipo de gap que
    // este canary debe detectar antes de ejecutar nada contra Postgres.
    const migracionConGap =
      'alter table public.mv_households add constraint mv_households_nombre_key unique (nombre);\n' +
      "comment on table MV_HOUSEHOLDS is 'variante de mayúsculas fuera del alcance de la sustitución';";

    expect(() => sustituirTablaEnMigracion(migracionConGap, 'tabla_prueba')).toThrow(/sin sustituir/);
  });

  it('sustituye limpiamente cuando solo aparecen las dos formas conocidas', () => {
    const migracionLimpia =
      'alter table public.mv_households add constraint mv_households_nombre_key unique (nombre);';

    const resultado = sustituirTablaEnMigracion(migracionLimpia, 'tabla_prueba');

    expect(resultado).not.toMatch(/\bmv_households\b/);
    expect(resultado).toContain('public.tabla_prueba');
    expect(resultado).toContain('tabla_prueba_nombre_key');
  });
});

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
