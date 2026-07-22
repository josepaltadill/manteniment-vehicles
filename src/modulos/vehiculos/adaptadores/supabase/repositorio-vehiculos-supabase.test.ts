import { describe, expect, it } from 'vitest';
import { crearIdentificador } from '../../../../compartido/dominio/identificador';
import { crearVehiculo } from '../../dominio/vehiculo';
import { crearClienteSupabaseFalso } from './pruebas/cliente-supabase-falso';
import { RepositorioVehiculosSupabase } from './repositorio-vehiculos-supabase';
import { ErrorAdaptadorSupabase } from '../../../../compartido/infraestructura/supabase/errores-adaptador';
import type { ClienteSupabaseServidor } from '../../../../compartido/infraestructura/supabase/cliente-servidor';

const householdId = crearIdentificador('11111111-1111-4111-8111-111111111111');
const otroHouseholdId = crearIdentificador('99999999-9999-4999-8999-999999999999');

const vehiculoValido = () =>
  crearVehiculo({
    id: crearIdentificador('22222222-2222-4222-8222-222222222222'),
    marca: 'Toyota',
    modelo: 'Corolla',
    anio: 2019,
    combustible: 'gasolina',
    matricula: '1234 ABC',
    kilometrosActuales: 120_000,
    fechaCompra: new Date('2020-02-01T00:00:00.000Z'),
    fechaAltaAplicacion: new Date('2026-01-10T10:00:00.000Z'),
  });

describe('RepositorioVehiculosSupabase', () => {
  it('guardar() inyecta household_id en la fila enviada a fam_ve_vehiculos', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso();
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.guardar(householdId, vehiculoValido());

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]?.tabla).toBe('fam_ve_vehiculos');
    const upsert = llamadas[0]?.operaciones.find((op) => op.metodo === 'upsert');
    expect(upsert).toBeDefined();
    const filaEnviada = upsert?.args[0] as { household_id: string; matricula: string };
    expect(filaEnviada.household_id).toBe('11111111-1111-4111-8111-111111111111');
    expect(filaEnviada.matricula).toBe('1234 ABC');
  });

  it('buscarPorId() filtra por household_id además del id', async () => {
    const { cliente, llamadas } = crearClienteSupabaseFalso({ data: null });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    await repositorio.buscarPorId(householdId, crearIdentificador('22222222-2222-4222-8222-222222222222'));

    const operaciones = llamadas[0]?.operaciones ?? [];
    const filtrosEq = operaciones.filter((op) => op.metodo === 'eq').map((op) => op.args);
    expect(filtrosEq).toContainEqual(['household_id', '11111111-1111-4111-8111-111111111111']);
    expect(filtrosEq).toContainEqual(['id', '22222222-2222-4222-8222-222222222222']);
  });

  it('listar() filtra solo por household_id y mapea todas las filas devueltas', async () => {
    const filas = [
      {
        id: '22222222-2222-4222-8222-222222222222',
        household_id: '11111111-1111-4111-8111-111111111111',
        marca: 'Toyota',
        modelo: 'Corolla',
        combustible: 'gasolina',
        matricula: '1234 ABC',
        anio: 2019,
        kilometros_actuales: 120_000,
        estado: 'activo',
        fecha_compra: '2020-02-01T00:00:00.000Z',
        fecha_alta_aplicacion: '2026-01-10T10:00:00.000Z',
        fecha_desactivacion: null,
      },
    ];
    const { cliente, llamadas } = crearClienteSupabaseFalso({ data: filas });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    const vehiculos = await repositorio.listar(householdId);

    const filtrosEq = (llamadas[0]?.operaciones ?? []).filter((op) => op.metodo === 'eq').map((op) => op.args);
    expect(filtrosEq).toEqual([['household_id', '11111111-1111-4111-8111-111111111111']]);
    expect(vehiculos).toHaveLength(1);
    expect(vehiculos[0]?.matricula).toBe('1234 ABC');
  });

  it('existeMatricula() filtra por household_id y matricula sin devolver datos de otro hogar', async () => {
    const { cliente: clienteSinFilas, llamadas: llamadasSinFilas } = crearClienteSupabaseFalso({ data: [] });
    const repositorioHogarB = new RepositorioVehiculosSupabase(
      clienteSinFilas as unknown as ClienteSupabaseServidor,
    );

    const existeEnOtroHogar = await repositorioHogarB.existeMatricula(otroHouseholdId, '1234 ABC');

    const filtrosEq = (llamadasSinFilas[0]?.operaciones ?? [])
      .filter((op) => op.metodo === 'eq')
      .map((op) => op.args);
    expect(filtrosEq).toContainEqual(['household_id', '99999999-9999-4999-8999-999999999999']);
    expect(filtrosEq).toContainEqual(['matricula', '1234 ABC']);
    expect(existeEnOtroHogar).toBe(false);
  });

  it('guardar() lanza ErrorAdaptadorSupabase con el código Postgres cuando la escritura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
    });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.guardar(householdId, vehiculoValido());
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('23505');
  });

  it('buscarPorId() lanza ErrorAdaptadorSupabase con el código Postgres cuando la lectura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'permission denied for table fam_ve_vehiculos', code: '42501' },
    });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.buscarPorId(householdId, crearIdentificador('22222222-2222-4222-8222-222222222222'));
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
  });

  it('listar() lanza ErrorAdaptadorSupabase con el código Postgres cuando la lectura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'permission denied for table fam_ve_vehiculos', code: '42501' },
    });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.listar(householdId);
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
  });

  it('existeMatricula() lanza ErrorAdaptadorSupabase con el código Postgres cuando la lectura falla', async () => {
    const { cliente } = crearClienteSupabaseFalso({
      error: { message: 'permission denied for table fam_ve_vehiculos', code: '42501' },
    });
    const repositorio = new RepositorioVehiculosSupabase(cliente as unknown as ClienteSupabaseServidor);

    let errorCapturado: unknown;
    try {
      await repositorio.existeMatricula(householdId, '1234 ABC');
    } catch (error) {
      errorCapturado = error;
    }

    expect(errorCapturado).toBeInstanceOf(ErrorAdaptadorSupabase);
    expect((errorCapturado as ErrorAdaptadorSupabase).codigo).toBe('42501');
  });
});
