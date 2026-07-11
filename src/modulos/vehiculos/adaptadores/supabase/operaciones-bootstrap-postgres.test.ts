import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  conectarConReintentos,
  crearOperacionesBootstrapPostgres,
  ejecutarBootstrapPostgresDesdeEntorno,
  esErrorTransitorioDeConexion,
  OperacionesBootstrapPostgres,
  type ClientePostgresBootstrap,
} from './operaciones-bootstrap-postgres';

vi.mock('pg', () => ({ Client: vi.fn() }));

function crearCliente(): ClientePostgresBootstrap & { query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('count(*)')) return { rows: [{ cantidad: '1' }] };
    return { rows: [{ id: '11111111-1111-4111-8111-111111111111' }] };
  });

  return { query } as unknown as ClientePostgresBootstrap & { query: typeof query };
}

describe('OperacionesBootstrapPostgres', () => {
  it('crea o reutiliza el usuario por email mediante SQL parametrizado y solo administrativo', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    const usuario = await operaciones.crearUsuario('admin@ejemplo.local', 'secreto-de-prueba');

    expect(usuario.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into auth.users'),
      ['admin@ejemplo.local', 'secreto-de-prueba'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain('on conflict (email)');
  });

  it('crea o reutiliza el hogar usando el índice único normalizado de nombre', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearHogar('Hogar de desarrollo');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into public.mv_households'),
      ['Hogar de desarrollo'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain("on conflict (lower(btrim(nombre, E' \\t\\n\\r')))");
  });

  it('no sobrescribe el nombre canónico ya guardado cuando el conflicto lo dispara una variante', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearHogar('hogar de desarrollo');

    // `do update set nombre = mv_households.nombre` (no `excluded.nombre`): el
    // conflicto ahora dispara para variantes de mayúsculas/espacios, no solo
    // coincidencias exactas, así que "actualizar" con el valor entrante
    // reescribiría en silencio el nombre canónico guardado.
    expect(cliente.query.mock.calls[0]?.[0]).toContain('do update set nombre = mv_households.nombre');
    expect(cliente.query.mock.calls[0]?.[0]).not.toContain('excluded.nombre');
  });

  it('recorta espacios del nombre del hogar antes de guardarlo', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearHogar('  Hogar de desarrollo  ');

    expect(cliente.query).toHaveBeenCalledWith(expect.stringContaining('insert into public.mv_households'), [
      'Hogar de desarrollo',
    ]);
  });

  it('busca el hogar por nombre comparando sin distinguir mayúsculas ni espacios', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.buscarHogarPorNombre('  Hogar DE Desarrollo  ');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining("lower(btrim(nombre, E' \\t\\n\\r')) = lower(btrim($1, E' \\t\\n\\r'))"),
      ['  Hogar DE Desarrollo  '],
    );
  });

  it('cuenta hogares por nombre comparando sin distinguir mayúsculas ni espacios', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.contarHogaresPorNombre('  Hogar DE Desarrollo  ');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining("lower(btrim(nombre, E' \\t\\n\\r')) = lower(btrim($1, E' \\t\\n\\r'))"),
      ['  Hogar DE Desarrollo  '],
    );
  });

  it('busca la membresía y devuelve un rol tipado como RolUsuario', async () => {
    const cliente = { query: vi.fn(async () => ({ rows: [{ rol: 'editor' }] })) } as unknown as ClientePostgresBootstrap & {
      query: ReturnType<typeof vi.fn>;
    };
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    const membresia = await operaciones.buscarMembresia('hogar-1', 'usuario-1');

    expect(membresia).toEqual({ rol: 'editor' });
  });

  it('lanza si la base devuelve un rol de membresía desconocido', async () => {
    const cliente = { query: vi.fn(async () => ({ rows: [{ rol: 'superadmin' }] })) } as unknown as ClientePostgresBootstrap & {
      query: ReturnType<typeof vi.fn>;
    };
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await expect(operaciones.buscarMembresia('hogar-1', 'usuario-1')).rejects.toThrow(/rol.*desconocido/i);
  });

  it('crea la membresía admin idempotentemente sin interpolar identificadores', async () => {
    const cliente = crearCliente();
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.crearMembresiaAdmin('hogar-1', 'usuario-1');

    expect(cliente.query).toHaveBeenCalledWith(
      expect.stringContaining('insert into public.mv_household_members'),
      ['hogar-1', 'usuario-1'],
    );
    expect(cliente.query.mock.calls[0]?.[0]).toContain('on conflict (household_id, user_id) do nothing');
  });

  it('cierra la conexión administrativa cuando el proceso de bootstrap termina', async () => {
    const cliente = { ...crearCliente(), cerrar: vi.fn(async () => undefined) };
    const operaciones = new OperacionesBootstrapPostgres(cliente);

    await operaciones.cerrar();

    expect(cliente.cerrar).toHaveBeenCalledOnce();
  });
});

describe('conectarConReintentos', () => {
  it('devuelve el resultado del primer intento si no falla', async () => {
    const intentar = vi.fn(async () => 'conectado');

    const resultado = await conectarConReintentos(intentar, 3, 1);

    expect(resultado).toBe('conectado');
    expect(intentar).toHaveBeenCalledOnce();
  });

  it('reintenta tras fallos transitorios y devuelve el resultado del intento que sí conecta', async () => {
    let llamadas = 0;
    const intentar = vi.fn(async () => {
      llamadas += 1;
      if (llamadas < 3) throw new Error(`fallo transitorio ${llamadas}`);
      return 'conectado';
    });

    const resultado = await conectarConReintentos(intentar, 3, 1);

    expect(resultado).toBe('conectado');
    expect(intentar).toHaveBeenCalledTimes(3);
  });

  it('lanza el último error si se agotan los intentos configurados', async () => {
    const errorFinal = new Error('fallo persistente');
    const intentar = vi.fn(async () => {
      throw errorFinal;
    });

    await expect(conectarConReintentos(intentar, 3, 1)).rejects.toBe(errorFinal);
    expect(intentar).toHaveBeenCalledTimes(3);
  });

  it('no reintenta si esReintentable devuelve false, y lanza de inmediato', async () => {
    const errorNoTransitorio = new Error('contraseña inválida');
    const intentar = vi.fn(async () => {
      throw errorNoTransitorio;
    });

    await expect(
      conectarConReintentos(intentar, 3, 1, { esReintentable: () => false }),
    ).rejects.toBe(errorNoTransitorio);
    expect(intentar).toHaveBeenCalledOnce();
  });

  it('llama a alReintentar con el número de intento y el error antes de cada reintento', async () => {
    let llamadas = 0;
    const intentar = vi.fn(async () => {
      llamadas += 1;
      if (llamadas < 3) throw new Error(`fallo ${llamadas}`);
      return 'conectado';
    });
    const alReintentar = vi.fn();

    await conectarConReintentos(intentar, 3, 1, { alReintentar });

    expect(alReintentar).toHaveBeenCalledTimes(2);
    expect(alReintentar).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ message: 'fallo 1' }));
    expect(alReintentar).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({ message: 'fallo 2' }));
  });
});

describe('esErrorTransitorioDeConexion', () => {
  it.each(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE'])(
    'considera transitorio el código de red %s',
    (codigo) => {
      expect(esErrorTransitorioDeConexion(Object.assign(new Error('fallo de red'), { code: codigo }))).toBe(true);
    },
  );

  it('no considera transitorio un fallo de autenticación de Postgres (28P01)', () => {
    expect(
      esErrorTransitorioDeConexion(Object.assign(new Error('password authentication failed'), { code: '28P01' })),
    ).toBe(false);
  });

  it('no considera transitorio un error sin código', () => {
    expect(esErrorTransitorioDeConexion(new Error('algo salió mal'))).toBe(false);
  });

  it('no considera transitorio un valor que no es un error', () => {
    expect(esErrorTransitorioDeConexion('no soy un error')).toBe(false);
  });
});

describe('crearOperacionesBootstrapPostgres', () => {
  afterEach(async () => {
    const { Client } = await import('pg');
    vi.mocked(Client).mockReset();
  });

  async function configurarClientePg(
    implementacion: (opciones: Record<string, unknown>) => Pick<ClientePostgresBootstrap, 'query'> & {
      connect: () => Promise<void>;
      end: () => Promise<void>;
    },
  ) {
    const { Client } = await import('pg');
    vi.mocked(Client).mockImplementation(function (this: unknown, opciones: Record<string, unknown>) {
      Object.assign(this as object, implementacion(opciones));
    } as never);
  }

  it('configura un connectionTimeoutMillis por defecto en el cliente pg', async () => {
    const { Client } = await import('pg');
    await configurarClientePg(() => ({
      connect: vi.fn(async () => undefined),
      query: vi.fn(),
      end: vi.fn(async () => undefined),
    }));

    await crearOperacionesBootstrapPostgres('postgresql://x/y');

    expect(Client).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: 'postgresql://x/y', connectionTimeoutMillis: 5_000 }),
    );
  });

  it('permite sobrescribir connectionTimeoutMillis', async () => {
    const { Client } = await import('pg');
    await configurarClientePg(() => ({
      connect: vi.fn(async () => undefined),
      query: vi.fn(),
      end: vi.fn(async () => undefined),
    }));

    await crearOperacionesBootstrapPostgres('postgresql://x/y', { connectionTimeoutMillis: 1_234 });

    expect(Client).toHaveBeenCalledWith(expect.objectContaining({ connectionTimeoutMillis: 1_234 }));
  });

  it('reintenta la conexión ante fallos transitorios antes de rendirse', async () => {
    const { Client } = await import('pg');
    let intento = 0;
    await configurarClientePg(() => {
      intento += 1;
      const fallaEsteIntento = intento < 2;
      return {
        connect: vi.fn(async () => {
          if (fallaEsteIntento) throw Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
        }),
        query: vi.fn(),
        end: vi.fn(async () => undefined),
      };
    });

    const operaciones = await crearOperacionesBootstrapPostgres('postgresql://x/y', {
      intentosConexion: 3,
      backoffBaseMs: 1,
    });

    expect(operaciones).toBeInstanceOf(OperacionesBootstrapPostgres);
    expect(Client).toHaveBeenCalledTimes(2);
  });

  it('propaga el último error de conexión si se agotan los reintentos', async () => {
    await configurarClientePg(() => ({
      connect: vi.fn(async () => {
        throw Object.assign(new Error('ECONNREFUSED persistente'), { code: 'ECONNREFUSED' });
      }),
      query: vi.fn(),
      end: vi.fn(async () => undefined),
    }));

    await expect(
      crearOperacionesBootstrapPostgres('postgresql://x/y', { intentosConexion: 2, backoffBaseMs: 1 }),
    ).rejects.toThrow('ECONNREFUSED persistente');
  });

  it('no reintenta un fallo de conexión no transitorio (ej. credenciales inválidas)', async () => {
    const { Client } = await import('pg');
    await configurarClientePg(() => ({
      connect: vi.fn(async () => {
        throw Object.assign(new Error('password authentication failed'), { code: '28P01' });
      }),
      query: vi.fn(),
      end: vi.fn(async () => undefined),
    }));

    await expect(
      crearOperacionesBootstrapPostgres('postgresql://x/y', { intentosConexion: 3, backoffBaseMs: 1 }),
    ).rejects.toThrow('password authentication failed');
    expect(Client).toHaveBeenCalledOnce();
  });

  it('loguea cada reintento de conexión con console.warn', async () => {
    const advertencia = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let intento = 0;
    await configurarClientePg(() => {
      intento += 1;
      const fallaEsteIntento = intento < 2;
      return {
        connect: vi.fn(async () => {
          if (fallaEsteIntento) throw Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
        }),
        query: vi.fn(),
        end: vi.fn(async () => undefined),
      };
    });

    await crearOperacionesBootstrapPostgres('postgresql://x/y', { intentosConexion: 3, backoffBaseMs: 1 });

    expect(advertencia).toHaveBeenCalledOnce();
    expect(advertencia.mock.calls[0]?.[0]).toContain('Intento de conexión');
    advertencia.mockRestore();
  });

  it('cerrar() no espera indefinidamente si Client.end() nunca resuelve', async () => {
    await configurarClientePg(() => ({
      connect: vi.fn(async () => undefined),
      query: vi.fn(),
      end: vi.fn(() => new Promise<void>(() => {})),
    }));

    const operaciones = await crearOperacionesBootstrapPostgres('postgresql://x/y', { cierreTimeoutMillis: 5 });

    await expect(operaciones.cerrar()).rejects.toThrow(/No se confirmó el cierre/);
  });
});

describe('ejecutarBootstrapPostgresDesdeEntorno', () => {
  const entorno = {
    SUPABASE_BOOTSTRAP_DATABASE_URL: 'postgresql://bootstrap.invalid/base',
    SUPABASE_BOOTSTRAP_EMAIL: 'admin@ejemplo.local',
    SUPABASE_BOOTSTRAP_PASSWORD: 'secreto-de-prueba',
    SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE: 'Hogar de desarrollo',
  };

  it('ejecuta la siembra con variables privadas y cierra la conexión al completar', async () => {
    const operaciones = { cerrar: vi.fn(async () => undefined) };
    const crearOperaciones = vi.fn(async () => operaciones);
    const sembrar = vi.fn(async () => ({ householdId: { valor: 'hogar-1' }, userId: { valor: 'usuario-1' } }));

    const resultado = await ejecutarBootstrapPostgresDesdeEntorno(entorno, {
      crearOperaciones: crearOperaciones as never,
      sembrar: sembrar as never,
    });

    expect(crearOperaciones).toHaveBeenCalledWith(entorno.SUPABASE_BOOTSTRAP_DATABASE_URL);
    expect(sembrar).toHaveBeenCalledWith(operaciones, {
      bootstrapEmail: entorno.SUPABASE_BOOTSTRAP_EMAIL,
      bootstrapPassword: entorno.SUPABASE_BOOTSTRAP_PASSWORD,
      bootstrapHouseholdNombre: entorno.SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE,
    });
    expect(operaciones.cerrar).toHaveBeenCalledOnce();
    expect(resultado).toEqual({ householdId: { valor: 'hogar-1' }, userId: { valor: 'usuario-1' } });
  });

  it('cierra la conexión administrativa también cuando la siembra falla', async () => {
    const operaciones = { cerrar: vi.fn(async () => undefined) };
    const error = new Error('fallo de siembra');

    await expect(
      ejecutarBootstrapPostgresDesdeEntorno(entorno, {
        crearOperaciones: vi.fn(async () => operaciones) as never,
        sembrar: vi.fn(async () => {
          throw error;
        }) as never,
      }),
    ).rejects.toBe(error);

    expect(operaciones.cerrar).toHaveBeenCalledOnce();
  });

  it('propaga el error de siembra en vez del error de cierre cuando ambos fallan', async () => {
    const errorSiembra = new Error('fallo de siembra');
    const errorCierre = new Error('fallo de cierre');
    const operaciones = {
      cerrar: vi.fn(async () => {
        throw errorCierre;
      }),
    };

    await expect(
      ejecutarBootstrapPostgresDesdeEntorno(entorno, {
        crearOperaciones: vi.fn(async () => operaciones) as never,
        sembrar: vi.fn(async () => {
          throw errorSiembra;
        }) as never,
      }),
    ).rejects.toBe(errorSiembra);

    expect(operaciones.cerrar).toHaveBeenCalledOnce();
  });
});
