import { describe, expect, it, vi } from 'vitest';
import {
  inspeccionarPreflightCatalogoFamiliar,
  type ClienteCatalogoPostgres,
} from '../../../supabase/validation/preflight-catalogo-family-app';

const tablasOrigen = [
  'mv_households',
  'mv_household_members',
  'mv_platform_roles',
  'mv_vehiculos',
  'mv_eventos_vehiculo',
];

function clienteConCatalogo(opciones: { faltante?: string; conflicto?: string } = {}): ClienteCatalogoPostgres {
  const filasOrigen = tablasOrigen
    .filter((nombre) => nombre !== opciones.faltante)
    .map((nombre, indice) => ({
      nombre,
      oid: String(10_000 + indice),
      propietario: 'postgres',
      definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }],
    }));
  const query = vi.fn()
    .mockResolvedValueOnce({ rows: filasOrigen })
    .mockResolvedValueOnce({ rows: opciones.conflicto ? [{ nombre: opciones.conflicto, oid: '20_000' }] : [] })
    .mockResolvedValueOnce({ rows: [
      { tabla_origen: 'mv_vehiculos', objeto_dependiente: 'mv_vehiculos_household_idx', clase_dependiente: '1259', oid_dependiente: '30000', subobjeto_dependiente: '0', tipo_dependencia: 'a', clase_referencia: '1259', oid_referencia: '10003', subobjeto_referencia: '0', definicion: 'CREATE INDEX' },
      { tabla_origen: 'mv_vehiculos', objeto_dependiente: 'mv_vehiculos_household_idx', clase_dependiente: '1259', oid_dependiente: '30000', subobjeto_dependiente: '0', tipo_dependencia: 'i', clase_referencia: '1259', oid_referencia: '10003', subobjeto_referencia: '0', definicion: 'CREATE INDEX' },
    ] });
  return { query };
}

describe('inspeccionarPreflightCatalogoFamiliar', () => {
  it('inventa OIDs, definiciones y dependencias de las cinco tablas origen sin mutar el catálogo', async () => {
    const cliente = clienteConCatalogo();

    const inventario = await inspeccionarPreflightCatalogoFamiliar(cliente);
    expect(inventario.objetosOrigen.map(({ nombre, oid, propietario, definicion }) => ({ nombre, oid, propietario, definicion }))).toEqual([
      { nombre: 'mv_households', oid: '10000', propietario: 'postgres', definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }] },
      { nombre: 'mv_household_members', oid: '10001', propietario: 'postgres', definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }] },
      { nombre: 'mv_platform_roles', oid: '10002', propietario: 'postgres', definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }] },
      { nombre: 'mv_vehiculos', oid: '10003', propietario: 'postgres', definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }] },
      { nombre: 'mv_eventos_vehiculo', oid: '10004', propietario: 'postgres', definicion: [{ nombre: 'id', tipo: 'uuid', no_nulo: true }] },
    ]);
    expect(inventario.conflictosFinales).toEqual([]);
    expect(inventario.dependencias).toEqual([
      { tablaOrigen: 'mv_vehiculos', objetoDependiente: 'mv_vehiculos_household_idx', claseDependiente: '1259', oidDependiente: '30000', subobjetoDependiente: '0', tipoDependencia: 'a', claseReferencia: '1259', oidReferencia: '10003', subobjetoReferencia: '0', definicion: 'CREATE INDEX' },
      { tablaOrigen: 'mv_vehiculos', objetoDependiente: 'mv_vehiculos_household_idx', claseDependiente: '1259', oidDependiente: '30000', subobjetoDependiente: '0', tipoDependencia: 'i', claseReferencia: '1259', oidReferencia: '10003', subobjetoReferencia: '0', definicion: 'CREATE INDEX' },
    ]);
    expect(cliente.query).toHaveBeenCalledTimes(3);
    const consultaConflictos = vi.mocked(cliente.query).mock.calls[1]?.[0] ?? '';
    expect(consultaConflictos).toContain('from pg_type t');
    expect(consultaConflictos).not.toContain('from pg_class');
    expect(consultaConflictos).toContain('order by t.typname, t.oid');
    const consultaDependencias = vi.mocked(cliente.query).mock.calls[2]?.[0] ?? '';
    expect(consultaDependencias).toContain("d.refclassid = 'pg_class'::regclass");
    expect(consultaDependencias).not.toContain("d.deptype <> 'i'");
    expect(consultaDependencias).toContain('order by origen.relname, d.classid, d.objid, d.objsubid, d.refclassid, d.refobjid, d.refobjsubid, d.deptype, objeto_dependiente, definicion');
  });

  it.each([
    ['un objeto origen requerido falta', { faltante: 'mv_vehiculos' }, /mv_vehiculos/],
    ['un objeto final conflictivo existe', { conflicto: 'fam_ve_vehiculos' }, /fam_ve_vehiculos/],
  ])('falla cerrado cuando %s', async (_caso, opciones, mensaje) => {
    await expect(inspeccionarPreflightCatalogoFamiliar(clienteConCatalogo(opciones))).rejects.toThrow(mensaje);
  });
});
