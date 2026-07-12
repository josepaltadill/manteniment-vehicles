import { describe, expect, it, vi } from 'vitest';
import { inspeccionarBootstrapFamiliar, type ClienteConsulta } from './bootstrap-preflight';

describe('inspeccionarBootstrapFamiliar', () => {
  it('consulta solo el destino y hogares del UUID Auth, con conteos de vehículos y eventos', async () => {
    const query = vi.fn(async () => ({ rows: [{ id: '10000000-0000-4000-8000-000000000001', nombre: 'Familia Altadill', vehiculos: '2', eventos: '4', miembros: [{ user_id: '00000000-0000-4000-8000-000000000001', rol: 'admin' }] }] })) as unknown as ClienteConsulta['query'];
    const hogares = await inspeccionarBootstrapFamiliar({ query }, 'Familia Altadill', '00000000-0000-4000-8000-000000000001');

    expect(hogares).toEqual([{ id: '10000000-0000-4000-8000-000000000001', nombre: 'Familia Altadill', vehiculos: 2, eventos: 4, miembros: [{ userId: '00000000-0000-4000-8000-000000000001', rol: 'admin' }] }]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('count(distinct v.id)'), ['Familia Altadill', '00000000-0000-4000-8000-000000000001']);
  });
});
