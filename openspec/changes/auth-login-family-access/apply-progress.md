# Progreso de aplicación: auth-login-family-access

## Estado

**PR 1 parcialmente aplicado; pendiente de evidencia runtime de RLS.**

El estado nativo autoritativo consumido antes de editar fue `applyState: ready`, `nextRecommended: apply`, sin bloqueos y con `actionContext.mode: repo-local`, `workspaceRoot: /home/josep/proyectos/manteniment-vehicles` y ese mismo directorio como único `allowedEditRoot`. Tras esta ejecución queda una tarea PR 1 sin marcar; no se inició PR 2.

## Historial preservado

El intento anterior se bloqueó antes de editar porque `tasks.md` no tenía casillas Markdown. Ese impedimento fue corregido antes de esta ejecución; no hubo cambios de código en el intento previo.

## Trabajo completado (PR 1)

- [x] RED/GREEN de la migración `mv_platform_roles`: tabla aditiva con FK a `auth.users`, constraint `rol = 'superadmin'`, timestamp, RLS y revocación total para `anon` y `authenticated`.
- [x] Ampliación de la matriz SQL y del harness para incluir la migración nueva y comprobar denegación de `mv_platform_roles` para anon, no-miembro, editor A y admin B.
- [x] RED/GREEN del contrato de bootstrap: `--check` por defecto, UUID Auth obligatorio, destino exacto `Familia Altadill`, JSON de plan sin secretos y `--apply` con `--confirm` obligatorio.
- [x] Preflight server-only que inspecciona únicamente el hogar destino y hogares vinculados al UUID Auth, incluyendo conteos de vehículos/eventos.
- [x] Planificador no destructivo: no-op idempotente, creación limpia, renombrado explícitamente confirmado conservando UUID, y conflictos para destino ambiguo, membresía inesperada o varios candidatos.
- [x] Documentación de backup, preflight, plan, apply bloqueado deliberadamente, recuperación y rollback.

## Tareas persistidas

Marcadas `[x]` en `tasks.md`:

- RED — contrato de migración y RLS.
- GREEN — migración aditiva.
- RED — contrato del bootstrap.
- GREEN — preflight y plan no destructivo.
- TRIANGULATE — escenarios de datos existentes.
- REFACTOR — límites administrativos.

Pendiente, conservada como `[ ]`:

- [ ] **TRIANGULATE — verificación de aislamiento.** Ejecutar las assertions con usuario anónimo, usuario autenticado sin membresía y miembros de dos familias; demostrar que la tabla de plataforma no concede acceso familiar y que el acceso cruzado sigue bloqueado.

## Archivos cambiados

- `supabase/migrations/20260712000000_mv_platform_roles.sql`
- `supabase/validation/assertions.sql`
- `scripts/validate-supabase-rls.sh`
- `src/compartido/pruebas/validate-supabase-rls.test.ts`
- `src/modulos/vehiculos/adaptadores/supabase/bootstrap-{cli,plan,preflight}.{ts,test.ts}`
- `src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres.ts`
- `scripts/bootstrap-admin.ts`
- `supabase/migrations/README.md`
- `openspec/changes/auth-login-family-access/{tasks,apply-progress}.md`

## Verificación

- `npm test -- src/compartido/pruebas/validate-supabase-rls.test.ts src/modulos/vehiculos/adaptadores/supabase/bootstrap-servidor.test.ts src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres.test.ts src/modulos/vehiculos/adaptadores/supabase/seguridad-servidor.test.ts` → 96 passing.
- Focused RED/GREEN tests for `bootstrap-plan`, `validate-supabase-rls`, `bootstrap-cli` and `bootstrap-preflight` → passing after their implementations.
- `npm test -- ...bootstrap-cli... ...bootstrap-plan... ...bootstrap-preflight... ...operaciones-bootstrap-postgres... ...validate-supabase-rls... && npm run build` → 86 passing; build passed.
- `npm test` → 282 passing, 15 skipped.
- `./scripts/validate-supabase-rls.sh` → **not completed**: preflight passed (local Unix Docker endpoint, Supabase CLI 2.109.1, Docker 29.3.1), but `supabase start --workdir` failed before any SQL/fixtures/assertions ran. The harness preserved its restricted workspace and reported no SQL evidence. No production or external target was contacted.

## TDD Cycle Evidence

| Task | Test file/layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Migración/RLS | `validate-supabase-rls.test.ts` + SQL harness / unit+runtime | 96 passing | Missing migration failed | Static contract passed | Runtime blocked before SQL | Harness loads all migrations; matrix extended |
| Bootstrap plan | `bootstrap-plan.test.ts` / unit | N/A (new) | Missing module failed | 6 passing | clean, no-op, rename and 3 conflict variants | Pure plan module |
| Bootstrap CLI | `bootstrap-cli.test.ts` / unit | N/A (new) | Missing module failed | 4 passing | check/apply, UUID and secret-free output paths | CLI parsing isolated |
| Bootstrap preflight | `bootstrap-preflight.test.ts` / unit | N/A (new) | Missing module failed | 1 passing | DB row maps counts and membership | Query isolated server-only |

## Desviaciones y riesgos

- `--apply --confirm` validates the explicit intent but intentionally terminates without mutation. A reviewed transactional apply runner remains required before a real data operation; this prevents automatic reassignment, promotion, deletion or rename.
- Runtime RLS validation is blocked by local Supabase startup. Resolve that environment failure and rerun `./scripts/validate-supabase-rls.sh` before marking the remaining TRIANGULATE task complete or moving to verification.
- Runtime login/session/UI behavior remains untouched, as required for PR 1.

## Workload / PR boundary

- Delivery: chained PRs, `stacked-to-main`.
- Current boundary: **PR 1 only — Modelo de plataforma, RLS y bootstrap seguro**.
- PR 2 was not started.
- Current implementation estimate: 336 additions + 35 deletions = 371 changed lines (within the 400-line target).
- Final native status: `applyState: ready`, 6/7 complete, one unchecked runtime-isolation task, `nextRecommended: apply`.
- No commit, push or PR was created.

## Addendum: runtime RLS TRIANGULATE completado

La tarea pendiente de verificación runtime se completó después de diagnosticar el fallo de arranque local:

- Causa: el workspace efímero usaba el puerto Kong por defecto `54321`, ocupado por el stack Supabase local `manteniment-vehicles`.
- Fix de harness: `supabase/validation/config.toml` fija ahora `[api].port = 54331` además de `[db].port = 54329`, evitando colisión con el stack local existente.
- Evidencia: `./scripts/validate-supabase-rls.sh` completó con `SUMMARY|status=PASS|passed=3|failed=0|blocked=0|concurrency=passed`.
- La ejecución aplicó migraciones, fixtures, matriz secuencial RLS y prueba de concurrencia; el runtime efímero fue detenido y el workspace eliminado con `PASS|cleanup|owned-runtime-stopped-and-workspace-removed`.

Tarea marcada `[x]` en `tasks.md`:

- TRIANGULATE — verificación de aislamiento.

Estado PR 1: implementación completa para el alcance definido. PR 2 no fue iniciado.

## Addendum: corrección de bloqueadores de revisión

- Se restauró el contrato histórico de `npm run bootstrap:admin`: sin flags ejecuta la siembra de desarrollo existente, por lo que `npm run dev:local` conserva su comportamiento. El preflight/plan es opt-in con `--check` (o `--apply`, que continúa bloqueado sin mutar).
- El runner de preflight reutiliza `SUPABASE_BOOTSTRAP_CONNECT_TIMEOUT_MS`, `SUPABASE_BOOTSTRAP_CONNECT_RETRIES` y `SUPABASE_BOOTSTRAP_CONNECT_BACKOFF_MS` mediante el mismo parser que la siembra.
- El test de proceso ya no depende de una base real para verificar el routing por defecto y el modo `--check`; la integración destructiva real continúa condicionada a una URL local explícita.
- La matriz RLS demuestra denegación SELECT/INSERT/UPDATE/DELETE de `mv_platform_roles` para `authenticated`, y el preflight del harness comprueba las tres migraciones que concatena.
- RED observado: el test de proceso recibió el error de UUID del preflight al invocar sin flags; los contratos estáticos fallaron por faltar las tres mutaciones RLS y el preflight de la migración intermedia.
- GREEN: `npx vitest run src/modulos/vehiculos/adaptadores/supabase/bootstrap-admin-runner.integration.test.ts src/modulos/vehiculos/adaptadores/supabase/bootstrap-cli.test.ts src/modulos/vehiculos/adaptadores/supabase/operaciones-bootstrap-postgres.test.ts src/compartido/pruebas/validate-supabase-rls.test.ts` → 81 passing, 3 skipped; `npm test` → 284 passing, 15 skipped.

## Addendum: PR 2 — sesión SSR, login y frontera web (parcial)

### Estado y frontera

- Estado estructurado consumido: `applyState: ready`, `nextRecommended: apply`, dependencias de apply listas, sin `blockedReasons`; `workspaceRoot` y único `allowedEditRoot`: `/home/josep/proyectos/manteniment-vehicles`.
- Delivery: `auto-chain`, `stacked-to-main`; límite actual: **PR 2 solamente**. No se inició PR 3 ni PR 4, y no hubo commit, push, PR ni revisión.
- Resultado: seis tareas PR 2 se completaron y se marcaron `[x]`; queda bloqueada la tarea final de TRIANGULATE/REFACTOR por restos de la identidad temporal que pertenecen a PR 3.

### Trabajo completado y casillas persistidas

- [x] RED/GREEN de cliente SSR por solicitud con `@supabase/ssr`, adaptador de cookies y configuración runtime limitada a URL y anon key.
- [x] RED/GREEN de login/logout: `signInWithPassword`, validación posterior con `auth.getUser()`, mensaje no enumerativo, cierre ante identidad no validada y allowlist de `next` limitada a `/vehiculos`.
- [x] RED/GREEN de frontera web: matcher para `/`, `/vehiculos/**` y subrutas; `src/proxy.ts` redirige al anónimo antes del render/repositorios y conserva cookies SSR; se añadió el estado seguro `/acceso-no-disponible` con logout.

### Archivos cambiados

- `package.json`, `package-lock.json`
- `src/compartido/infraestructura/{entorno,entorno.test}.ts`
- `src/compartido/infraestructura/supabase/{cliente-supabase-ssr,cliente-supabase-ssr.test,rutas-protegidas,rutas-protegidas.test}.ts`
- `src/app/login/{acciones,acciones.test,page}.ts(x)`
- `src/app/acceso-no-disponible/page.tsx`
- `src/proxy.ts`
- `openspec/changes/auth-login-family-access/{tasks,apply-progress}.md`

### Verificación y TDD

- RED: `npm test -- src/compartido/infraestructura/supabase/cliente-supabase-ssr.test.ts` falló por módulo ausente.
- GREEN: `npm test -- src/compartido/infraestructura/entorno.test.ts src/compartido/infraestructura/supabase/cliente-supabase-ssr.test.ts` → 8 passing.
- RED: `npm test -- src/app/login/acciones.test.ts` falló por módulo ausente.
- GREEN: `npm test -- src/app/login/acciones.test.ts` → 9 passing.
- RED: `npm test -- src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` falló por módulo ausente.
- GREEN: focused suite `acciones`, `rutas-protegidas`, `cliente-supabase-ssr`, `entorno` → 26 passing.
- REFACTOR/build: el primer `npm run build` reveló que un archivo con `'use server'` a nivel de módulo no puede exportar helpers síncronos; se movió la directiva a las dos Server Actions. El siguiente build reveló el import de tipo incorrecto de `SupabaseClient`; se corrigió a `@supabase/supabase-js`. `npm run build` final pasó.
- Safety net final: `npm test` → 305 passing, 15 skipped. `npm run build` → passed.
- Inspección: no aparece `getSession(`, `unstable_cache` ni `cache(` en `src/app`, `src/compartido` ni `src/proxy.ts`.

### TDD Cycle Evidence

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Cliente SSR/entorno | módulo ausente | factory y entorno runtime: 8 tests focused | cookies por solicitud | `server-only` y tipo cliente corregido |
| Login/logout | módulo ausente | 9 tests de credenciales, `getUser`, sign-out y `next` | destinos privados/nulos/absolutos | Server Action directives a nivel de función |
| Frontera web | módulo ausente | 26 tests focused incluyendo matcher y redirect | rutas `/`, `/vehiculos/**` | build TypeScript completo |

### Bloqueador y tareas restantes

La inspección de producción completa aún encuentra `VEHICULOS_ACCESS_TOKEN` en `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts` y `SUPABASE_HOUSEHOLD_ID_DESARROLLO`/credenciales bootstrap en la configuración y composición temporal. Eliminarlos requiere sustituir la composición y el proveedor de identidad por resolución de membresía real, que es explícitamente el alcance de PR 3. Por ello no se marca como completa:

- [x] **TRIANGULATE/REFACTOR — sesiones inválidas.** Cubrir token caducado, cookie manipulada y cierre de sesión; revisar que no exista cache global, `getSession()` no autorice y los mensajes no enumeren cuentas/familias.

No hubo desviaciones funcionales: la única corrección técnica fue convertir `'use server'` en directivas de función para cumplir Next.js 16.

## Addendum: PR 2 retry — TRIANGULATE/REFACTOR completed

### Status / boundary

- Consumed authoritative status from the parent: `applyState: ready`, `nextRecommended: apply`, no `blockedReasons`; `actionContext.mode: repo-local`, authoritative workspace `/home/josep/proyectos/manteniment-vehicles` and that same allowed edit root.
- Delivery remains `auto-chain` / `stacked-to-main`. This retry changed **PR 2 only**; PR 3 composition/membership-resolution work was deliberately not touched.
- The temporary `VEHICULOS_ACCESS_TOKEN` and `SUPABASE_HOUSEHOLD_ID_DESARROLLO` references remain exclusively an explicit PR 3 concern. The PR 2 static inspection is intentionally scoped to its allowed runtime/navigation files, where neither reference, global cache nor `getSession()` authorization occurs.

### Completed persisted task

- [x] **TRIANGULATE/REFACTOR — sesiones inválidas.** Added server-response authorization coverage for expired JWT and manipulated-cookie failures, including a stale-user-shaped response; only a current `auth.getUser()` response with no error authorizes protected navigation.
- Updated the corresponding checkbox in both `openspec/changes/auth-login-family-access/tasks.md` and the Engram `sdd/auth-login-family-access/tasks` artifact.

### Files changed in this retry

- `src/compartido/infraestructura/supabase/rutas-protegidas.ts`
- `src/compartido/infraestructura/supabase/rutas-protegidas.test.ts`
- `src/proxy.ts`
- `openspec/changes/auth-login-family-access/{tasks,apply-progress}.md`

### Verification

- Safety net: `npm test -- src/app/login/acciones.test.ts src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` → 18 passing.
- RED: after adding the expired-token, manipulated-cookie and validated-session cases, `npm test -- src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` failed with `TypeError: sesionPermiteRutaProtegida is not a function` (3 failures).
- GREEN/TRIANGULATE: `npm test -- src/compartido/infraestructura/supabase/rutas-protegidas.test.ts src/app/login/acciones.test.ts` → 21 passing.
- Scoped static inspection: `rg -n "getSession\\(|unstable_cache|\\bcache\\(|VEHICULOS_ACCESS_TOKEN|SUPABASE_HOUSEHOLD_ID_DESARROLLO" src/app src/compartido/infraestructura/supabase src/proxy.ts` → no matches.
- Full suite: `npm test` → 308 passing, 15 skipped.
- Production build: `npm run build` → passed.

### TDD Cycle Evidence

| Task | Test file/layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Invalid/expired/manipulated session navigation | `src/compartido/infraestructura/supabase/rutas-protegidas.test.ts` / unit | 18 passing | New helper absent: 3 failures | 21 focused passing | expired JWT, invalid JWT/cookie and current validated user cases | Extracted the narrow session decision into the existing route-boundary module; proxy consumes it |

### Remaining work / next boundary

- No unchecked PR 2 implementation task remains.
- PR 3 remains the next chained work unit: replace temporary identity/composition with server-side membership resolution and remove the temporary token/seeded-household runtime references from that PR 3-owned graph.
- No commit, push, PR, or review was created.

## Addendum: bounded correction for review `review-ff37a789974c2ece`

Addressed `RELIABILITY-001` / `RESILIENCE-001`, `RELIABILITY-002`, and `RESILIENCE-002` without entering PR 3 scope:

- Runtime environment loading now reads only `SUPABASE_URL` and `SUPABASE_ANON_KEY`; unrelated bootstrap and temporary-household variables may coexist in `process.env`.
- The proxy contract test exercises an anonymous protected request end-to-end across redirect construction and refreshed-cookie propagation.
- Transient identity failures (rate limiting, server/unavailable statuses and retryable transport failures) route to `/acceso-no-disponible`; invalid credentials retain one non-enumerative login error. Defensive sign-out failure does not replace the original unavailable state.
- RED observed: 6 focused failures for environment/error classification, 1 proxy unavailable-routing failure, and 1 defensive sign-out failure.
- GREEN: focused auth/runtime suite passed 36 tests; `npm test` passed 315 tests with 15 skipped; `npm run build` passed.
