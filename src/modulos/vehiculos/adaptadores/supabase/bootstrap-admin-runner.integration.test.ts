import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { afterEach, describe, expect, it } from 'vitest';

const databaseUrl = process.env.SUPABASE_BOOTSTRAP_DATABASE_URL;
const ejecutar = databaseUrl ? describe : describe.skip;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Presupuesto por defecto del cliente administrativo: 3 intentos de conexión
// x 5s de connectionTimeoutMillis cada uno + ~600ms de backoff ≈ 15.6s en el
// peor caso antes de que crearOperacionesBootstrapPostgres se rinda. El
// timeout del propio proceso hijo debe dejar margen real por encima de eso,
// no quedar justo debajo (spawnSync mata con SIGTERM al vencer, y eso se
// vería como `status: null`, no como un fallo del bootstrap en sí).
const TIMEOUT_PROCESO_HIJO_MS = 30_000;

function correrRunner(
  env: Readonly<Record<string, string | undefined>>,
  argumentos: readonly string[] = [],
) {
  return spawnSync('./node_modules/.bin/tsx', ['scripts/bootstrap-admin.ts', ...argumentos], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: TIMEOUT_PROCESO_HIJO_MS,
    env: {
      ...process.env,
      ...env,
      NODE_OPTIONS: '--import ./scripts/hooks/register-server-only-loader.mjs',
    },
  });
}

describe('contrato de proceso del runner de bootstrap administrativo', () => {
  it('usa preflight no mutante por defecto y exige su UUID Auth', () => {
    const resultado = correrRunner({
      SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://operator@example.test/postgres',
      SUPABASE_BOOTSTRAP_ADMIN_USER_ID: '',
    });

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain('SUPABASE_BOOTSTRAP_ADMIN_USER_ID debe ser un UUID Auth válido');
  });

  it('reserva la siembra histórica para --seed-local explícito', () => {
    const resultado = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://operator@example.test/postgres',
        SUPABASE_BOOTSTRAP_EMAIL: '',
        SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
        SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Familia Altadill',
      },
      ['--seed-local'],
    );

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain('Falta la variable privada obligatoria SUPABASE_BOOTSTRAP_EMAIL');
  });

  it.each([
    ['--seed-local combinado con --apply', ['--seed-local', '--apply'], '--seed-local no admite otros argumentos.'],
    ['--seed-local combinado con un argumento desconocido', ['--seed-local', '--desconocido'], 'Argumento de bootstrap no reconocido.'],
  ])('valida %s antes de iniciar la siembra local', (_descripcion, argumentos, errorEsperado) => {
    const resultado = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://operator@example.test/postgres',
        SUPABASE_BOOTSTRAP_EMAIL: '',
        SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
      },
      argumentos,
    );

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain(errorEsperado);
    expect(resultado.stderr).not.toContain('Falta la variable privada obligatoria SUPABASE_BOOTSTRAP_EMAIL');
  });

  it('activa el preflight solo con --check y exige su UUID Auth', () => {
    const resultado = correrRunner(
      { SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://operator@example.test/postgres' },
      ['--check'],
    );

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain('SUPABASE_BOOTSTRAP_ADMIN_USER_ID debe ser un UUID Auth válido');
  });
});

ejecutar('integración real del runner de bootstrap administrativo', () => {
  let householdId: string | undefined;
  let userId: string | undefined;

  afterEach(async () => {
    const cliente = new Client({ connectionString: databaseUrl });
    await cliente.connect();
    if (householdId) await cliente.query('delete from public.fam_hogares where id = $1', [householdId]);
    if (userId) await cliente.query('delete from auth.users where id = $1', [userId]);
    await cliente.end();
    householdId = undefined;
    userId = undefined;
  });

  it('ejecuta el bootstrap real y reporta los ids sembrados con código de salida 0', () => {
    const sufijo = randomUUID();

    const resultado = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
        SUPABASE_BOOTSTRAP_EMAIL: `bootstrap-runner-${sufijo}@ejemplo.local`,
        SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
        SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: `Hogar runner ${sufijo}`,
      },
      ['--seed-local'],
    );

    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain('Bootstrap administrativo completado.');
    expect(resultado.stdout).toMatch(new RegExp(`householdId: ${UUID.source}`, 'i'));
    expect(resultado.stdout).toMatch(new RegExp(`userId: ${UUID.source}`, 'i'));

    householdId = resultado.stdout.match(new RegExp(`householdId: (${UUID.source})`, 'i'))?.[1];
    userId = resultado.stdout.match(new RegExp(`userId: (${UUID.source})`, 'i'))?.[1];
  });

  it('falla con código de salida distinto de 0 y un mensaje claro si falta una variable privada', () => {
    const resultado = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: databaseUrl,
        SUPABASE_BOOTSTRAP_EMAIL: '',
        SUPABASE_BOOTSTRAP_PASSWORD: 'password-local-de-prueba',
        SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar runner incompleto',
      },
      ['--seed-local'],
    );

    expect(resultado.status).not.toBe(0);
    expect(resultado.stderr).toContain('Falta la variable privada obligatoria SUPABASE_BOOTSTRAP_EMAIL');
  });

  it('nunca imprime la contraseña ni la URL de conexión completas en salida o error', () => {
    const contrasenaSecreta = `secreto-${randomUUID()}`;
    const urlConexion = `postgresql://postgres:${contrasenaSecreta}@127.0.0.1:54322/postgres`;

    const resultadoExitoso = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: urlConexion,
        SUPABASE_BOOTSTRAP_EMAIL: `bootstrap-runner-${randomUUID()}@ejemplo.local`,
        SUPABASE_BOOTSTRAP_PASSWORD: contrasenaSecreta,
        SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: `Hogar runner ${randomUUID()}`,
      },
      ['--seed-local'],
    );

    expect(resultadoExitoso.stdout).not.toContain(contrasenaSecreta);
    expect(resultadoExitoso.stderr).not.toContain(contrasenaSecreta);

    householdId = resultadoExitoso.stdout.match(new RegExp(`householdId: (${UUID.source})`, 'i'))?.[1];
    userId = resultadoExitoso.stdout.match(new RegExp(`userId: (${UUID.source})`, 'i'))?.[1];

    const resultadoFallido = correrRunner(
      {
        SUPABASE_BOOTSTRAP_DATABASE_URL: `postgresql://postgres:${contrasenaSecreta}@127.0.0.1:54322/base_inexistente`,
        SUPABASE_BOOTSTRAP_EMAIL: `bootstrap-runner-${randomUUID()}@ejemplo.local`,
        SUPABASE_BOOTSTRAP_PASSWORD: contrasenaSecreta,
        SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar runner fallido',
      },
      ['--seed-local'],
    );

    expect(resultadoFallido.status).not.toBe(0);
    expect(resultadoFallido.stdout).not.toContain(contrasenaSecreta);
    expect(resultadoFallido.stderr).not.toContain(contrasenaSecreta);
  });
});
