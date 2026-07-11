# Reporte de verificación — PR3

**Cambio**: `vehicle-maintenance-app`
**Corte verificado**: PR3 pre-commit, tareas 10–13 y remediación de bloqueadores full-4R
**Modo**: TDD estricto (`npm test`)
**Fecha**: 2026-07-11

## Veredicto

**PASS DEL CORTE PR3 CON BLOQUEADOR DE ARCHIVO Y ADVERTENCIAS**

El corte PR3 corregido está verde: 196/196 tests y 11/11 pruebas focalizadas finales de reporte de incidentes. `npx tsc --noEmit` conserva exactamente los 7 errores conocidos y no introduce errores nuevos. El build de producción final se repitió después de la última remediación y pasó correctamente.

Los hallazgos `RISK-PR3-001`, `R3-PR3-001` y `R4-OBS-001` quedan remediados. Este reporte no declara listo para archivo el cambio OpenSpec completo porque persiste una tarea de implementación sin marcar.

## Estado estructurado y actionContext

- Proyecto: `manteniment-vehicles`.
- Cambio activo: `vehicle-maintenance-app`; selección inequívoca.
- Artifact store: `both`; OpenSpec fue la autoridad de esta ejecución.
- Workspace: `/home/josep/proyectos/manteniment-vehicles`; propiedad del código probada mediante el working tree actual.
- Corte autorizado: PR3, tareas 10–13 y lote de corrección full-4R.
- Estrategia: `auto-chain`; chain strategy `stacked-to-main`.
- Contexto: pre-commit con cambios ya staged. Solo se ejecutaron verificaciones y se actualizó este reporte.
- No se hizo commit, push, archive ni se modificaron migraciones SQL.

## Completitud de tareas

- Tareas 10–13 de PR3: todas `[x]`.
- Evidencia de remediación y tabla/secciones de `TDD Cycle Evidence`: presentes en `apply-progress.md`; los archivos de prueba declarados existen.
- Única tarea de implementación sin marcar en `tasks.md`:

> - [ ] GREEN (pendiente, fuera de este PR): implementar `OperacionesBootstrap` contra Postgres/Supabase Admin API real (no dobles) + añadir guardia de unicidad/bloqueo a nivel de base de datos (constraint `unique` en `mv_households.nombre` o mecanismo equivalente) antes de usar este bootstrap en un entorno multi-instancia o de producción. Requiere entorno Supabase real/local disponible y probablemente una nueva migración; no se puede completar en esta sesión (ver blockers en `apply-progress.md`).

**CRITICAL de completitud/archivo**: esta tarea queda fuera del límite PR3 aprobado, pero impide un PASS limpio del cambio completo, su archivo y un despliegue real/multi-instancia.

## Verificación de los bloqueadores full-4R

| Hallazgo | Inspección independiente | Prueba | Resultado |
|---|---|---|---|
| `RISK-PR3-001` — acceso anónimo con identidad/hogar temporal | `crearDependenciasVehiculos` valida antes de crear el cliente una prueba request-bound: `VEHICULOS_ACCESS_TOKEN` frente a `x-vehiculos-access-token`; ausencia o desigualdad falla cerrada con `ErrorAccesoVehiculos`; comparación con `timingSafeEqual`. | Ausente e inválida rechazan; válida permite composición. | ✅ Remediado |
| `R3-PR3-001` — fechas dependientes de zona horaria | `historial-eventos.tsx` usa `toLocaleDateString('es-ES', { timeZone: 'UTC' })`. | ISO `2026-02-01T00:00:00.000Z` se muestra como `1/2/2026`. | ✅ Remediado |
| `R4-OBS-001` / `R4-PR3-002` — incidentes solo por consola | `ReportadorIncidentes` usa un SDK inyectado o el endpoint HTTP configurado por `NEXT_PUBLIC_INCIDENT_REPORT_URL`; server actions y `/vehiculos/error.tsx` reportan contexto sanitizado. | Tests verifican reportador inyectado, endpoint configurado y fallback sin configuración. | ✅ Remediado |
| `R4-PR3-003` — fallo del reportador rompe la degradación | `reportarIncidente` captura fallos síncronos y rechazos asíncronos; la consola sanitizada se usa solo como fallback. | Server action conserva mensaje genérico; la frontera renderiza y `reset` funciona aunque el reportador lance. | ✅ Remediado |

Nota operativa: el proxy/despliegue debe configurar e inyectar la cabecera de acceso; si no lo hace, la aplicación falla cerrada.

## Cobertura de especificación del corte PR3

| Área | Evidencia | Resultado |
|---|---|---|
| Validación de alta, eventos y corrección | Esquemas Zod y tests | ✅ |
| Server actions y errores comprensibles | Tests `acciones-*` y `resultado-accion` | ✅ |
| Listado, alta y desactivación | Vistas, acciones y tests de componentes | ✅ |
| Historial, eventos y kilometraje | Casos de uso, acciones y componentes | ✅ |
| Vencimientos calculados | Dominio, proyección y componente de historial | ✅ |
| Frontera de error de `/vehiculos` | `error.tsx` y `error.test.tsx` | ✅ |
| Aislamiento de acceso previo a composición | Prueba de token request-bound | ✅ |
| Uso desktop/móvil contra Supabase real | No ejecutado por falta de entorno real | ⚠️ No verificado E2E |

## Comandos ejecutados

### Pruebas focalizadas de bloqueadores

```bash
npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/interfaz/componentes/historial-eventos.test.tsx src/modulos/vehiculos/interfaz/acciones/resultado-accion.test.ts src/app/vehiculos/error.test.tsx
```

Resultado: ✅ 4 archivos, 22/22 tests.

### Suite completa

```bash
npm test
```

Resultado final: ✅ 34 archivos, 196/196 tests.

### Type-check independiente

```bash
npx tsc --noEmit
```

Resultado: ⚠️ código 2, exactamente 7 errores conocidos:

```text
src/compartido/pruebas/validate-supabase-rls.test.ts(93,35): error TS2741: Property 'NODE_ENV' is missing in type '{ MV_FAKE_PROJECT_ID: string; }' but required in type 'ProcessEnv'.
src/compartido/pruebas/validate-supabase-rls.test.ts(132,11): error TS2741: Property 'NODE_ENV' is missing in type '{ [x: string]: string; }' but required in type 'ProcessEnv'.
src/compartido/pruebas/validate-supabase-rls.test.ts(249,37): error TS2741: Property 'NODE_ENV' is missing in type '{ MV_FAKE_PROJECT_ID: string; }' but required in type 'ProcessEnv'.
src/compartido/pruebas/validate-supabase-rls.test.ts(389,35): error TS2741: Property 'NODE_ENV' is missing in type '{ MV_FAKE_PROJECT_ID: string; }' but required in type 'ProcessEnv'.
src/compartido/pruebas/validate-supabase-rls.test.ts(405,9): error TS2741: Property 'NODE_ENV' is missing in type '{ DATABASE_URL: string; MV_RLS_MUTATION_MARKER: string; }' but required in type 'ProcessEnv'.
src/modulos/vehiculos/adaptadores/supabase/bootstrap-servidor.test.ts(77,17): error TS2540: Cannot assign to 'contarHogaresPorNombre' because it is a read-only property.
src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.test.ts(11,58): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
```

No aparecen errores en los archivos de la remediación actual ni errores adicionales respecto de la base documentada.

### Build

```bash
npm run build
```

Resultado: ✅ Next.js 16.2.10 compiló, completó TypeScript interno, generó 4/4 páginas y publicó las rutas previstas de `/vehiculos`.

## Cumplimiento TDD estricto y calidad de aserciones

- `apply-progress.md` contiene evidencia RED/GREEN para la remediación pre-commit.
- Los cuatro archivos focalizados existen y GREEN sigue confirmado con 22/22; la suite completa pasa 194/194.
- Las aserciones verifican rechazos y aceptación de acceso, fecha visible estable, llamadas al reportador inyectado, contexto, código Supabase y digest.
- No se observaron tautologías, ghost loops, aserciones solo de tipos, smoke-only como única evidencia ni aserciones CSS de detalle de implementación.
- Limitación: no existe prueba E2E contra Supabase/proxy reales ni recorrido real desktop/móvil.

## Review Workload / límite de PR

- El forecast exigía PRs encadenados; el trabajo permanece en el corte PR3 (tareas 10–13 y correcciones de revisión), sin implementar el bootstrap/Admin API pendiente ni crear/modificar migraciones SQL.
- Chain strategy respetada: `stacked-to-main`.
- El staged diff es grande: 48 archivos, 3636 inserciones y 109 eliminaciones. Aunque PR3 era el slice asignado, supera ampliamente 400 líneas. Requiere conservar la revisión adversarial y los work units antes del commit/PR.
- No consta `size:exception`; la estrategia era `auto-chain`, no `single-pr`.

## Riesgos y bloqueadores exactos

### CRITICAL

1. La tarea real de `OperacionesBootstrap` + guardia DB sigue sin marcar; bloquea archivo y despliegue real/multi-instancia, aunque queda fuera del PR3 aprobado.

### WARNING

1. `npx tsc --noEmit` no está verde: conserva 7 errores conocidos en tests.
2. No hubo validación E2E/manual contra Supabase y proxy reales; la inyección de `x-vehiculos-access-token` debe configurarse en despliegue.
3. El corte staged supera ampliamente el presupuesto de 400 líneas.

## Conclusión pre-commit

El corte PR3 corregido supera la verificación funcional, de seguridad focalizada, observabilidad, estabilidad temporal, TDD y build. Puede pasar al lifecycle review/gate pre-commit como **PR3 parcial**, sin afirmar que el cambio OpenSpec completo está listo para archivo o despliegue real.

## Addendum de verificación — `R3-REL-001`

**Resultado: ✅ REMEDIADO**

- El fallback de consola ya no escribe metadata arbitraria: solo conserva `codigo` cuando cumple un formato restringido y señala `digest` con valor `[redacted]`; descarta el resto.
- El fallback no escribe `Error.message`. El reportador HTTP comparte la misma metadata sanitizada y descripción neutra del error.
- Un reportador que devuelve una promesa/thenable rechazada no rompe al caller: el rechazo se consume y activa el fallback seguro.
- RED observado: 2/10 pruebas focalizadas fallaron antes de implementar la sanitización, exponiendo los valores sensibles de las fixtures.
- GREEN focalizado: `npm test -- src/modulos/vehiculos/interfaz/acciones/resultado-accion.test.ts src/app/vehiculos/error.test.tsx` → 2 archivos, 13/13 tests.
- Suite: `npm test` → 34 archivos, 198/198 tests.
- Tipos: `npx tsc --noEmit` → código 2 con exactamente los mismos 7 errores conocidos documentados; cero errores nuevos.

## Addendum de verificación — bloqueadores finales `R3-001` y `R3-002`

**Resultado: ✅ REMEDIADOS**

- `R3-001`: token ausente e inválido rechazan antes de crear dependencias; ambos casos verifican explícitamente cero llamadas a `crearClienteSupabaseServidor` con mocks aislados por prueba.
- `R3-002`: la prueba fija `TZ=America/Los_Angeles` y confirma que el formateo local de la fixture sería `31/1/2026`; el componente conserva `1/2/2026` por su formato UTC. La zona original siempre se restaura.
- Focalizadas: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/interfaz/componentes/historial-eventos.test.tsx` → 2 archivos, 13/13 tests.
- Suite: `npm test` → 34 archivos, 198/198 tests.
- Tipos: `npx tsc --noEmit` → código 2 con exactamente los 7 errores conocidos documentados; cero errores nuevos.
- No se modificó código de producción ni se requirió build para esta remediación test-only.
