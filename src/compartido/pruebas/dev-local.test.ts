import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const rutaScript = path.join(process.cwd(), 'scripts/dev-local.sh');
const rutaGuia = path.join(process.cwd(), 'supabase/migrations/README.md');

describe('contrato del entorno local', () => {
  it('arranca Next en loopback sin inyectar identidad ni cabeceras temporales', () => {
    const script = readFileSync(rutaScript, 'utf8');

    expect(script).not.toContain('SUPABASE_HOUSEHOLD_ID_DESARROLLO');
    expect(script).not.toContain('VEHICULOS_ACCESS_TOKEN');
    expect(script).not.toContain('x-vehiculos-access-token');
    expect(script).toContain('npm run dev -- --hostname 127.0.0.1 --port 3000');
  });

  it('usa las credenciales de bootstrap solo para sembrar el login local y no imprime la contraseña', () => {
    const script = readFileSync(rutaScript, 'utf8');

    expect(script).toContain('npm run bootstrap:admin -- --seed-local');
    expect(script).toContain('http://127.0.0.1:3000/login');
    expect(script).toContain('SUPABASE_BOOTSTRAP_EMAIL');
    expect(script).not.toContain('echo "$SUPABASE_BOOTSTRAP_PASSWORD"');
  });

  it('siembra un hogar estrictamente local por defecto y documenta el override como local', () => {
    const script = readFileSync(rutaScript, 'utf8');
    const guia = readFileSync(rutaGuia, 'utf8');

    expect(script).toContain(': "${SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE:=Hogar de desarrollo}"');
    expect(guia).toContain('override exclusivo del entorno local');
    expect(guia).not.toContain('Familia Altadill` como hogar local por defecto');
  });

  it('documenta preparación, despliegue cerrado, activación y recuperación sin bypass temporal', () => {
    const guia = readFileSync(rutaGuia, 'utf8');

    expect(guia).toContain('## Activación productiva de Familia Altadill');
    expect(guia).toContain('### 1. Preparación y backup');
    expect(guia).toContain('### 2. Despliegue cerrado y smoke');
    expect(guia).toContain('### 3. Activación y recuperación');
    expect(guia).toContain('revocar sesiones');
    expect(guia).toContain('`--apply --confirm` queda deliberadamente bloqueado en este corte');
    expect(guia).toContain('gate de despliegue controlado por el operador');
    expect(guia).not.toMatch(/npm run bootstrap:admin\s*\n/);
    expect(guia).not.toContain('x-vehiculos-access-token');
  });
});
