import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contieneClavePrivilegiada,
  detectarImportadorNoPermitidoDeBootstrap,
  detectarImportadoresNoPermitidosDeBootstrap,
  detectarImportsClienteIndebidosEnContenido,
  detectarImportsClienteIndebidosEnRepositorio,
  detectarModulosBootstrapSinServerOnly,
  listarArchivosFuente,
} from './seguridad-servidor';

const RAIZ_SRC = path.join(process.cwd(), 'src');
const RAIZ_SCRIPTS = path.join(process.cwd(), 'scripts');

describe('detectarImportsClienteIndebidosEnContenido', () => {
  it('detecta un import de un adaptador Supabase dentro de un archivo `use client`', () => {
    const contenido = [
      "'use client';",
      "import { RepositorioVehiculosSupabase } from '../modulos/vehiculos/adaptadores/supabase/repositorio-vehiculos-supabase';",
      'export function Componente() { return null; }',
    ].join('\n');

    const hallazgos = detectarImportsClienteIndebidosEnContenido('componente-cliente.tsx', contenido);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]?.especificador).toContain('adaptadores/supabase');
  });

  it('no reporta nada en un archivo `use client` que no importa adaptadores Supabase', () => {
    const contenido = [
      "'use client';",
      "import { useState } from 'react';",
      'export function Componente() { useState(0); return null; }',
    ].join('\n');

    const hallazgos = detectarImportsClienteIndebidosEnContenido('componente-cliente.tsx', contenido);

    expect(hallazgos).toHaveLength(0);
  });

  it('no reporta nada en un archivo de servidor (sin `use client`) que sí importa un adaptador Supabase', () => {
    const contenido =
      "import { RepositorioVehiculosSupabase } from './repositorio-vehiculos-supabase';\n";

    const hallazgos = detectarImportsClienteIndebidosEnContenido('adaptador-servidor.ts', contenido);

    expect(hallazgos).toHaveLength(0);
  });
});

describe('contieneClavePrivilegiada', () => {
  it('detecta el patrón de variable de service_role key', () => {
    expect(contieneClavePrivilegiada('const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;')).toBe(true);
  });

  it('no marca como privilegiada una mención documental de "service_role" sin patrón de clave', () => {
    expect(
      contieneClavePrivilegiada('// se autentica como usuario real, no con `service_role`.'),
    ).toBe(false);
  });
});

describe('detectarImportadorNoPermitidoDeBootstrap', () => {
  it('reporta un archivo fuera de la allowlist que importa operaciones-bootstrap-postgres', () => {
    const contenido =
      "import { crearOperacionesBootstrapPostgres } from '../modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres';\n";

    expect(detectarImportadorNoPermitidoDeBootstrap('acciones-vehiculos.ts', contenido)).toBe(true);
  });

  it('reporta un archivo fuera de la allowlist que importa bootstrap-servidor', () => {
    const contenido = "import { sembrarHogarDeDesarrollo } from './bootstrap-servidor';\n";

    expect(detectarImportadorNoPermitidoDeBootstrap('acciones-vehiculos.ts', contenido)).toBe(true);
  });

  it('no reporta el runner real (scripts/bootstrap-admin.ts)', () => {
    const contenido =
      "import { ejecutarBootstrapPostgresDesdeEntorno } from '../src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres';\n";

    expect(detectarImportadorNoPermitidoDeBootstrap('scripts/bootstrap-admin.ts', contenido)).toBe(false);
  });

  it('no reporta a operaciones-bootstrap-postgres.ts importando bootstrap-servidor internamente', () => {
    const contenido = "import { sembrarHogarDeDesarrollo } from './bootstrap-servidor';\n";

    expect(
      detectarImportadorNoPermitidoDeBootstrap(
        'src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres.ts',
        contenido,
      ),
    ).toBe(false);
  });

  it('no reporta un archivo que no importa ninguno de los dos módulos de bootstrap', () => {
    const contenido = "import { useState } from 'react';\n";

    expect(detectarImportadorNoPermitidoDeBootstrap('componente.tsx', contenido)).toBe(false);
  });
});

describe('guardas de seguridad sobre el repositorio real', () => {
  // Los archivos `.test.ts(x)` quedan excluidos de este barrido: pueden contener
  // patrones prohibidos deliberadamente como literales de prueba (fixtures/
  // aserciones), lo que no representa una fuga real en código de producción.
  // `seguridad-servidor.ts` también queda excluido: es el propio detector y debe
  // referenciar el patrón prohibido textualmente para poder definirlo.
  const archivosDeProduccion = () =>
    listarArchivosFuente(RAIZ_SRC).filter(
      (archivo) => !archivo.includes('.test.') && !archivo.endsWith('seguridad-servidor.ts'),
    );

  it('no hay ningún archivo `use client` que importe un adaptador Supabase de datos de app', () => {
    const hallazgos = detectarImportsClienteIndebidosEnRepositorio(archivosDeProduccion());

    expect(hallazgos).toEqual([]);
  });

  it('ningún archivo de producción contiene un patrón de clave service_role', () => {
    const archivosConClave = archivosDeProduccion().filter((archivo) => {
      const contenido = readFileSync(archivo, 'utf8');
      return contieneClavePrivilegiada(contenido);
    });

    expect(archivosConClave).toEqual([]);
  });

  it('los módulos de bootstrap administrativo declaran `import \'server-only\'`', () => {
    const archivosSinGuard = detectarModulosBootstrapSinServerOnly(archivosDeProduccion());

    expect(archivosSinGuard).toEqual([]);
  });

  it('solo la allowlist explícita importa los módulos de bootstrap administrativo', () => {
    const archivos = [...archivosDeProduccion(), ...listarArchivosFuente(RAIZ_SCRIPTS)];

    const hallazgos = detectarImportadoresNoPermitidosDeBootstrap(archivos);

    expect(hallazgos).toEqual([]);
  });
});
