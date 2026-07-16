import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = fileURLToPath(new URL('../..', import.meta.url));
const EXTENSIONES = new Set(['.ts', '.tsx']);
const ADAPTADOR_SUPABASE = /(?:^|\/)(?:adaptadores|infraestructura)\/supabase(?:\/|$)/;
const IDENTIDAD = /(?:^|\/)(?:proveedor-identidad(?:-supabase-servidor)?|resolver-acceso-familiar|cliente-supabase-servidor)(?:\/|$)/;
const MEMBRESIAS = new Set(['mv_household_members', 'fam_miembros_hogar']);
const PARAMETROS_HOGAR = new Set(['household_id', 'householdId']);
const ENTRADAS_CLIENTE = new Set(['searchParams', 'params', 'formData']);
const fuente = (codigo: string) => ts.createSourceFile('frontera.tsx', codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

async function archivos(directorio: string): Promise<string[]> {
  try { return (await Promise.all((await readdir(directorio, { withFileTypes: true })).map(async (entrada) => {
    const ruta = path.join(directorio, entrada.name);
    return entrada.isDirectory() ? archivos(ruta) : entrada.isFile() && EXTENSIONES.has(path.extname(ruta)) && !/\.test\.tsx?$/.test(ruta) && !/(?:^|\/)(?:pruebas|__tests__|historial|generated)(?:\/|$)/.test(ruta) ? [ruta] : [];
  }))).flat(); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
function directivaCliente(archivo: ts.SourceFile): boolean {
  for (const sentencia of archivo.statements) { if (!ts.isExpressionStatement(sentencia) || !ts.isStringLiteral(sentencia.expression)) return false; if (sentencia.expression.text === 'use client') return true; }
  return false;
}
function importaciones(archivo: ts.SourceFile): string[] {
  const resultados: string[] = []; const visitar = (nodo: ts.Node) => {
    const especificador = (ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) ? nodo.moduleSpecifier : ts.isImportEqualsDeclaration(nodo) && ts.isExternalModuleReference(nodo.moduleReference) ? nodo.moduleReference.expression : undefined;
    if (especificador && ts.isStringLiteral(especificador)) resultados.push(especificador.text);
    if (ts.isCallExpression(nodo) && nodo.arguments.length === 1 && ts.isStringLiteral(nodo.arguments[0]) && ((ts.isIdentifier(nodo.expression) && nodo.expression.text === 'require') || nodo.expression.kind === ts.SyntaxKind.ImportKeyword)) resultados.push(nodo.arguments[0].text);
    ts.forEachChild(nodo, visitar);
  }; visitar(archivo); return resultados;
}
function contieneEntradaCliente(nodo: ts.Node, declaraciones = new Map<string, ts.Expression>(), visitados = new Set<string>()): boolean {
  if (ts.isIdentifier(nodo)) {
    if (ENTRADAS_CLIENTE.has(nodo.text)) return true;
    const origen = declaraciones.get(nodo.text); if (!origen || visitados.has(nodo.text)) return false;
    visitados.add(nodo.text); const encontrada = contieneEntradaCliente(origen, declaraciones, visitados); visitados.delete(nodo.text); return encontrada;
  }
  if (ts.isCallExpression(nodo)) return (ts.isIdentifier(nodo.expression) && ['cookies', 'headers', 'FormData'].includes(nodo.expression.text)) || contieneEntradaCliente(nodo.expression, declaraciones, visitados) || nodo.arguments.some((argumento) => contieneEntradaCliente(argumento, declaraciones, visitados));
  if (ts.isNewExpression(nodo)) return ts.isIdentifier(nodo.expression) && nodo.expression.text === 'FormData';
  let encontrada = false; ts.forEachChild(nodo, (hijo) => { encontrada ||= contieneEntradaCliente(hijo, declaraciones, visitados); }); return encontrada;
}
function derivaHogarDesdeCliente(archivo: ts.SourceFile, entradaExterna = false): boolean {
  let encontrada = false; const declaraciones = new Map<string, ts.Expression>();
  const indexar = (nodo: ts.Node) => { if (ts.isVariableDeclaration(nodo) && ts.isIdentifier(nodo.name) && nodo.initializer) declaraciones.set(nodo.name.text, nodo.initializer); ts.forEachChild(nodo, indexar); }; indexar(archivo);
  function esHogar(nodo: ts.Node): boolean { return ts.isIdentifier(nodo) && PARAMETROS_HOGAR.has(nodo.text) || ts.isStringLiteral(nodo) && PARAMETROS_HOGAR.has(nodo.text) || ts.isObjectBindingPattern(nodo) && nodo.elements.some(({ name, propertyName }) => esHogar(propertyName ?? name)); }
  const visitar = (nodo: ts.Node) => {
    if (entradaExterna && ts.isParameter(nodo) && esHogar(nodo.name)) encontrada = true;
    if (ts.isVariableDeclaration(nodo) && esHogar(nodo.name) && nodo.initializer && contieneEntradaCliente(nodo.initializer, declaraciones)) encontrada = true;
    if (ts.isBinaryExpression(nodo) && nodo.operatorToken.kind === ts.SyntaxKind.EqualsToken && esHogar(nodo.left) && contieneEntradaCliente(nodo.right, declaraciones)) encontrada = true;
    if (ts.isPropertyAssignment(nodo) && esHogar(nodo.name) && contieneEntradaCliente(nodo.initializer, declaraciones)) encontrada = true;
    if (ts.isCallExpression(nodo) && nodo.arguments.some((argumento) => contieneEntradaCliente(argumento, declaraciones)) && nodo.arguments.some(esHogar)) encontrada = true;
    ts.forEachChild(nodo, visitar);
  }; visitar(archivo); return encontrada;
}
function usaIdentidadOMembresias(archivo: ts.SourceFile): boolean {
  let encontrada = importaciones(archivo).some((origen) => IDENTIDAD.test(origen)); const visitar = (nodo: ts.Node) => {
    if (ts.isImportDeclaration(nodo) && nodo.importClause?.namedBindings && ts.isNamedImports(nodo.importClause.namedBindings)) encontrada ||= nodo.importClause.namedBindings.elements.some(({ name, propertyName }) => (propertyName ?? name).text === 'ProveedorIdentidad' || name.text === 'resolverAcceso');
    if (ts.isCallExpression(nodo) && ts.isPropertyAccessExpression(nodo.expression)) encontrada ||= nodo.expression.name.text === 'getUser' && ts.isPropertyAccessExpression(nodo.expression.expression) && nodo.expression.expression.name.text === 'auth' || nodo.expression.name.text === 'from' && ts.isStringLiteral(nodo.arguments[0]) && MEMBRESIAS.has(nodo.arguments[0].text);
    ts.forEachChild(nodo, visitar);
  }; visitar(archivo); return encontrada;
}
async function violaciones(directorio: string, prohibido: RegExp) { return (await Promise.all((await archivos(directorio)).map(async (archivo) => importaciones(fuente(await readFile(archivo, 'utf8'))).filter((origen) => prohibido.test(origen)).map((origen) => `${path.relative(RAIZ_SRC, archivo)} -> ${origen}`)))).flat(); }
async function clientesConAdaptadores() { return (await Promise.all((await archivos(RAIZ_SRC)).map(async (archivo) => { const codigo = fuente(await readFile(archivo, 'utf8')); return directivaCliente(codigo) ? importaciones(codigo).filter((origen) => ADAPTADOR_SUPABASE.test(origen)).map((origen) => `${path.relative(RAIZ_SRC, archivo)} -> ${origen}`) : []; }))).flat(); }
async function vehiculosConIdentidad() { return (await Promise.all((await archivos(path.join(RAIZ_SRC, 'modulos/vehiculos'))).map(async (archivo) => usaIdentidadOMembresias(fuente(await readFile(archivo, 'utf8'))) ? [path.relative(RAIZ_SRC, archivo)] : []))).flat(); }

describe('guardas sintácticas de fronteras', () => {
  it.each([
    ['URL', 'const householdId = new URL(request.url).searchParams.get("household_id")'],
    ['params', 'const householdId = params.householdId'],
    ['formulario', 'const householdId = new FormData().get("household_id")'],
    ['cookie', 'const householdId = (await cookies()).get("household_id")'],
    ['cabecera', 'const householdId = (await headers()).get("x-household-id")'],
    ['alias URL/searchParams', 'const consulta = new URL(request.url).searchParams; const householdId = consulta.get("household_id")'],
    ['alias FormData', 'const datos = new FormData(); const householdId = datos.get("household_id")'],
    ['alias cookies', 'const galletas = await cookies(); const householdId = galletas.get("household_id")'],
    ['alias headers', 'const cabeceras = await headers(); const householdId = cabeceras.get("x-household-id")'],
    ['parámetro householdId', 'function operar(householdId: string) {}'],
    ['parámetro household_id', 'function operar(household_id: string) {}'],
    ['parámetro desestructurado householdId', 'function operar({ householdId }: Entrada) {}'],
    ['parámetro desestructurado household_id', 'function operar({ household_id }: Entrada) {}'],
  ])('detecta hogar controlado por cliente desde %s', (origen, codigo) => expect(derivaHogarDesdeCliente(fuente(codigo), origen.startsWith('parámetro'))).toBe(true));
  it.each([
    'function operar(contexto: ContextoAplicacion) { return contexto.householdId; }',
    'repositorio.listar(contexto.householdId)',
    'let origen = alias; let alias = origen; const householdId = origen',
    'import { datos } from "./entrada"; const householdId = datos.get("household_id")',
  ])('permite ContextoAplicacion resuelto en servidor', (codigo) => expect(derivaHogarDesdeCliente(fuente(codigo))).toBe(false));
  it('reconoce directivas cliente con BOM, comentarios, comillas y sin punto y coma', () => expect(directivaCliente(fuente('\uFEFF/* composición */\n\'use client\'\nimport cliente from "@/infraestructura/supabase/cliente"'))).toBe(true));
  it('no clasifica como cliente una expresión use client después de código ejecutable', () => expect(directivaCliente(fuente('const listo = true;\n"use client"'))).toBe(false));
  it('distingue contratos, llamadas y literales', () => {
    expect(usaIdentidadOMembresias(fuente('const nota = "auth.getUser y fam_miembros_hogar"; export const valor = nota'))).toBe(false);
    expect(usaIdentidadOMembresias(fuente('async function resolver() { return cliente.auth.getUser(); }'))).toBe(true);
    expect(usaIdentidadOMembresias(fuente('import { ProveedorIdentidad } from "../nucleo-familiar/aplicacion/puertos/alcance-familiar"; export type Prueba = ProveedorIdentidad'))).toBe(true);
    expect(usaIdentidadOMembresias(fuente('cliente.from("fam_miembros_hogar").select()'))).toBe(true);
  });
});
describe('fronteras de la aplicación familiar', () => {
  it('impide que el núcleo familiar importe el módulo de vehículos', async () => expect(await violaciones(path.join(RAIZ_SRC, 'nucleo-familiar'), /(?:^|\/)modulos\/vehiculos(?:\/|$)|^@\/modulos\/vehiculos(?:\/|$)/)).toEqual([]));
  it('impide que los componentes cliente importen adaptadores Supabase', async () => expect(await clientesConAdaptadores()).toEqual([]));
  it('impide que vehículos resuelva identidad o membresías', async () => expect(await vehiculosConIdentidad()).toEqual([]));
  it('impide que código productivo derive el hogar desde entradas controladas por cliente', async () => expect((await Promise.all((await archivos(RAIZ_SRC)).map(async (archivo) => derivaHogarDesdeCliente(fuente(await readFile(archivo, 'utf8')), /(?:^|\/)(?:app|interfaz\/acciones)(?:\/|$)/.test(path.relative(RAIZ_SRC, archivo))) ? path.relative(RAIZ_SRC, archivo) : []))).flat()).toEqual([]));
});
