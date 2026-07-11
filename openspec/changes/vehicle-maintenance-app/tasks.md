# Tareas: aplicación de mantenimiento de vehículos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1.800–2.800 líneas |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: base técnica + dominio + casos de uso en memoria → PR 2: Supabase servidor + migraciones + contratos transaccionales → PR 3: interfaz mínima Next.js + server actions |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |
| Decision status | Resuelta para apply: ejecutar solo el corte asignado por PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Decisiones fijadas para implementar

- La matrícula en `mv_vehiculos` es única POR HOGAR (`unique (household_id, matricula)`), incluyendo vehículos inactivos. La misma matrícula puede existir en hogares distintos. Regla ya fijada por la migración `20260710000000_supabase_persistence_short.sql` (sustituye la antigua unicidad global).
- El MVP puede usar un contexto temporal fijo (actor `admin` + `householdId` de desarrollo), pero todo acceso a datos de aplicación debe pasar por backend/server actions o adaptadores de servidor.
- El hogar (`householdId`) entra por `ProveedorIdentidad` como contexto de sesión; los puertos de persistencia reciben `householdId` explícito por llamada. El dominio permanece agnóstico al hogar.
- No se permite usar claves privilegiadas o `service_role` en código cliente.
- No se permite acceso browser-side directo a Supabase para datos de vehículos/eventos del MVP.
- El registro de evento + actualización de kilometraje debe exponerse como operación atómica/coordinada de aplicación y adaptador: no puede quedar evento guardado sin actualizar kilometraje cuando corresponde.

## Corte recomendado por PR

### PR 1 — Base técnica, dominio y casos de uso en memoria

Estado inicial: repositorio greenfield sin `package.json`.
Estado final: proyecto Next.js/TypeScript/Vitest inicializado, dominio probado y casos de uso funcionando con repositorios en memoria.
Verificación: `npm test` pasa con pruebas de dominio y aplicación.
Rollback: revertir este PR elimina la base sin tocar Supabase ni datos reales.

### PR 2 — Persistencia Supabase segura desde servidor

Estado inicial: PR 1 integrado. La migración multi-tenant ya existe (`supabase/migrations/20260710000000_supabase_persistence_short.sql`, cuatro tablas `mv_*` con RLS por hogar); PR2 NO crea una migración nueva de vehículos/eventos.
Estado final: puertos y `ProveedorIdentidad` de PR1 reabiertos y scoped por hogar; adaptador Supabase de servidor mapeando contra el esquema existente; resolución del hogar actual para el actor temporal; contrato atómico para evento + kilometraje.
Verificación: `npm test` con tests de mapeadores/contratos y aislamiento por hogar; revisión de que no hay Supabase app-data en cliente ni claves privilegiadas expuestas.
Rollback: revertir adaptadores/puertos; NO se toca la migración ya aplicada/versionada.

### PR 3 — Interfaz MVP y server actions

Estado inicial: PR 2 integrado.
Estado final: pantallas mínimas para listar/crear/desactivar vehículos, registrar eventos, corregir kilometraje y ver historial/vencimientos.
Verificación: `npm test` y recorrido manual en desktop/móvil básico.
Rollback: revertir UI/actions sin alterar dominio ni migraciones.

## Tareas ejecutables

### 1. PR 1 — Preparar stack y harness de pruebas

- [x] RED: crear pruebas mínimas de humo en `src/compartido/pruebas/harness.test.ts` que fallen hasta configurar Vitest.
- [x] GREEN: inicializar `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `postcss.config.js`, `src/app/layout.tsx` y `src/app/page.tsx` con Next.js + TypeScript + Tailwind + Vitest. Nota: Tailwind v4 usa `@tailwindcss/postcss`; no se conserva `tailwind.config.ts` porque no hay personalización necesaria.
- [x] GREEN: configurar script `npm test` en `package.json` usando Vitest.
- [x] REFACTOR: dejar estructura base `src/modulos/vehiculos/` y `src/compartido/` sin lógica duplicada.

### 2. PR 1 — Implementar dominio puro de vehículos

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/vehiculo.test.ts` para vehículo válido, kilometraje negativo, baja lógica y corrección manual arriba/abajo.
- [x] GREEN: implementar `src/modulos/vehiculos/dominio/vehiculo.ts`, `errores-dominio.ts` y helpers compartidos en `src/compartido/dominio/`.
- [x] TRIANGULATE: añadir caso de vehículo inactivo que conserva identidad, matrícula y fecha de alta.
- [x] REFACTOR: mantener el dominio sin imports de Next.js, React, Supabase, Zod ni Tailwind.

### 3. PR 1 — Implementar dominio de eventos, vencimientos y roles

- [x] RED: crear pruebas en `src/modulos/vehiculos/dominio/evento-vehiculo.test.ts`, `vencimiento.test.ts` y `rol-usuario.test.ts` para mantenimiento, avería, coste opcional, evento histórico, vencimiento por km, vencimiento por fecha, sin vencimiento y roles `admin`/`editor`.
- [x] GREEN: implementar `evento-vehiculo.ts`, `vencimiento.ts` y `rol-usuario.ts`.
- [x] TRIANGULATE: probar evento con solo vencimiento por km, solo por fecha y ambos.
- [x] REFACTOR: extraer tipos/value objects solo si reducen duplicación real.

### 4. PR 1 — Implementar casos de uso con puertos en memoria

- [x] RED: crear pruebas en `src/modulos/vehiculos/aplicacion/casos-uso/*.test.ts` para registrar/listar vehículo, rechazar matrícula duplicada global, desactivar sin borrar eventos, registrar evento actualizando kilometraje, registrar evento histórico sin bajarlo y corregir kilometraje.
- [x] GREEN: implementar casos de uso en `src/modulos/vehiculos/aplicacion/casos-uso/` y puertos en `src/modulos/vehiculos/aplicacion/puertos/`.
- [x] GREEN: definir en `repositorio-vehiculos.ts` una operación de unicidad global, por ejemplo `existeMatricula(matricula: string): Promise<boolean>`; no usar solo `existeMatriculaActiva`.
- [x] GREEN: definir un puerto/contrato atómico para `registrarEventoYActualizarKilometraje` o unidad de trabajo equivalente, consumido por `registrar-evento-vehiculo.ts`.
- [x] GREEN: crear repositorios en memoria para pruebas en `src/modulos/vehiculos/aplicacion/pruebas/`.
- [x] REFACTOR: asegurar que los casos de uso reciben `ProveedorIdentidad`/actor temporal sin aplicar matriz de permisos real.

### 5. PR 2 (ENMIENDA de PR1) — Contexto de hogar en puertos, proveedor y casos de uso

> Reabre trabajo YA COMPLETADO en PR1. Las firmas sin hogar (`existeMatricula(matricula)`, `ProveedorIdentidad.obtenerActorActual()`) contradicen el esquema real (`unique (household_id, matricula)`, RLS por hogar) y deben adoptar scoping por hogar ANTES de construir el adaptador Supabase. Marcar los commits como enmienda de PR1.

- [x] RED: actualizar `src/modulos/vehiculos/aplicacion/casos-uso/vehiculos-casos-uso.test.ts` para que el caso de matrícula duplicada sea POR HOGAR: rechazar duplicado dentro del mismo `householdId` y (nuevo assert) PERMITIR la misma matrícula en un `householdId` distinto. Los tests deben fallar contra las firmas actuales.
- [x] GREEN: introducir `ContextoAplicacion { actor: ActorAplicacion; householdId: Identificador }` y cambiar `ProveedorIdentidad` a `obtenerContexto(): Promise<ContextoAplicacion>` en `src/modulos/vehiculos/aplicacion/puertos/proveedor-identidad.ts`.
- [x] GREEN: cambiar `RepositorioVehiculos` a firmas scoped por hogar: `guardar(householdId, vehiculo)`, `buscarPorId(householdId, id)`, `listar(householdId)`, `existeMatricula(householdId, matricula)` en `repositorio-vehiculos.ts`.
- [x] GREEN: cambiar `RepositorioEventosVehiculo` y `UnidadTrabajoVehiculos` para recibir `householdId` explícito en `repositorio-eventos-vehiculo.ts`.
- [x] GREEN: actualizar los cinco casos de uso (`registrar-vehiculo`, `listar-vehiculos`, `desactivar-vehiculo`, `registrar-evento-vehiculo`, `corregir-kilometraje`) para resolver `obtenerContexto()` y propagar `householdId` a los repositorios.
- [x] GREEN: actualizar los dobles en memoria: `RepositorioVehiculosEnMemoria` (indexar por `(householdId, id)` y modelar `unique (household_id, matricula)`), `RepositorioEventosVehiculoEnMemoria` y `ProveedorIdentidadTemporal` (devolver actor `admin` + `householdId` fijo de desarrollo).
- [x] TRIANGULATE: añadir prueba de aislamiento: `buscarPorId`/`listar` de un hogar no devuelven vehículos de otro hogar.
- [x] REFACTOR: confirmar que el dominio (`Vehiculo`, `EventoVehiculo`) sigue sin conocer `householdId`; el hogar vive solo en aplicación/adaptadores. `npm test` en verde.

### 6. PR 2 — Adaptar al esquema Supabase existente (sin nueva migración)

> La migración `supabase/migrations/20260710000000_supabase_persistence_short.sql` YA existe (cuatro tablas `mv_*`, RLS por hogar). NO crear una migración nueva de vehículos/eventos ni tocar la existente.

- [x] RED: crear prueba de contrato/snapshot en `src/modulos/vehiculos/adaptadores/supabase/mapeadores-supabase.test.ts` que verifique el mapeo dominio↔columnas REALES: `household_id`, `estado`/`fecha_desactivacion` coherentes, `fecha_creacion` (no `creado_en`), FK compuesta `(household_id, vehiculo_id)`.
- [x] GREEN: implementar mapeadores contra el esquema real; NO mapear columnas inexistentes (`creado_en`/`actualizado_en` no existen en `mv_vehiculos`).
- [x] GREEN: alinear tipos de fecha con `timestamptz` (`fecha_compra`, `fecha`, `proximo_vencimiento_fecha`) según la migración.
- [x] GREEN: incluir prefijo `mv_` en toda referencia SQL de esta app.
- [x] REFACTOR: no crear tablas futuras de adjuntos/OCR/manuales; solo reservar nombres en documentación si hace falta.

### 7. PR 2 — Implementar adaptador Supabase solo de servidor

- [x] RED: crear pruebas de los repositorios Supabase que verifiquen que toda escritura inyecta `household_id` y toda lectura filtra por `household_id`.
- [x] GREEN: implementar `cliente-supabase-servidor.ts`, `repositorio-vehiculos-supabase.ts`, `repositorio-eventos-supabase.ts` implementando los puertos scoped por hogar de la tarea 5.
- [x] GREEN: validar variables en `src/compartido/infraestructura/entorno.ts` sin exponer claves privilegiadas al cliente.
- [x] GREEN: asegurar que el cliente Supabase de datos de app se importa solo desde server actions, Server Components o adaptadores de servidor.
- [x] REFACTOR: buscar y eliminar cualquier acceso browser-side a Supabase para `mv_vehiculos`/`mv_eventos_vehiculo`.

### 8. PR 2 — Garantizar atomicidad evento + kilometraje

- [x] RED: crear prueba de contrato en `src/modulos/vehiculos/aplicacion/casos-uso/registrar-evento-vehiculo.test.ts` que falle si se guarda evento y falla la actualización de kilometraje requerida.
- [x] GREEN: implementar el contrato atómico/coordinado definido en el puerto de aplicación.
- [x] GREEN: en Supabase, resolver la operación con RPC/transacción SQL o mecanismo equivalente de servidor; si se usa coordinación en aplicación, documentar compensación y error de consistencia en `repositorio-eventos-supabase.ts`.
- [x] TRIANGULATE: probar evento histórico que guarda evento sin actualizar kilometraje.
- [x] REFACTOR: dejar explícito en comentarios técnicos mínimos por qué no son dos llamadas independientes inseguras.

### 9. PR 2 — Frontera auth/RLS temporal segura y resolución de hogar

> Decisión de credencial (§15.6 del diseño) resuelta: el adaptador de servidor se autentica como un usuario `auth.users` real, sembrado por bootstrap server-only junto a su hogar y membresía en `mv_household_members`, e inicia sesión server-side como ese usuario. RLS sigue activa como frontera real; `service_role` queda descartado para esta app.

- [x] RED: crear prueba/checklist en `src/modulos/vehiculos/adaptadores/supabase/seguridad-servidor.test.ts` o documentación verificable que detecte imports cliente indebidos y confirme ausencia de `service_role`.
- [x] RED: crear prueba/checklist para el bootstrap server-only que verifique que sembrar usuario+hogar+membresía es idempotente (no duplica el hogar/usuario de desarrollo en reejecuciones).
- [x] GREEN (orquestación/interfaz implementada y probada contra dobles; ver tarea de abajo para implementación real): implementar el bootstrap server-only que crea (o reutiliza si ya existe) un `auth.users` de desarrollo, su `mv_households` y la fila de membresía `admin` en `mv_household_members`. Incluye detección de condición de carrera (re-query tras crear + `ErrorRaceBootstrapHogar` si hay duplicados), documentada como mitigación single-instance/dev-only, no como prevención real (esa requiere constraint `unique` + migración).
- [ ] GREEN (pendiente, fuera de este PR): implementar `OperacionesBootstrap` contra Postgres/Supabase Admin API real (no dobles) + añadir guardia de unicidad/bloqueo a nivel de base de datos (constraint `unique` en `mv_households.nombre` o mecanismo equivalente) antes de usar este bootstrap en un entorno multi-instancia o de producción. Requiere entorno Supabase real/local disponible y probablemente una nueva migración; no se puede completar en esta sesión (ver blockers en `apply-progress.md`).
- [x] GREEN: implementar el adaptador de servidor de `ProveedorIdentidad` que inicia sesión server-side como ese usuario sembrado y resuelve el contexto (`actor` + `householdId`) a partir del `mv_households.id` real devuelto por el bootstrap — no un valor arbitrario.
- [x] GREEN: documentar en `supabase/migrations/README.md` la decisión de credencial (usuario real + RLS, no `service_role`) y el procedimiento de siembra del hogar/usuario de desarrollo.
- [x] GREEN: confirmar que no existe `service_role` ni clave privilegiada en código cliente, `.env.example` público o componentes React.
- [x] REFACTOR: mantener la autorización futura fuera del dominio y fuera de componentes UI.

### 10. PR 3 — Validación y server actions

- [x] RED: crear pruebas de esquemas en `src/modulos/vehiculos/interfaz/validacion/esquemas-vehiculo.test.ts` y `esquemas-evento.test.ts` para campos obligatorios, coste opcional/no negativo y próximos vencimientos opcionales.
- [x] GREEN: implementar esquemas Zod en `src/modulos/vehiculos/interfaz/validacion/`.
- [x] GREEN: implementar server actions en `src/modulos/vehiculos/interfaz/acciones/acciones-vehiculos.ts` y `acciones-eventos.ts` llamando casos de uso/adaptadores de servidor.
- [x] GREEN: las actions deben devolver errores de validación comprensibles para alta incompleta y entradas inválidas.
- [x] REFACTOR: no añadir API REST interna salvo necesidad real.

### 11. PR 3 — Pantallas mínimas de vehículos

- [x] RED/GREEN: sin React Testing Library en el setup (`vitest.config.ts` usa `environment: 'node'`, sin jsdom ni RTL instalados); la lógica extraíble a función pura (`aVehiculoVista`) sí tiene ciclo RED→GREEN real en `interfaz/vistas/vehiculo-vista.test.ts`. El resto se cubre con checklist de verificación manual reproducible (ver `apply-progress.md`).
- [x] GREEN: implementar `src/app/vehiculos/page.tsx`, `src/app/vehiculos/nuevo/page.tsx`, `formulario-vehiculo.tsx` y `lista-vehiculos.tsx`.
- [x] GREEN: mostrar matrícula, marca, modelo, estado y kilometraje actual, distinguiendo activos/inactivos.
- [x] GREEN: permitir alta de vehículo y desactivación lógica desde server action.
- [x] REFACTOR: mantener componentes presentacionales pequeños; la lógica de negocio no vive en React.

### 12. PR 3 — Historial, eventos, corrección de kilometraje y vencimientos

- [x] RED/GREEN: flujos de registrar mantenimiento/avería, evento con km mayor, evento histórico y corrección manual ya cubiertos por casos de uso existentes (PR1/PR2, `vehiculos-casos-uso.test.ts`, `registrar-evento-vehiculo.test.ts`) más los nuevos `obtener-vehiculo.test.ts`/`listar-eventos-vehiculo.test.ts` y las pruebas de las server actions (`acciones-eventos.test.ts`) que ejercitan el flujo completo entrada→caso de uso→repositorio en memoria. Vencimiento por km/fecha cubierto en `dominio/vencimiento.test.ts` (PR1) y proyectado a interfaz en `interfaz/vistas/evento-vista.test.ts`. La composición visual en páginas/componentes React se verifica con checklist manual (ver `apply-progress.md`), consistente con la tarea 11.
- [x] GREEN: implementar `src/app/vehiculos/[vehiculoId]/page.tsx`, `src/app/vehiculos/[vehiculoId]/eventos/nuevo/page.tsx`, `formulario-evento.tsx` y `historial-eventos.tsx`.
- [x] GREEN: mostrar histórico de eventos de vehículos activos e inactivos.
- [x] GREEN: permitir registrar mantenimiento/avería con próximos vencimientos opcionales.
- [x] GREEN: permitir corrección manual de kilometraje hacia arriba o hacia abajo.
- [x] GREEN: mostrar estado calculado de vencimiento sin persistir estado derivado.
- [x] REFACTOR: evitar dashboard avanzado; mantener solo lo necesario del MVP.

### 13. Verificación final del MVP

- [x] Ejecutar `npm test` y guardar evidencia en el reporte de aplicación/verificación. → 28 archivos, 158 tests, todos en verde (ver `apply-progress.md`).
- [x] Revisar que el dominio no importa Next.js, React, Supabase, Zod ni Tailwind, ni conoce `householdId`. → confirmado por `rg` (sin coincidencias).
- [x] Revisar que todas las tablas/artefactos SQL usan prefijo `mv_`. → sin migración nueva/modificada en este PR; las cuatro tablas siguen con prefijo `mv_`.
- [x] Revisar que la unicidad de matrícula es por hogar (`unique (household_id, matricula)`) y que existe aislamiento por hogar en repositorios y adaptador. → sin cambios respecto a PR2, sigue verificado.
- [x] Revisar que evento + actualización de kilometraje usa contrato atómico/coordinado. → sin cambios respecto a PR2, sigue verificado; las nuevas server actions reutilizan el mismo caso de uso/UoW.
- [x] Revisar que no hay acceso inseguro desde navegador a Supabase para datos de app. → `seguridad-servidor.test.ts` (7/7, barre todo `src/`) confirma que los 3 componentes cliente nuevos no importan `adaptadores/supabase`.
- [x] Revisar que no hay claves privilegiadas en cliente. → `rg` sin coincidencias de `service_role` ni `NEXT_PUBLIC_` en `src/`.
- [x] Confirmar que OCR, IA, adjuntos, notificaciones y dashboard avanzado no se implementaron. → confirmado, solo se implementaron las pantallas mínimas descritas en el diseño.

## Mapa de cobertura de aceptación

| Criterio de spec/diseño | Tareas que lo cubren |
|---|---|
| Alta de vehículo con datos obligatorios | 2, 4, 5, 10, 11 |
| Rechazo de alta incompleta | 2, 10, 11 |
| Listado de flota con activos/inactivos | 4, 5, 11 |
| Desactivación lógica sin perder histórico | 2, 4, 11, 12 |
| Registro de mantenimiento y avería | 3, 4, 10, 12 |
| Evento con km mayor actualiza kilometraje | 3, 4, 8, 12 |
| Evento histórico no reduce kilometraje | 3, 4, 8, 12 |
| Corrección manual arriba/abajo | 2, 4, 12 |
| Vencimiento por km o fecha, lo primero | 3, 4, 12 |
| Roles `admin`/`editor` como concepto de dominio | 3, 4, 9 |
| Adaptar al esquema Supabase existente con prefijo `mv_` | 6, 7, 13 |
| Backend/server actions como frontera de datos | 7, 9, 10, 13 |
| Sin `service_role` ni Supabase app-data en cliente | 7, 9, 13 |
| Matrícula única por hogar incluyendo inactivos | 4, 5, 6, 13 |
| Aislamiento por hogar (multi-tenant) y contexto de sesión | 5, 6, 7, 9, 13 |
| Fuera de alcance: OCR/IA/adjuntos/notificaciones/dashboard | 6, 12, 13 |

## Riesgos y controles

- Riesgo: el cambio completo supera ampliamente 400 líneas. Control: aplicar en PRs encadenados y no iniciar `sdd-apply` hasta elegir `Chain strategy`.
- Riesgo: acceso inseguro a Supabase compartido. Control: RLS por hogar ya activa en la migración; acceso a app-data solo desde servidor, con actor+hogar resueltos vía usuario real sembrado (no `service_role`).
- Riesgo: inconsistencia entre evento y kilometraje. Control: contrato atómico/coordinado obligatorio y prueba de fallo parcial.
- Riesgo: la regla de matrícula cambia en producto. Control: unicidad por hogar (`unique (household_id, matricula)`) ya fijada en la migración; cambiarla requeriría nueva migración y decisión SDD.
- Riesgo: credencial del adaptador MVP frente a RLS (`auth.uid()`). Control: resuelto — usuario `auth.users` real sembrado por bootstrap server-only + login server-side (tarea 9); `service_role` descartado. RLS sigue como frontera real.
- Riesgo: `npm test` está configurado pero el repo es greenfield. Control: PR 1 crea runner antes de implementar lógica.
