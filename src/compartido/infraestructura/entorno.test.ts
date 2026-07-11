import { describe, expect, it } from 'vitest';
import { leerEntornoSupabase } from './entorno';

const variablesValidas = () => ({
  SUPABASE_URL: 'https://ejemplo.supabase.co',
  SUPABASE_ANON_KEY: 'clave-anonima-de-ejemplo',
  SUPABASE_BOOTSTRAP_EMAIL: 'admin-desarrollo@ejemplo.local',
  SUPABASE_BOOTSTRAP_PASSWORD: 'password-desarrollo-segura',
  SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar de desarrollo',
  SUPABASE_HOUSEHOLD_ID_DESARROLLO: '11111111-1111-4111-8111-111111111111',
});

describe('leerEntornoSupabase', () => {
  it('lee las variables de entorno de servidor cuando todas están presentes', () => {
    const entorno = leerEntornoSupabase(variablesValidas());

    expect(entorno).toEqual({
      url: 'https://ejemplo.supabase.co',
      anonKey: 'clave-anonima-de-ejemplo',
      bootstrapEmail: 'admin-desarrollo@ejemplo.local',
      bootstrapPassword: 'password-desarrollo-segura',
      bootstrapHouseholdNombre: 'Hogar de desarrollo',
      householdIdDesarrollo: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('lanza un error si falta SUPABASE_URL', () => {
    const { SUPABASE_URL: _omitida, ...resto } = variablesValidas();

    expect(() => leerEntornoSupabase(resto)).toThrow(
      'Falta la variable de entorno obligatoria SUPABASE_URL.',
    );
  });

  it('lanza un error si falta SUPABASE_BOOTSTRAP_PASSWORD', () => {
    const { SUPABASE_BOOTSTRAP_PASSWORD: _omitida, ...resto } = variablesValidas();

    expect(() => leerEntornoSupabase(resto)).toThrow(
      'Falta la variable de entorno obligatoria SUPABASE_BOOTSTRAP_PASSWORD.',
    );
  });

  it('lanza un error si falta SUPABASE_HOUSEHOLD_ID_DESARROLLO', () => {
    const { SUPABASE_HOUSEHOLD_ID_DESARROLLO: _omitida, ...resto } = variablesValidas();

    expect(() => leerEntornoSupabase(resto)).toThrow(
      'Falta la variable de entorno obligatoria SUPABASE_HOUSEHOLD_ID_DESARROLLO.',
    );
  });

  it('lanza un error si SUPABASE_HOUSEHOLD_ID_DESARROLLO no tiene formato UUID', () => {
    const variables = { ...variablesValidas(), SUPABASE_HOUSEHOLD_ID_DESARROLLO: 'hogar-de-desarrollo' };

    expect(() => leerEntornoSupabase(variables)).toThrow(
      'SUPABASE_HOUSEHOLD_ID_DESARROLLO debe ser un UUID válido (recibido: "hogar-de-desarrollo").',
    );
  });
});
