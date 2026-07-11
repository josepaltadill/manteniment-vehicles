import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { afterEach, describe, expect, it } from 'vitest';

const databaseUrl = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
const ejecutar = databaseUrl ? describe : describe.skip;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function correrRunner(env: Readonly<Record<string, string | undefined>>) {
  return spawnSync('./node_modules/.bin/tsx', ['scripts/bootstrap-admin.ts'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, ...env, NODE_OPTIONS: '--conditions=react-server' },
  });
}

ejecutar('runner de bootstrap administrativo (scripts/bootstrap-admin.ts)', () => {
  let householdId: string | undefined;
  let userId: string | undefined;

  afterEach(async () => {
    const cliente = new Client({ connectionString: databaseUrl });
    await cliente.connect();
    if (householdId) await cliente.query('delete from public.mv_households where id = $1', [householdId]);
    if (userId) await cliente.query('delete from auth.users where id = $1', [userId]);
    await cliente.end();
    householdId = undefined;
    userId = undefined;
  });

  it('ejecuta el bootstrap real y reporta los ids sembrados con código de salida 0', () => {
    const sufijo = randomUUID();

    const resultado = correrRunner({
      SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
      SUPABASE_BOOTSTRAP_EMAIL: `bootstrap-runner-${sufijo}@ejemplo.local`,
      SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
      SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: `Hogar runner ${sufijo}`,
    });

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain('Bootstrap administrativo completado.');
    expect(resultado.stdout).toMatch(new RegExp(`householdId: ${UUID.source}`, 'i'));
    expect(resultado.stdout).toMatch(new RegExp(`userId: ${UUID.source}`, 'i'));

    householdId = resultado.stdout.match(new RegExp(`householdId: (${UUID.source})`, 'i'))?.[1];
    userId = resultado.stdout.match(new RegExp(`userId: (${UUID.source})`, 'i'))?.[1];
  });

  it('falla con código de salida distinto de 0 y un mensaje claro si falta una variable privada', () => {
    const resultado = correrRunner({
      SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
      SUPABASE_BOOTSTRAP_EMAIL: '',
      SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
      SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar runner incompleto',
    });

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain('Falta la variable privada obligatoria SUPABASE_BOOTSTRAP_EMAIL');
  });
});
