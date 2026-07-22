import { describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile as ejecutarArchivo } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { ProveedorIdentidadSupabaseServidor } from '../../../../nucleo-familiar/adaptadores/supabase/proveedor-identidad-supabase-servidor';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { crearVehiculo } from '../../dominio/vehiculo';
import { evaluarVencimiento } from '../../dominio/vencimiento';
import { RepositorioEventosSupabase } from './repositorio-eventos-supabase';
import { RepositorioVehiculosSupabase } from './repositorio-vehiculos-supabase';

const ejecutar = process.env.FAMILY_APP_LOCAL_SUPABASE_E2E === '1' ? describe : describe.skip;
const execFile = promisify(ejecutarArchivo);
const timeout = 120_000;

type Runtime = Readonly<{ workspace: string; projectId: string; url: string; anonKey: string; databaseUrl: string }>;

async function comando(command: string, args: string[], options: { timeout?: number } = {}) {
  return execFile(command, args, { timeout: options.timeout ?? timeout, maxBuffer: 2_000_000 });
}

async function empezarSupabaseLocal(): Promise<Runtime> {
  const workspace = await mkdtemp(join(tmpdir(), 'family-app-pr3b-e2e-'));
  const projectId = `family-app-pr3b-${process.pid}-${Date.now()}`;
  try {
    await cp(join(process.cwd(), 'supabase/migrations'), join(workspace, 'supabase/migrations'), { recursive: true });
    await writeFile(join(workspace, 'supabase/config.toml'), `project_id = "${projectId}"\n\n[api]\nenabled = true\nport = 55431\nschemas = ["public"]\n\n[db]\nport = 55432\n\n[studio]\nenabled = false\n\n[inbucket]\nenabled = false\n\n[analytics]\nenabled = false\n\n[auth]\nenabled = true\n\n[auth.email]\nenable_confirmations = false\n`);
    await comando('supabase', ['start', '--workdir', workspace], { timeout });
    const { stdout } = await comando('supabase', ['status', '--workdir', workspace, '-o', 'env']);
    const env = Object.fromEntries([...stdout.matchAll(/^(API_URL|ANON_KEY|DB_URL)="([^"]+)"$/gm)].map(([, key, value]) => [key, value]));
    if (!env.API_URL || !env.ANON_KEY || !env.DB_URL) throw new Error('Supabase local did not provide its exact local endpoints.');
    return { workspace, projectId, url: env.API_URL, anonKey: env.ANON_KEY, databaseUrl: env.DB_URL };
  } catch (error) {
    await limpiarSupabaseLocal({ workspace, projectId, url: '', anonKey: '', databaseUrl: '' }).catch(() => undefined);
    throw error;
  }
}

async function sql(runtime: Runtime, query: string) {
  const client = new Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 10_000 });
  try { await client.connect(); return await client.query(query); } finally { await client.end().catch(() => undefined); }
}

async function limpiarSupabaseLocal(runtime: Runtime) {
  const errors: unknown[] = [];
  if (runtime.workspace) await comando('supabase', ['stop', '--no-backup', '--workdir', runtime.workspace]).catch((error) => errors.push(error));
  if (runtime.databaseUrl) {
    const client = new Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 2_000 });
    await client.connect().then(() => errors.push(new Error('Local E2E database remains reachable after cleanup.'))).catch(() => undefined).finally(() => client.end().catch(() => undefined));
  }
  for (const [kind, args] of [['containers', ['ps', '-aq', '--filter', `name=supabase_db_${runtime.projectId}`]], ['volumes', ['volume', 'ls', '-q', '--filter', `name=${runtime.projectId}`]], ['networks', ['network', 'ls', '-q', '--filter', `name=${runtime.projectId}`]]] as const) {
    const { stdout } = await comando('docker', [...args]).catch((error) => { errors.push(error); return { stdout: 'unknown' }; });
    if (stdout.trim()) errors.push(new Error(`Owned Supabase ${kind} remain: ${stdout.trim()}`));
  }
  await rm(runtime.workspace, { recursive: true, force: true }).catch((error) => errors.push(error));
  if (errors.length) throw new AggregateError(errors, 'Local Supabase E2E cleanup failed.');
}

async function registrarUsuario(client: SupabaseClient, email: string) {
  const { data, error } = await client.auth.signUp({ email, password: 'Local-e2e-password-123!' });
  if (error || !data.user) throw error ?? new Error('Local Auth signup did not return a user.');
  return data.user.id;
}

function clienteAutenticado(url: string, key: string, email: string) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client.auth.signInWithPassword({ email, password: 'Local-e2e-password-123!' }).then(({ error }) => {
    if (error) throw error;
    return client;
  });
}

ejecutar('adaptadores Supabase locales', () => {
  it('ejercita Auth, identidad, vehículos, eventos y aislamiento de dos hogares', async () => {
    const runtime = await empezarSupabaseLocal();
    try {
      const suffix = randomUUID();
      const emailA = `pr3b-a-${suffix}@example.test`;
      const emailB = `pr3b-b-${suffix}@example.test`;
      const anon = createClient(runtime.url, runtime.anonKey);
      const [userA, userB] = await Promise.all([registrarUsuario(anon, emailA), registrarUsuario(anon, emailB)]);
      const [householdA, householdB] = [randomUUID(), randomUUID()];
      await sql(runtime, `insert into public.fam_hogares (id,nombre) values ('${householdA}','PR3B A'),('${householdB}','PR3B B'); insert into public.fam_miembros_hogar (household_id,user_id,rol) values ('${householdA}','${userA}','admin'),('${householdB}','${userB}','admin');`);
      const [clientA, clientB] = await Promise.all([clienteAutenticado(runtime.url, runtime.anonKey, emailA), clienteAutenticado(runtime.url, runtime.anonKey, emailB)]);
      const contextA = await new ProveedorIdentidadSupabaseServidor(clientA).obtenerContexto();
      expect(contextA.householdId.valor).toBe(householdA);
      const vehiclesA = new RepositorioVehiculosSupabase(clientA);
      const eventsA = new RepositorioEventosSupabase(clientA);
      const vehicle = crearVehiculo({ id: crearIdentificador(randomUUID()), marca: 'Marca', modelo: 'A', anio: 2024, combustible: 'eléctrico', matricula: 'PR3B-1', kilometrosActuales: 100, fechaCompra: new Date('2024-01-01T00:00:00Z'), fechaAltaAplicacion: new Date('2024-01-02T00:00:00Z') });
      await vehiclesA.guardar(contextA.householdId, vehicle);
      const event = crearEventoVehiculo({ id: crearIdentificador(randomUUID()), vehiculoId: vehicle.id, tipo: 'mantenimiento', descripcion: 'E2E', kilometros: 150, fecha: new Date('2024-03-01T00:00:00Z'), coste: 42, proximoVencimientoKm: 200, proximoVencimientoFecha: new Date('2025-01-01T00:00:00Z'), fechaCreacion: new Date('2024-03-01T00:00:00Z') });
      await eventsA.registrarEventoYActualizarKilometraje(contextA.householdId, { evento: event, vehiculoActualizado: vehicle.corregirKilometraje(150) });
      await vehiclesA.guardar(contextA.householdId, vehicle.corregirKilometraje(150).desactivar(new Date('2024-02-01T00:00:00Z')));
      expect((await vehiclesA.listar(contextA.householdId)).map((row) => [row.estado, row.kilometrosActuales])).toEqual([['inactivo', 150]]);
      expect((await eventsA.listarPorVehiculo(contextA.householdId, vehicle.id))[0]?.coste).toBe(42);
      expect((await eventsA.listarConVencimiento(contextA.householdId))).toHaveLength(1);
      expect(evaluarVencimiento({ kilometrosActuales: 200, proximoVencimientoKm: event.proximoVencimientoKm, proximoVencimientoFecha: event.proximoVencimientoFecha, fechaActual: new Date('2024-04-01T00:00:00Z') })).toBe('vencido');
      const contextB = await new ProveedorIdentidadSupabaseServidor(clientB).obtenerContexto();
      expect(await new RepositorioVehiculosSupabase(clientB).buscarPorId(contextB.householdId, vehicle.id)).toBeNull();
      const crossWrite = await clientA.from('fam_ve_vehiculos').insert({ id: randomUUID(), household_id: householdB, marca: 'X', modelo: 'X', combustible: 'X', matricula: 'BLOCK', anio: 2024, kilometros_actuales: 0, estado: 'activo', fecha_compra: new Date().toISOString(), fecha_alta_aplicacion: new Date().toISOString() });
      expect(crossWrite.error?.code).toBe('42501');
      await sql(runtime, `delete from public.fam_miembros_hogar where household_id = '${householdB}' and user_id = '${userB}'`).then(
        () => { throw new Error('Deleting the last admin unexpectedly succeeded.'); },
        (error: { code?: string }) => expect(error.code).toBe('23514'),
      );
    } finally {
      await limpiarSupabaseLocal(runtime);
    }
  }, 180_000);
});
