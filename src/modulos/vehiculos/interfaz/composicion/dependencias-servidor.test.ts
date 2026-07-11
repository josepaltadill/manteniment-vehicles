import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntornoSupabase } from '../../../../compartido/infraestructura/entorno';

const clienteFalso = { falso: true } as never;

vi.mock('../../adaptadores/supabase/cliente-supabase-servidor', () => ({
  crearClienteSupabaseServidor: vi.fn(async () => clienteFalso),
}));

import { crearDependenciasVehiculos, ErrorAccesoVehiculos } from './dependencias-servidor';
import { crearClienteSupabaseServidor } from '../../adaptadores/supabase/cliente-supabase-servidor';
import { RepositorioVehiculosSupabase } from '../../adaptadores/supabase/repositorio-vehiculos-supabase';
import { RepositorioEventosSupabase } from '../../adaptadores/supabase/repositorio-eventos-supabase';

const entornoDePrueba: EntornoSupabase = {
  url: 'https://ejemplo.supabase.co',
  anonKey: 'clave-anonima',
  bootstrapEmail: 'admin@ejemplo.local',
  bootstrapPassword: 'clave-segura',
  bootstrapHouseholdNombre: 'Hogar de desarrollo',
  householdIdDesarrollo: '11111111-1111-4111-8111-111111111111',
};

describe('crearDependenciasVehiculos', () => {
  const pruebaValida = { tokenPresentado: 'secreto-mvp', tokenEsperado: 'secreto-mvp' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falla cerrado antes de crear el cliente cuando falta la prueba de acceso', async () => {
    await expect(
      crearDependenciasVehiculos(entornoDePrueba, { tokenPresentado: null, tokenEsperado: 'secreto-mvp' }),
    ).rejects.toBeInstanceOf(ErrorAccesoVehiculos);
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it('bloquea una prueba inválida antes de crear el cliente', async () => {
    await expect(
      crearDependenciasVehiculos(entornoDePrueba, { tokenPresentado: 'incorrecto', tokenEsperado: 'secreto-mvp' }),
    ).rejects.toBeInstanceOf(ErrorAccesoVehiculos);
    expect(crearClienteSupabaseServidor).not.toHaveBeenCalled();
  });

  it('permite componer dependencias con una prueba de acceso válida', async () => {
    await expect(crearDependenciasVehiculos(entornoDePrueba, pruebaValida)).resolves.toBeDefined();
  });

  it('compone repositorios Supabase reales para vehículos y eventos', async () => {
    const dependencias = await crearDependenciasVehiculos(entornoDePrueba, pruebaValida);

    expect(dependencias.repositorioVehiculos).toBeInstanceOf(RepositorioVehiculosSupabase);
    expect(dependencias.unidadTrabajoVehiculos).toBeInstanceOf(RepositorioEventosSupabase);
  });

  it('usa la misma instancia como repositorio de eventos y como unidad de trabajo', async () => {
    const dependencias = await crearDependenciasVehiculos(entornoDePrueba, pruebaValida);

    expect(dependencias.unidadTrabajoVehiculos).toBe(dependencias.repositorioEventosVehiculo);
  });

  it('resuelve el contexto de identidad temporal con el householdId real del entorno', async () => {
    const dependencias = await crearDependenciasVehiculos(entornoDePrueba, pruebaValida);

    const contexto = await dependencias.proveedorIdentidad.obtenerContexto();

    expect(contexto.householdId.valor).toBe('11111111-1111-4111-8111-111111111111');
    expect(contexto.actor.rol).toBe('admin');
  });

  it('provee un proveedor de fecha que devuelve instancias de Date', async () => {
    const dependencias = await crearDependenciasVehiculos(entornoDePrueba, pruebaValida);

    expect(dependencias.proveedorFecha.ahora()).toBeInstanceOf(Date);
  });
});
