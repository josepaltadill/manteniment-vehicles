# Plan de tareas: modularización de la aplicación familiar

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1.400 líneas entre TypeScript, SQL, pruebas, scripts y documentación |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → frontera del núcleo y composición; PR 2 → migración SQL y evidencia; PR 3 → consumidores `fam_*`, bootstrap y validación RLS; PR 4 → documentación y sincronización de specs |
| Delivery strategy | ask-on-risk |
| Chain strategy | `feature-branch-chain` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Reglas de ejecución

- Aplicar cada unidad como un work unit revisable, conservando código y pruebas relacionadas en la misma unidad.
- No activar una unidad que deje consumidores productivos incompatibles con el esquema que vaya a recibir la siguiente unidad; los PR 2 y 3 se revisan por separado, pero se despliegan como una única ventana coordinada.
- Usar `npm test` en cada ciclo RED → GREEN → TRIANGULATE → REFACTOR. Los tests de PostgreSQL/RLS deben usar una base efímera o esquema de prueba aislado, nunca la instancia Supabase compartida sin preflight explícito.
- Mantener `household_id`, `p_household_id` y `householdId` en este cambio. No introducir `hogar_id` como refactor lateral.
- No usar `drop`, `truncate`, reset global, copia destructiva, puente/alias/vista `mv_*`, `service_role` en runtime ordinario ni cambios de producto fuera de las specs.

## PR 1 — Frontera del núcleo y composición

**Inicio:** el código sigue resolviendo identidad/bootstrap desde `src/modulos/vehiculos/**` y no existe un alcance familiar por solicitud. **Fin:** el núcleo puede resolver el contexto server-side y vehículos lo consume sin importar su persistencia ni resolver identidad de nuevo. **Rollback:** revertir los movimientos de archivos y el adaptador de composición sin tocar el esquema Supabase.

### RED

- [x] Añadir pruebas de frontera en `src/compartido/pruebas/` o el directorio de tests existente que fallen si `src/nucleo-familiar/**` importa `src/modulos/vehiculos/**`, si un componente cliente importa adaptadores Supabase o si cualquier elemento bajo `src/modulos/vehiculos/**` resuelve identidad. <!-- sdd-owner: implementation -->
- [x] Añadir pruebas de composición para sesión ausente, cero membresías, múltiples membresías y contexto único en torno a `src/composicion/servidor/alcance-familiar-por-solicitud.ts`. <!-- sdd-owner: implementation -->

### GREEN

- [x] Crear o mover contratos, roles, `ContextoAplicacion`, `ProveedorIdentidad`, `resolver-acceso-familiar` y errores de acceso a `src/nucleo-familiar/dominio/` y `src/nucleo-familiar/aplicacion/`, preservando el fallo cerrado definido en `specs/app-familiar-core/spec.md`. <!-- sdd-owner: implementation -->
- [x] Mover los adaptadores de identidad, bootstrap, preflight y operaciones PostgreSQL a `src/nucleo-familiar/adaptadores/` y actualizar `scripts/bootstrap-admin.ts` sin ampliar la allowlist administrativa. <!-- sdd-owner: implementation -->
- [x] Implementar `src/composicion/servidor/alcance-familiar-por-solicitud.ts` como módulo server-only que cree el cliente SSR, resuelva una sola vez el contexto y devuelva un alcance inmutable a vehículos. <!-- sdd-owner: implementation -->
- [x] Ajustar `src/modulos/vehiculos/**` y su composición para recibir el alcance familiar mediante un puerto estable, sin consultar membresías ni aceptar un hogar del cliente. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Ejecutar `npm test` y añadir casos que comprueben que URL, formulario, cookie, cabecera o parámetro `household_id` no sustituyen el contexto resuelto por el servidor. <!-- sdd-owner: implementation -->
- [x] Verificar mediante búsqueda de imports y tests que el núcleo no depende de vehículos, que el cliente no importa adaptadores y que el runtime ordinario no usa `service_role`. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Consolidar nombres y paths según las convenciones existentes, preservar renames/historial cuando sea posible y eliminar duplicaciones de resolución sin cambiar casos de uso del MVP. <!-- sdd-owner: implementation -->

## PR 2 — Migración SQL atómica y evidencia de corte

**Inicio:** los objetos `mv_*` son el contrato activo y no existe una migración de corte. **Fin:** una migración versionada y transaccional puede renombrar los cinco objetos al contrato final, actualizar dependencias y abortar ante precondiciones inseguras. **Rollback:** antes de escrituras `fam_*`, rollback transaccional o migración inversa ensayada; después del punto de no retorno, solo fix-forward documentado.

### RED

- [x] Crear pruebas de integración en `supabase/validation/` o el harness PostgreSQL existente que apliquen DDL histórico en una base efímera y fallen al exigir `fam_hogares`, `fam_miembros_hogar`, `fam_roles_plataforma`, `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo` con los mismos UUIDs, filas y relaciones. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de atomicidad observable que fallen si un lector/escritor concurrente ve una mezcla de objetos `mv_*`/`fam_*`, si el orden de locks permite deadlock, o si `lock_timeout`/`statement_timeout` deja renombres parciales en lugar de rollback completo. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de preflight que fallen ante objetos `fam_*` conflictivos, consumidores externos `mv_*` no clasificados, invariantes rotas, backup no recuperable o dependencias de catálogo no inventariadas. <!-- sdd-owner: implementation -->
- [ ] Añadir casos de rollback/fix-forward que documenten el punto de no retorno y comprueben que la recuperación no borra, reasigna ni abre permisos inciertos. <!-- sdd-owner: implementation -->

### GREEN

- [x] Añadir `supabase/migrations/<timestamp>_family_app_modularization.sql` con una única transacción, locks en orden fijo, timeouts configurables y renombrado no destructivo de las cinco tablas. <!-- sdd-owner: implementation -->
- [ ] Actualizar dentro de la migración los cuerpos y nombres de funciones, constraints, índices, triggers y policies al prefijo propietario `fam_*`; verificar propietarios, revocaciones y grants existentes sin tratarlos como objetos renombrables, conservando `household_id`/`p_household_id` y sin crear compatibilidad `mv_*`. <!-- sdd-owner: implementation -->
- [ ] Implementar el preflight y la evidencia operativa en los scripts/SQL existentes bajo `supabase/validation/` y `scripts/`, incluyendo backup restaurable, OID/definiciones, conteos, UUIDs, relaciones, RLS, jobs, webhooks y consumidores externos. <!-- sdd-owner: implementation -->
- [ ] Añadir aserciones dentro y después de la migración para rechazar tablas/objetos productivos `mv_*`, exigir las cinco tablas finales, RLS habilitado y dependencias esenciales completas. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Ejecutar `npm test` y la validación PostgreSQL sobre datos vacíos, datos existentes con histórico y datos inesperados válidos; comparar filas, UUIDs, relaciones, unicidad de matrícula por hogar incluidos inactivos y eventos no huérfanos. <!-- sdd-owner: implementation -->
- [ ] Ejecutar la prueba concurrente de corte con una sesión lectora/escritora bloqueada, un escenario de lock contention y un timeout forzado, demostrando que otros consumidores observan solo el contrato anterior completo o el contrato final completo. <!-- sdd-owner: implementation -->
- [ ] Verificar catálogo `pg_class`, `pg_constraint`, `pg_proc`, `pg_trigger`, `pg_policy`, grants y dependencias para distinguir archivos históricos permitidos de referencias productivas activas. <!-- sdd-owner: implementation -->
- [ ] Ensayar la migración en entorno aislado con fallo antes y después del commit, dejando evidencia del procedimiento y de la decisión rollback/fix-forward. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Hacer la migración determinista, explícita y revisable; parametrizar solo valores operativos que dependan del entorno y documentar el punto de no retorno en `docs/general/persistencia-y-migraciones.md` cuando esa documentación se cree en PR 4. <!-- sdd-owner: implementation -->

## PR 3 — Consumidores `fam_*`, bootstrap y validación de seguridad

**Dependencia:** PR 1 revisado y PR 2 aprobado como migración; no desplegar aisladamente. **Inicio:** runtime, bootstrap, fixtures y harness apuntan a `mv_*`. **Fin:** todos los consumidores activos usan el contrato final y la matriz de seguridad demuestra equivalencia funcional. **Rollback:** revertir código solo antes de activar `fam_*`; después, aplicar fix-forward y mantener tráfico cerrado si falla una comprobación.

### RED

- [x] Cambiar primero las expectativas de tablas en tests de `src/modulos/vehiculos/**`, `src/nucleo-familiar/**`, `src/compartido/pruebas/**`, `scripts/` y `supabase/validation/` para que fallen contra `mv_*` y exijan `fam_*`. <!-- sdd-owner: implementation -->
- [ ] Añadir pruebas de integración de repositorios para matrícula única por hogar incluyendo inactivos, FK compuesta, eventos cruzados, kilometraje, baja lógica, coste, año, fechas, estados, valores negativos/límite y vencimientos usando `fam_ve_*` con reloj/zonahoraria inyectados. <!-- sdd-owner: implementation -->

### GREEN

- [x] Actualizar `ProveedorIdentidadSupabaseServidor` y consultas de membresías a `fam_miembros_hogar`, manteniendo `auth.getUser()`, cardinalidad única y errores controlados. <!-- sdd-owner: implementation -->
- [x] Actualizar repositorios y mapeadores bajo `src/modulos/vehiculos/adaptadores/supabase/` a `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo`, sin cambiar reglas del dominio. <!-- sdd-owner: implementation -->
- [x] Actualizar `bootstrap-preflight.ts`, `OperacionesBootstrapPostgres`, runner y pruebas de `scripts/bootstrap-admin.ts` a `fam_hogares`, `fam_miembros_hogar` y `fam_roles_plataforma`, manteniendo idempotencia y abortos ante conflicto. <!-- sdd-owner: implementation -->
- [x] Actualizar fixtures, cleanup, smoke tests y `scripts/validate-supabase-rls.sh` para el contrato final, con allowlist mínima y explícita para migraciones/historiales no productivos. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Ejecutar `npm test` y la matriz RLS para anónimo, no miembro, `editor`, `admin`, rol de plataforma, acceso cruzado y operaciones de vehículos; incluir prueba concurrente del último administrador. <!-- sdd-owner: implementation -->
- [x] Verificar bootstrap repetido, identidad ambigua, membresía duplicada, cero/múltiples membresías, UUID inválido y que ningún runtime ordinario obtiene credenciales `service_role`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar smoke end-to-end de alta, listado, desactivación, eventos, costes, kilometraje y vencimientos; comprobar que los datos históricos permanecen accesibles. <!-- sdd-owner: implementation -->
- [x] Ejecutar búsqueda final en código, configuración activa, scripts, validaciones y catálogo para demostrar que no quedan referencias productivas finales a `mv_*`. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Eliminar duplicaciones y adaptar nombres de módulo/núcleo sin traducir masivamente `household_id`/`householdId` ni introducir dependencias de vehículos en el núcleo. <!-- sdd-owner: implementation -->

## PR 4 — Documentación y preparación de sincronización/archivo

**Inicio:** reglas comunes y de vehículos están dispersas y las specs canónicas nuevas aún no están sincronizadas. **Fin:** documentación navegable separada y checklist de archivo preparado; el historial archivado permanece intacto. **Rollback:** revertir solo archivos documentales nuevos o reorganizados, sin alterar migraciones históricas.

### RED

- [ ] Añadir un check de enlaces, ubicación y referencias que use `docs/general/README.md` y `docs/modulos/vehiculos/README.md` como índices fuente: debe fallar si una regla transversal indexada como común aparece reescrita bajo `docs/modulos/vehiculos/` en vez de enlazada, o si una regla indexada como específica de vehículos queda fuera de esa carpeta. <!-- sdd-owner: implementation -->
- [ ] Añadir un check que distinga referencias históricas permitidas a `mv_*` de referencias productivas en documentación operativa y specs nuevas. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Crear `docs/general/README.md`, `docs/general/arquitectura.md`, `docs/general/acceso-y-seguridad.md`, `docs/general/persistencia-y-migraciones.md` y `docs/general/despliegue-y-recuperacion.md` con decisiones al inicio, camino rápido, checklists y enlaces cruzados. <!-- sdd-owner: implementation -->
- [ ] Crear `docs/modulos/vehiculos/README.md`, `docs/modulos/vehiculos/dominio-y-casos-de-uso.md` y `docs/modulos/vehiculos/persistencia.md`, enlazando las reglas comunes sin duplicar RLS, bootstrap o recuperación. <!-- sdd-owner: implementation -->
- [ ] Actualizar `supabase/migrations/README.md` y `openspec/contexto-proyecto.md` para enlazar la guía general sin mantener instrucciones contradictorias. <!-- sdd-owner: implementation -->
- [ ] Preparar la sincronización de `openspec/specs/app-familiar-core/spec.md` y `openspec/specs/modulo-vehiculos/spec.md` con el contrato `fam_*` y el comportamiento heredado, sin modificar specs archivadas. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Ejecutar `npm test` y los checks documentales; revisar que cada requisito de las dos specs nuevas tenga una ubicación de implementación, prueba o evidencia operativa. <!-- sdd-owner: implementation -->
- [ ] Revisar explícitamente que no se documenten ni implementen notas, cesta, multi-hogar, nuevas capacidades de plataforma, OCR, IA, adjuntos, notificaciones o dashboard avanzado. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Reducir duplicación documental, mantener una única fuente para reglas transversales y dejar en el checklist de archivo la publicación de las dos specs canónicas y la preservación del historial. <!-- sdd-owner: implementation -->

## Gate de activación coordinada

- [x] Antes de apply, decidir y registrar `stacked-to-main` o `feature-branch-chain`; decisión: `feature-branch-chain`. <!-- sdd-owner: parent -->
- [ ] Antes de la ventana de corte, confirmar backup restaurable, pausa de tráfico/jobs, ausencia de consumidores externos no explicados, límites de locks/timeouts y plan de rollback/fix-forward. <!-- sdd-owner: parent -->
- [ ] Activar esquema y consumidores como una única release coordinada: ningún PR intermedio se despliega contra el contrato equivocado. <!-- sdd-owner: parent -->
- [ ] Tras aplicar PR 2 y PR 3, ejecutar la evidencia post-corte completa y no reabrir tráfico hasta superar RLS, relaciones, bootstrap, smoke y búsqueda de `mv_*`. <!-- sdd-owner: parent -->
- [ ] Durante la ventana posterior al corte, vigilar errores de resolución de contexto, fallos RLS/SQLSTATE de permisos, errores bootstrap/preflight y latencia de operaciones familiares críticas; si superan el umbral acordado, cerrar tráfico y ejecutar fix-forward. <!-- sdd-owner: parent -->

## Mapeo de cobertura

| Fuente | Cobertura en tareas |
|---|---|
| `app-familiar-core`: frontera núcleo/vehículos y roles separados | PR 1 RED/GREEN; TRIANGULATE de imports y composición |
| `app-familiar-core`: identidad server-side, cero/múltiples membresías y fallo cerrado | PR 1 GREEN/TRIANGULATE; PR 3 TRIANGULATE |
| `app-familiar-core`: bootstrap, último admin y RLS | PR 2 TRIANGULATE; PR 3 GREEN/TRIANGULATE |
| `app-familiar-core`: contrato final, migración no destructiva, preflight y recuperación | PR 2 completo; Gate de activación |
| `app-familiar-core`: documentación, límites de producto e historial | PR 4 completo |
| `modulo-vehiculos`: consumo del contexto sin confianza del cliente | PR 1 GREEN/TRIANGULATE |
| `modulo-vehiculos`: tablas `fam_ve_*`, integridad y aislamiento | PR 2 GREEN/TRIANGULATE; PR 3 RED/GREEN/TRIANGULATE |
| `modulo-vehiculos`: alta, listado, baja lógica, eventos, costes, kilometraje y vencimientos | PR 3 RED/TRIANGULATE |
| `modulo-vehiculos`: conservación MVP y documentación específica | PR 3 TRIANGULATE; PR 4 completo |

## Definición de terminado

- [ ] Todas las tareas RED/GREEN/TRIANGULATE/REFACTOR están verificadas con `npm test` y evidencia específica cuando aplique. <!-- sdd-owner: implementation -->
- [ ] El contrato final contiene exactamente las cinco tablas `fam_*`, conserva `household_id`, datos, relaciones, RLS, grants y la invariante del último administrador, sin consumidores productivos `mv_*`. <!-- sdd-owner: implementation -->
- [ ] La activación coordinada y la recuperación están aprobadas por el responsable del cambio antes de ejecutar el corte compartido. <!-- sdd-owner: parent -->
- [ ] La sincronización/archivo publica las dos specs canónicas sin reescribir el historial archivado. <!-- sdd-owner: parent -->
