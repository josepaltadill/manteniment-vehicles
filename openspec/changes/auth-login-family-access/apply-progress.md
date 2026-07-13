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

## PR 3 complete — server-side membership resolution and temporary identity removal

### Status / boundary

- Consumed parent status: native `applyState: all_done` is non-authoritative for this execution because PR 3/PR 4 were numbered tasks rather than checkboxes. The PR 3 section in `tasks.md` was the authoritative scope.
- Delivery: `auto-chain` / `stacked-to-main`; current work unit **PR 3 only**. No PR 4 local activation, documentation, admin UI, family selection, commit, push or PR was created.
- `actionContext` was not supplied as structured JSON. Warning recorded: edits were limited to the explicitly delegated repository `/home/josep/proyectos/manteniment-vehicles` and its OpenSpec change directory.

### Completed persisted checkboxes

- [x] RED — unión discriminada.
- [x] GREEN — resolver y proveedor.
- [x] RED — composición real.
- [x] GREEN — composición y contexto.
- [x] RED/GREEN — rutas y aislamiento.
- [x] TRIANGULATE — RLS A/B.
- [x] REFACTOR — inventario de entradas.

### Implementation

- `ProveedorIdentidadSupabaseServidor` now validates identity only with `auth.getUser()`, reads `household_id, rol` for that user under RLS, and limits the query to two rows. Only exactly one valid UUID/role membership grants `ContextoAplicacion`; anonymous, zero, multiple, invalid and persistence-failure states fail closed.
- `exigirContextoFamiliar` translates anonymous access to `/login` and every non-family state to `/acceso-no-disponible` before repositories are composed.
- Server composition now creates one SSR cookie client per request and shares it between resolver and repositories. It no longer imports bootstrap login, the seeded household, temporary identity or the header token.
- Root, both previously unguarded vehicle form routes, every data page and every vehicle/event Server Action reach the composition guard. Repositories retain explicit `householdId` arguments.

### Files changed

- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.{ts,test.ts}`
- `src/modulos/vehiculos/aplicacion/{puertos/proveedor-identidad.ts,servicios/resolver-acceso-familiar.ts}`
- `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.{ts,test.ts}`
- `src/compartido/infraestructura/entorno.ts`
- `src/app/page.tsx`
- `src/app/vehiculos/{nuevo/page.tsx,[vehiculoId]/eventos/nuevo/page.tsx}`
- `openspec/changes/auth-login-family-access/{tasks,apply-progress}.md`

### TDD Cycle Evidence

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Membership union/provider | `resolverAcceso` absent: 3 focused failures | 3 focused tests pass | anonymous, zero, one, two, invalid UUID/role and DB error; query limited to 2 | discriminated outcome, no raw Supabase error/identity values exposed |
| Request composition | old header path failed because mocked `headers` was no longer part of the new contract | SSR composition focused test passes | one SSR client is shared with resolver/repositories; protected pages/actions inventory verified | removed token comparison, bootstrap client and temporary provider from runtime composition |
| App Router boundary | build initially exposed static prerendering of guarded routes without runtime config | `dynamic = 'force-dynamic'` and build pass | root plus all vehicle pages/actions use composition | guard stays centralized and repositories preserve explicit household filters |

### Verification

- RED: `npm test -- src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts` -> 3 failures (`resolverAcceso is not a function`).
- RED: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts` -> failure on the old `headers`/token path.
- GREEN: `npm test -- src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts` -> 4 passing.
- Final: `npm test` -> 321 passing, 15 skipped.
- Final: `npm run build` -> passed; `/`, `/vehiculos`, `/vehiculos/nuevo` and event-new routes are dynamic.
- Runtime RLS: `./scripts/validate-supabase-rls.sh` -> `SUMMARY|status=PASS|passed=3|failed=0|blocked=0|concurrency=passed`; non-member access and A/B cross-household reads/writes remained denied.
- Static inventory: runtime sources under `src/app`, vehicle composition and real identity adapter contain no `ProveedorIdentidadTemporal`, `x-vehiculos-access-token`, `VEHICULOS_ACCESS_TOKEN` or `SUPABASE_HOUSEHOLD_ID_DESARROLLO`. Test doubles retain `ProveedorIdentidadTemporal` only for domain unit tests.
- `git diff --check` -> passed. Source/test implementation is exactly 400 changed lines including the new resolver (OpenSpec artifacts excluded from the review work-unit budget).

### Deviations / risks / remaining work

- No functional design deviation. The root remains its existing protected landing content rather than redirecting to `/vehiculos`; it receives the same authoritative family guard first.
- The RLS harness validates database A/B isolation with real local roles; it does not exercise a browser cookie/JWT through Next.js end-to-end. Unit coverage verifies the SSR client and resolver contract.
- No unchecked PR 3 task remains. PR 4 remains the next chained work unit; its numbered tasks are deliberately untouched.

## PR 3 verification-blocker remediation

### Scope and implementation

- The guard-resolved `ContextoAplicacion` is now captured once by server composition and exposed through a request-scoped resolved identity provider. Subsequent use-case calls reuse that exact object and cannot rerun `auth.getUser()` or the membership cardinality query.
- Composition tests prove denial occurs before repository construction/data access, multiple operations in one request keep one resolution, and extra attacker-controlled actor/household fields cannot override the server household passed to repositories.
- The real provider test now covers `auth.getUser()` failure and proves no membership query occurs in that state. Existing cases continue to cover anonymous, zero/one/multiple memberships, invalid UUID/role and database failure.
- `SUPABASE_HOUSEHOLD_ID_DESARROLLO` and `householdIdDesarrollo` were removed from the shared/runtime environment graph and its fixtures. PR 4 activation/scripts/docs remain untouched.

### Strict TDD evidence

- RED: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts src/compartido/infraestructura/entorno.test.ts` exited 1: composition resolved access 3 times instead of 1, the manipulated-authority case resolved twice, and full environment loading still required `SUPABASE_HOUSEHOLD_ID_DESARROLLO`.
- GREEN/TRIANGULATE: `npm test -- src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.test.ts src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts src/compartido/infraestructura/entorno.test.ts src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.test.ts` exited 0; 4 files and 15 tests passed.
- Final suite: `npm test` exited 0; 44 files passed, 1 skipped; 306 tests passed, 15 skipped.
- Build: `npm run build` exited 0; TypeScript passed and all private routes remained dynamic.
- Runtime isolation: `./scripts/validate-supabase-rls.sh` exited 0 with `SUMMARY|status=PASS|passed=3|failed=0|blocked=0|concurrency=passed`.
- Static checks: `git diff --check` passed. Forbidden identity/token/temporary-household identifiers and `getSession(`/cache patterns produced no matches in the PR 3 runtime graph. Entry inventory confirms every private page/action calls `crearDependenciasVehiculos()` once.

### Files changed by remediation

- `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.{ts,test.ts}`
- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.test.ts`
- `src/compartido/infraestructura/entorno.{ts,test.ts}`
- `src/modulos/vehiculos/adaptadores/supabase/cliente-supabase-servidor.test.ts`
- `openspec/changes/auth-login-family-access/apply-progress.md`

### Risks / review workload

- PR 3 source/tests now total 466 changed lines (192 additions, 274 deletions), 66 over the preferred 400-line target. The remediation is one inseparable authorization work unit and remains close to the budget; no PR 4 work was pulled in and no `size:exception` was recorded by this agent.
- The tests exercise the centralized request composition and real membership adapter rather than rendering every App Router page with a browser. Static entry inventory closes the route/action wiring side; the RLS harness closes database cross-household behavior.

## PR 3 review-budget reduction attempt

- Consolidated the membership-provider matrix around shared UUID fixtures and a single resolver helper, and reduced composition-test setup duplication while retaining all 15 focused authorization/runtime tests.
- Kept the verified authorization behavior intact: one guard resolution/context per request, denial before repository construction, server context precedence over injected authority, and fail-closed identity/membership handling.
- Budget moved from **474** to **470** source/test changed lines (including the 8-line untracked resolver). The 400-line target remains unresolved: the remaining diff is already dominated by 296 required removals of the temporary identity/runtime contract plus the replacement authorization implementation and behavior tests; further reduction would require minification, dropping essential coverage, or splitting the inseparable PR 3 authorization boundary.
- Validation: focused suite **15 passed**; `npm test` **306 passed, 15 skipped**; `npm run build` passed; forbidden runtime identity/authority searches returned no matches. RLS was not rerun because no SQL, policy, repository query, or authorization behavior changed; the immediately prior passing A/B harness evidence remains applicable.

## PR 3 budget resolution — corrected split into 3a/3b

The source/test diff could not be reduced under 400 lines without weakening the authorization work unit. The initial split incorrectly assigned the temporary environment cleanup to PR 3a while the PR 3b-owned historical composition still consumed `householdIdDesarrollo`; that boundary made PR 3a fail isolated TypeScript compilation. The corrected split moves the cleanup together with removal of its final consumer:

- **PR 3a — membership resolver and identity contract**: `proveedor-identidad-supabase-servidor*`, `proveedor-identidad.ts`, and `resolver-acceso-familiar.ts`. It deliberately preserves the existing `entorno*` contract and fixture until PR 3b. Exact source/test budget: 82 additions + 116 deletions = **198 changed lines**.
- **PR 3b — composition, protected entries, and temporary environment cleanup**: root/vehicle private pages, `dependencias-servidor*`, `entorno*`, and the related fixture removal in `cliente-supabase-servidor.test.ts`. Exact source/test budget: 92 additions + 180 deletions = **272 changed lines**.

Both slices keep tests with the behavior they verify and preserve `stacked-to-main`: PR 3a targets `main`, PR 3b targets PR 3a. PR 3a no longer removes a contract consumed by code deferred to PR 3b, so the known split-boundary compilation blocker is resolved by construction. The current workspace still contains the full PR 3 implementation; commit/PR preparation must stage or branch these slices separately and independently validate each resulting tree.

Validation after correcting the split:

- `git diff --numstat` plus the 8-line untracked resolver confirms both proposed code/test slices stay below 400 changed lines.
- No production or test code changed while correcting the split plan, so no focused test rerun was required.
- No `size:exception` is required if the corrected split is followed.

## Bounded correction — review-133c1cc5774a23e4

- `RESILIENCE-001`: operational `auth.getUser()` and membership-query failures now invoke the existing incident reporter with stable codes and a synthetic error. Reporter input contains no email, family name, user/household UUID, or raw Supabase error.
- `RELIABILITY-001`: the centralized server composition test now proves anonymous access redirects to `/login` before either repository is constructed or queried; the non-family redirect remains covered in the same behavior matrix.
- Strict TDD RED: focused tests failed on two missing incident reports while the anonymous redirect case already passed as triangulation of the existing guard.
- Strict TDD GREEN: focused provider/composition suite passed 7 tests; full `npm test` passed 307 tests with 15 skipped; `npm run build` passed.
- `git diff --check` and the forbidden PR 3 runtime identifier scan passed.
- RLS was not rerun: this correction changes only operational observability and guard coverage, not SQL, policies, membership queries, repository filters, or authorization outcomes.

## Bounded correction — review-82d37e5c4af2767d

- `RELIABILITY-001`: invocation tests now exercise the root, new-vehicle, and new-event pages for anonymous and family-less access. Every case must redirect before returning protected page content or constructing/querying repositories.
- Page imports use equivalent relative module paths so Vitest can import the App Router entries without changing runtime behavior.
- RED: the first focused invocation run failed before executing tests because Vitest could not resolve the pages' `@/` imports; after making those imports directly testable, the cases exposed the missing runtime-environment fixture.
- GREEN/TRIANGULATE: the focused composition/page suite passed 10 tests across both denial outcomes; `npm test` passed 317 tests with 15 skipped; `git diff --check` passed.
- `npm run build` was not run because it writes generated `.next` output outside this correction's exact allowed edit surfaces.
