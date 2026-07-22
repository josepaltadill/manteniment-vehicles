import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearEventoVehiculo } from '../../dominio/evento-vehiculo';
import { crearVehiculo } from '../../dominio/vehiculo';
import { crearClienteSupabaseFalso } from './pruebas/cliente-supabase-falso';
import { RepositorioEventosSupabase } from './repositorio-eventos-supabase';
import { ErrorAdaptadorSupabase } from '../../../../compartido/infraestructura/supabase/errores-adaptador';
import type { ClienteSupabaseServidor } from '../../../../compartido/infraestructura/supabase/cliente-servidor';

const householdId = crearIdentificador('11111111-1111-4111-8111-111111111111');
const vehiculoId = crearIdentificador('22222222-2222-4222-8222-222222222222');

const eventoValido = () =>
  crearEventoVehiculo({
    id: crearIdentificador('33333333-3333-4333-8333-333333333333'),
    vehiculoId,
    tipo: 'mantenimiento',
    descripcion: 'Cambio de aceite',
    kilometros: 120_005,
    fecha: new Date('2026-02-01T00:00:00.000Z'),
    fechaCreacion: new Date('2026-02-01T10:00:00.000Z'),
  });

const vehiculoActualizado = () =>
  crearVehiculo({
    id: vehiculoId,
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2019,
    combustible: 'gasolina',
    matricula: '1234 ABC',
    kilometrosActuales: 120_005,
    fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
    fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
  });

describe('RepositorioEventosSupabase', () => {
  it('guardar() inyecta household_id en la fila enviada a fam_ve_eventos_vehiculo', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso();
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.guardar(householdId, eventoValido());

    expect(llamadas[0]?.tabla).toBe('fam_ve_eventos_vehiculo');
    const insert = llamadas[0]?.operaciones.find((op) => op.metodo === 'insert');
    const fila = insert?.args[0] as { household_id: string; vehiculo_id: string };
    expect(fila.household_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(fila.vehiculo_id).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('guardar() usa .insert() (no .upsert()) para no sobrescribir silenciosamente un evento existente en colisión de id', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso();
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.guardar(householdId, eventoValido());

    const metodos = (llamadas[0]?.operaciones ?? []).map((op) => op.metodo);
    expect(metodos).toContain('insert');
    expect(metodos).not.toContain('upsert');
  });

  it('guardar() propaga la violación de unicidad (23505) de un id de evento duplicado en vez de sobrescribirlo en silencio', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'duplicate key value violates unique constraint "fam_ve_eventos_vehiculo_pkey"', code: '23505' },
    });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.guardar(householdId, eventoValido());
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('23505');
  });

  it('listarPorVehiculo() filtra por household_id y vehiculo_id', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso({ data: [] });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.listarPorVehiculo(householdId, vehiculoId);

    const filtrosEq = (llamadas[0]?.operaciones ?? []).filter((op) => op.metodo === 'eq').map((op) => op.args);
    expect(filtrosEq).toContainEqual(['household_id', '11111111-1111-4111-8111-111111111111']);
    expect(filtrosEq).toContainEqual(['vehiculo_id', '22222222-2222-4222-8222-222222222222']);
  });

  it('listarConVencimiento() filtra por household_id sin filtrar por vehiculo_id', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso({ data: [] });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.listarConVencimiento(householdId);

    const filtrosEq = (llamadas[0]?.operaciones ?? []).filter((op) => op.metodo === 'eq').map((op) => op.args);
    expect(filtrosEq).toEqual([['household_id', '11111111-1111-4111-8111-111111111111']]);
  });

  it('registrarEventoYActualizarKilometraje() confirma primero el vehículo actualizado y después el evento', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso();
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.registrarEventoYActualizarKilometraje(householdId, {
      evento: eventoValido(),
      vehiculoActualizado: vehiculoActualizado(),
    });

    expect(llamadas.map((llamada) => llamada.tabla)).toEqual(['fam_ve_vehiculos', 'fam_ve_eventos_vehiculo']);
    const operacionesEvento = llamadas[1]?.operaciones.map((op) => op.metodo) ?? [];
    expect(operacionesEvento).toContain('insert');
    expect(operacionesEvento).not.toContain('upsert');
  });

  it('no confirma el evento si falla la actualización de kilometraje del vehículo', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso(
      {},
      { fam_ve_vehiculos: { error: { message: 'fallo de conexión' } } },
    );
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await expect(
      repositorio.registrarEventoYActualizarKilometraje(householdId, {
        evento: eventoValido(),
        vehiculoActualizado: vehiculoActualizado(),
      }),
    ).rejects.toThrow(/No se pudo actualizar el kilometraje/);

    expect(llamadas.map((llamada) => llamada.tabla)).toEqual(['fam_ve_vehiculos']);
  });

  it('registra evento histórico (sin vehiculoActualizado) sin tocar fam_ve_vehiculos', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso();
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.registrarEventoYActualizarKilometraje(householdId, { evento: eventoValido() });

    expect(llamadas.map((llamada) => llamada.tabla)).toEqual(['fam_ve_eventos_vehiculo']);
  });

  it('guardar() lanza ErrorAdaptadorSupabase con el código Postgres cuando la escritura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
    });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.guardar(householdId, eventoValido());
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('23505');
  });

  it('listarPorVehiculo() lanza ErrorAdaptadorSupabase con el código Postgres cuando la lectura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'permission denied for table fam_ve_eventos_vehiculo', code: '42501' },
    });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.listarPorVehiculo(householdId, vehiculoId);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
  });

  it('listarConVencimiento() lanza ErrorAdaptadorSupabase con el código Postgres cuando la lectura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'permission denied for table fam_ve_eventos_vehiculo', code: '42501' },
    });
    const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.listarConVencimiento(householdId);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
  });

  describe('registrarEventoYActualizarKilometraje() con fallo tipado', () => {
    const consoleErrorEspiado = vi.fn();
    let consoleErrorOriginal: typeof console.error;

    beforeEach(() => {
      consoleErrorOriginal = console.error;
      console.error = consoleErrorEspiado;
    });

    afterEach(() => {
      console.error = consoleErrorOriginal;
      consoleErrorEspiado.mockClear();
    });

    it('lanza ErrorAdaptadorSupabase con código cuando falla la actualización del vehículo y NO registra el log de reconciliación (no hay estado inconsistente todavía)', async () => {
      const { cliente } = crearClienteSupabaseFalso(
        {},
        { fam_ve_vehiculos: { error: { message: 'permission denied', code: '42501' } } },
      );
      const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

      let errorCapturado: unknown;
      try {
        await repositorio.registrarEventoYActualizarKilometraje(householdId, {
          evento: eventoValido(),
          vehiculoActualizado: vehiculoActualizado(),
        });
      } catch (error) {
        errorCapturado = error;
      }

      expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
      expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
      expect(consoleErrorEspiado).not.toHaveBeenCalled();
    });

    it('lanza ErrorAdaptadorSupabase con código cuando falla el guardado del evento y registra un log estructurado en el punto real de riesgo de atomicidad antes de relanzar', async () => {
      const { cliente } = crearClienteSupabaseFalso(
        {},
        { fam_ve_eventos_vehiculo: { error: { message: 'permission denied', code: '42501' } } },
      );
      const repositorio = new RepositorioEventosSupabase(cliente as unknown as ClienteSupabaseServidor);

      let errorCapturado: unknown;
      try {
        await repositorio.registrarEventoYActualizarKilometraje(householdId, {
          evento: eventoValido(),
          vehiculoActualizado: vehiculoActualizado(),
        });
      } catch (error) {
        errorCapturado = error;
      }

      expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
      expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
      expect(consoleErrorEspiado).toHaveBeenCalledTimes(1);
      const [mensajeLog, contexto] = consoleErrorEspiado.mock.calls[0] as [string, Record<string, unknown>];
      expect(mensajeLog).toMatch(/atomicidad/i);
      expect(contexto).toMatchObject({
        householdId: householdId.valor,
        vehiculoId: vehiculoId.valor,
        codigo: '42501',
      });
    });
  });
});
