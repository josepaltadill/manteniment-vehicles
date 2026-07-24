# Apply progress: family-app-modularization

## Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
nextRecommended: parent-lifecycle
warnings: ["PR 1 REFACTOR complete; PR 2+ and parent lifecycle remain out of scope"]
```
PR 1 / `feature-branch-chain` on `feat/family-app-core-boundary`. This REFACTOR follows the earlier test-compaction correction: it renames already-resolved vehicle context dependencies, updates stale migration-guide paths, and formats request-scope tests without changing behavior, SQL, schema, staging, commit, push, or PR work.

## Completed implementation tasks
- [x] Añadir pruebas de frontera y composición.
- [x] Mover contratos, roles, contexto, proveedor, resolución, adaptadores y bootstrap al núcleo.
- [x] Crear composición server-only y hacer que vehículos consuma contexto resuelto.
- [x] Ejecutar `npm test` y añadir casos que comprueben que URL, formulario, cookie, cabecera o parámetro `household_id` no sustituyen el contexto resuelto por el servidor.
- [x] Verificar mediante búsqueda de imports y tests que el núcleo no depende de vehículos, que el cliente no importa adaptadores y que el runtime ordinario no usa `service_role`.
- [x] Consolidar nombres y paths del contexto ya resuelto, eliminar duplicación de resolución y corregir rutas operativas sin cambiar casos de uso del MVP.

Persisted checkbox updates: all nine PR 1 implementation rows, including REFACTOR, are `[x]`; PR 2–4, definition-of-done, and parent-owned rows remain unchanged.

## TDD Cycle Evidence
| Task | Test file / layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Household context boundary | `src/compartido/pruebas/fronteras-arquitectura.test.ts` / AST unit | 16/16 focused correction baseline | Correction fixtures were added first; the existing detector already passed them, so no production code was changed | 16/16 focused | Positive fixtures now explicitly use `new URL(request.url).searchParams.get("household_id")` and `new FormData().get("household_id")`; params/searchParams, cookies, headers, explicit parameters, server-context negatives, and production scan remain covered | None needed |
| PR 1 REFACTOR | Vehicle use cases, composition, fixture, request-scope test, and migration README | 32/32 focused and 359/359 full baseline | N/A: behavior-preserving refactor after green baseline | 83/83 focused | Names now describe resolved family context; migration paths point to `nucleo-familiar`; focused formatting is reviewable | No behavior change |

## Files and verification
- `src/compartido/pruebas/fronteras-arquitectura.test.ts`: AST detector's positive URL fixture is `const householdId = new URL(request.url).searchParams.get("household_id")`; its positive form fixture is `const householdId = new FormData().get("household_id")`. Both are detected. Existing params/searchParams, cookies, headers, explicit household parameters, server-resolved `ContextoAplicacion` negatives, and the production `src/**` scan remain unchanged.
- REFACTOR: seven vehicle use cases, their tests/actions, composition, and temporal fixture now use `contextoFamiliar`/`ContextoFamiliarTemporal`; `supabase/migrations/README.md` points at current `src/nucleo-familiar/**` operational paths; request-scope setup formatting is expanded.
- `openspec/changes/family-app-modularization/tasks.md`: all nine PR 1 implementation rows, including REFACTOR, are checked.
- Focused correction: `npx vitest run src/compartido/pruebas/fronteras-arquitectura.test.ts` — 16/16.
- Architecture checks: AST production roots/call sites scan; `src/nucleo-familiar/**` core→vehicles import search; runtime privileged-credential search (only static denylist literals in `seguridad-servidor.ts`).
- Full: `npm test` — 47 files passed, 1 skipped; 359 passed, 15 skipped.
- Build: `npm run build` — passed.
- Diff vs `bd3812a`: +57/-16 = 73 changed lines, within the 100-line unit budget; no production files changed.

Correction `review-a021806727e8808f`: RED 6/22 alias/destructuring fixtures failed; GREEN/TRIANGULATE 24/24 architecture, 61/61 focused architecture/composition/security, and full `npm test` 359 passed/15 skipped; correction delta +25/-9 = 34 changed lines including this proof, with no production changes.

No design deviation. No unchecked PR 1 implementation rows remain; all 9 are visibly `[x]` in `tasks.md`.
All exact unchecked PR 2–4, definition-of-done, and parent lifecycle rows remain in `openspec/changes/family-app-modularization/tasks.md`; they are outside this PR 1 REFACTOR boundary.

---

## PR 2 — SQL migration work unit (in progress)

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: openspec
applyState: ready
nextRecommended: apply
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
warnings:
  - PR 2 and PR 3 must activate only in one coordinated deployment window.
  - This work unit does not update runtime consumers, fixtures, or the shared Supabase instance.
```
PR strategy: `feature-branch-chain`; current boundary: **PR 2 / atomic migration SQL and source-contract RED test**. It is a 261-line work unit including persisted task/progress evidence, below the 400-line review budget. It depends on PR 1 and is followed by PR 2 isolated integration/preflight/concurrency evidence, then PR 3 consumers and RLS. No branch, commit, push, PR, shared-Supabase mutation, or activation occurred.

### Completed implementation task and persisted checkbox
- [x] Añadir `supabase/migrations/<timestamp>_family_app_modularization.sql` con una única transacción, locks en orden fijo, timeouts configurables y renombrado no destructivo de las cinco tablas.

`tasks.md` was updated immediately and reread: that PR 2 row is visibly `[x]`. Parent-owned activation rows were preserved byte-for-byte.

### Files changed
- `src/compartido/pruebas/migracion-family-app-modularization.test.ts`: RED source-contract tests for transaction, fixed locks, the five names, fail-closed catalog checks, no destructive commands, and no compatibility alias/view.
- `supabase/migrations/20260713000000_family_app_modularization.sql`: one transaction with local timeouts, fixed-order `ACCESS EXCLUSIVE` locks, source/final catalog preconditions, five non-destructive table renames, rewritten and renamed security-definer functions, dependency-name loops, and final RLS/catalog assertions.
- `openspec/changes/family-app-modularization/tasks.md`: one completed PR 2 checkbox.
- `openspec/changes/family-app-modularization/apply-progress.md`: this cumulative evidence.

### TDD Cycle Evidence
| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Atomic migration SQL | `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` failed 3/3 because the versioned migration did not exist. | Added the migration; focused test passed 3/3. | Applied historical DDL plus the new migration only to a temporary local Supabase workspace, then stopped and removed it. PostgreSQL reported the five final tables and `mv_objects=0` from `pg_class`. `npm test` passed 48 files, skipped 1; 362 passed, 15 skipped. | Kept the cut in one SQL file and used catalog-driven renames for owner-specific constraints, indexes, policies, and triggers; no production consumer or validation harness changes were mixed in. |

### Verification
- `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — RED: 3 failed (migration absent); GREEN: 3 passed.
- Temporary isolated local Supabase instance: applied all three historical migrations plus `20260713000000_family_app_modularization.sql`; final catalog output: `fam_hogares,fam_miembros_hogar,fam_roles_plataforma,fam_ve_eventos_vehiculo,fam_ve_vehiculos`; `mv_objects=0`. The temporary workspace was stopped and deleted.
- `npm test` — 48 files passed, 1 skipped; 362 passed, 15 skipped.
- `git diff --check` — passed.

### Deviations and remaining work
No design deviation. The RED test is an executable source contract, not yet the required full PostgreSQL integration harness; therefore the integration/preflight/concurrency/rollback tasks remain unchecked. PR 3 runtime consumers intentionally still target `mv_*` and were not touched.

Exact unchecked PR 2 implementation rows:
- [ ] Crear pruebas de integración en `supabase/validation/` o el harness PostgreSQL existente que apliquen DDL histórico en una base efímera y fallen al exigir `fam_hogares`, `fam_miembros_hogar`, `fam_roles_plataforma`, `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo` con los mismos UUIDs, filas y relaciones. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de atomicidad observable que fallen si un lector/escritor concurrente ve una mezcla de objetos `mv_*`/`fam_*`, si el orden de locks permite deadlock, o si `lock_timeout`/`statement_timeout` deja renombres parciales en lugar de rollback completo. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de preflight que fallen ante objetos `fam_*` conflictivos, consumidores externos `mv_*` no clasificados, invariantes rotas, backup no recuperable o dependencias de catálogo no inventariadas. <!-- sdd-owner: implementation -->
- [ ] Añadir casos de rollback/fix-forward que documenten el punto de no retorno y comprueben que la recuperación no borra, reasigna ni abre permisos inciertos. <!-- sdd-owner: implementation -->
- [ ] Actualizar dentro de la migración los cuerpos y nombres de funciones, constraints, índices, triggers y policies al prefijo propietario `fam_*`; verificar propietarios, revocaciones y grants existentes sin tratarlos como objetos renombrables, conservando `household_id`/`p_household_id` y sin crear compatibilidad `mv_*`. <!-- sdd-owner: implementation -->
- [ ] Implementar el preflight y la evidencia operativa en los scripts/SQL existentes bajo `supabase/validation/` y `scripts/`, incluyendo backup restaurable, OID/definiciones, conteos, UUIDs, relaciones, RLS, jobs, webhooks y consumidores externos. <!-- sdd-owner: implementation -->
- [ ] Añadir aserciones dentro y después de la migración para rechazar tablas/objetos productivos `mv_*`, exigir las cinco tablas finales, RLS habilitado y dependencias esenciales completas. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `npm test` y la validación PostgreSQL sobre datos vacíos, datos existentes con histórico y datos inesperados válidos; comparar filas, UUIDs, relaciones, unicidad de matrícula por hogar incluidos inactivos y eventos no huérfanos. <!-- sdd-owner: implementation -->
- [ ] Ejecutar la prueba concurrente de corte con una sesión lectora/escritora bloqueada, un escenario de lock contention y un timeout forzado, demostrando que otros consumidores observan solo el contrato anterior completo o el contrato final completo. <!-- sdd-owner: implementation -->
- [ ] Verificar catálogo `pg_class`, `pg_constraint`, `pg_proc`, `pg_trigger`, `pg_policy`, grants y dependencias para distinguir archivos históricos permitidos de referencias productivas activas. <!-- sdd-owner: implementation -->
- [ ] Ensayar la migración en entorno aislado con fallo antes y después del commit, dejando evidencia del procedimiento y de la decisión rollback/fix-forward. <!-- sdd-owner: implementation -->
- [ ] Hacer la migración determinista, explícita y revisable; parametrizar solo valores operativos que dependan del entorno y documentar el punto de no retorno en `docs/general/persistencia-y-migraciones.md` cuando esa documentación se cree en PR 4. <!-- sdd-owner: implementation -->

Deferred lifecycle actions: confirm backup/traffic/jobs/consumers/lock limits; activate PR 2+PR 3 together; execute complete post-cut evidence; monitor the deployment window. These are parent-owned and unchanged.

---

## PR 2 — continuation: precise `mv_` catalog-prefix guard

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: openspec
applyState: ready
nextRecommended: apply
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
warnings:
  - PR 2 and PR 3 activate only in one coordinated deployment window.
  - This is a source-contract improvement, not PostgreSQL integration evidence.
```
PR strategy: `feature-branch-chain`; boundary: **PR 2 / precise catalog prefix matching**. This continuation preserves the independently verified migration work unit and uses 262 changed lines before this progress evidence, below the 400-line PR budget.

### Completed implementation tasks and persisted checkboxes
No additional task checkbox was completed: this strengthens the completed migration work unit but does not satisfy an unchecked integration, atomicity, preflight, recovery, or catalog-validation criterion. `tasks.md` remains unchanged; its completed migration row remains visibly `[x]` and all other PR 2 rows remain `[ ]`.

### TDD Cycle Evidence
| Work unit | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Precise `mv_` catalog-prefix guard | Changed the source-contract expectation to require `c.relname ~ '^mv_'`; focused Vitest failed 1/3 because the migration used SQL `LIKE 'mv_%'`, where `_` is a wildcard. | Replaced all five owner-object checks with the anchored PostgreSQL regex; focused test passed 3/3. | `npm test` passed 48 files; 362 passed, 15 skipped. The test now fails if the final catalog check reverts to the wildcard form. | Kept the change local to the migration and its source-contract test; no runtime consumers, shared Supabase, aliases/views, or destructive operations changed. |

### Verification and deviations
- `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — RED: 1 failed, 2 passed; GREEN: 3 passed.
- `npm test` — 48 files passed, 1 skipped; 362 passed, 15 skipped.
- `git diff --check` — passed.

No design deviation. The `LIKE 'mv_%'` pattern treated `_` as a single-character wildcard, so it could match unrelated `mvX...` names on a shared instance. The anchored regex matches only the literal `mv_` prefix. This remains source-contract evidence; it is not represented as PostgreSQL integration or preflight evidence.

Workload / PR boundary: PR 2 remains below the 400-line budget. Start: verified migration and source-contract test. End: all migration catalog owner-prefix filters use `~ '^mv_'`. Follow-up: the existing unchecked PR 2 integration/preflight/concurrency/recovery work, then PR 3 consumers/RLS. Out of scope: PR 3 runtime consumers and all PR 4 documentation.

---

## Correction `review-da7a7c22062311e6`

- `RELIABILITY-001`: index, policy, and trigger loops now filter through exactly the five renamed owner tables; the final `mv_*` assertion is limited to those owner prefixes, so unrelated public canaries remain untouched.
- `RELIABILITY-002`: the existing migration Vitest embeds executable PostgreSQL evidence for historical DDL, fixed UUID rows/relationships, forced postcondition rollback, a successful cut, and untouched unrelated table/index/policy/trigger names. Execution requires `FAMILY_APP_MIGRATION_TEST_DATABASE_URL` to name a dedicated `family_app_modularization_test_*` database on loopback.
- `RELIABILITY-003`: the RLS postcondition requires `public`, ordinary tables, all five exact target names, and count five.

Strict TDD evidence: after removal of the out-of-scope harness, focused RED failed 1/5 on its stale file dependency; focused GREEN passed 4 with the PostgreSQL case honestly skipped because no isolated URL was supplied. PostgreSQL execution remains for the parent targeted isolated validator and is not represented as observed here. No task checkbox changed because broader PR 2 tasks remain incomplete.

---

## PR 3 — consumer/validation forecast (size exception authorized)

**Maintainer decision:** explicit `size:exception` authorized for the coherent active-contract PR 3 cut. Hard ceiling: **500 authored changed lines total**, including tests, fixtures, tasks, and progress evidence. Product scope remains unchanged; stop before crossing the ceiling.

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
nextRecommended: apply
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
localApplyResult: blocked
warnings:
  - PR 2 and PR 3 activate only in one coordinated deployment window.
  - PR #30 remains intentionally red alone; main's unrelated 02aa1f9 baseline fix was not merged or rebased.
```

Created the requested local branch `feat/family-app-modularization-pr3-consumers` from exact head `9ffb3362c3e59766171e22043eacd23c14f1013a`. No commit, push, PR, merge, rebase, shared Supabase mutation, production activation, tests, or code/test/fixture edit occurred.

### Workload gate

The smallest *complete active-contract* PR 3 cut cannot stay within the 400 changed-line budget. It must change the runtime/core adapters and their focused tests (at least 31 direct active `mv_*` references), plus the live RLS harness path: `supabase/validation/assertions.sql` has 83 active table references, and the harness/fixtures must apply the final migration and use final names. Even before task/progress evidence, the conservative replacement forecast is **at least 452 authored changed lines**: 112 active runtime/validation lines require delete+add accounting (224), focused runtime-test expectations add at least 62, and 83 RLS assertion replacements add 166. Historical migration tests and historical migration files are deliberately excluded.

Splitting runtime/bootstrap from RLS fixtures would leave the active validation harness executing historical DDL then querying removed `mv_*` tables at the combined schema+consumer head, violating the requested coherent green consumer/test cut. Therefore strict TDD has not begun: writing a partial RED slice would knowingly produce a non-green active contract.

### Completed coherent active-contract cut

Active server consumers now use `fam_miembros_hogar`, `fam_hogares`, `fam_ve_vehiculos`, and `fam_ve_eventos_vehiculo`. The RLS harness applies the three historical migrations followed by `20260713000000_family_app_modularization.sql`; its fixtures, assertions, concurrent last-admin sessions, and final-admin verification use the final tables. Historical migration files/tests retain legitimate `mv_*` references.

Completed persisted tasks: PR 3 RED table expectations; GREEN identity membership consumer; GREEN vehicle repositories/mappers; GREEN bootstrap/preflight operations; GREEN fixtures/cleanup/smoke/RLS harness. `tasks.md` was updated immediately and reread: these five rows are visibly `[x]`; parent-owned rows were untouched.

### TDD Cycle Evidence

| Phase | Evidence |
|---|---|
| RED | Changed focused expectations first; 11/110 failed because consumers still selected `mv_*` and the RLS harness did not require/apply the final migration. |
| GREEN | Updated only active consumers, validation assets, and their expectations; focused suite passed 110/110. |
| TRIANGULATE | `npm test`: 48 files, 373 passed, 16 skipped. `npx tsc --noEmit` failed on unchanged `src/compartido/pruebas/alcance-familiar-por-solicitud.test.ts:14` incompatible type assertion. Isolated RLS preflight passed, but `supabase start` exceeded 600 seconds; its label-identified local runtime was stopped. |
| REFACTOR | Historical migration names remain only for immutable migration-file references; `household_id`, `p_household_id`, and `householdId` remain unchanged; no alias/view or product behavior added. |

### Workload and remaining work

Current diff: **213 additions / 166 deletions = 379 authored changed lines**, within the authorized 500-line exception. `git diff --check` passed; `tsconfig.tsbuildinfo` was restored. No commit, push, PR, merge, rebase, activation, or shared Supabase mutation occurred.

Exact remaining PR 3 implementation rows:
- [ ] Añadir pruebas de integración de repositorios para matrícula única por hogar incluyendo inactivos, FK compuesta, eventos cruzados, kilometraje, baja lógica, coste, año, fechas, estados, valores negativos/límite y vencimientos usando `fam_ve_*` con reloj/zonahoraria inyectados. <!-- sdd-owner: implementation -->
- [ ] Ejecutar `npm test` y la matriz RLS para anónimo, no miembro, `editor`, `admin`, rol de plataforma, acceso cruzado y operaciones de vehículos; incluir prueba concurrente del último administrador. <!-- sdd-owner: implementation -->
- [ ] Verificar bootstrap repetido, identidad ambigua, membresía duplicada, cero/múltiples membresías, UUID inválido y que ningún runtime ordinario obtiene credenciales `service_role`. <!-- sdd-owner: implementation -->
- [ ] Ejecutar smoke end-to-end de alta, listado, desactivación, eventos, costes, kilometraje y vencimientos; comprobar que los datos históricos permanecen accesibles. <!-- sdd-owner: implementation -->
- [ ] Ejecutar búsqueda final en código, configuración activa, scripts, validaciones y catálogo para demostrar que no quedan referencias productivas finales a `mv_*`. <!-- sdd-owner: implementation -->
- [ ] Eliminar duplicaciones y adaptar nombres de módulo/núcleo sin traducir masivamente `household_id`/`householdId` ni introducir dependencias de vehículos en el núcleo. <!-- sdd-owner: implementation -->

---

## PR 3 — bootstrap/security triangulation batch

Forecast before edits: 2 task-checkbox lines plus at most 30 progress lines; safely below the 108-line remaining exception capacity. Actual implementation delta is the persisted checkbox and this cumulative evidence only.

Focused strict-TDD verification (no new production behavior was required): `npx vitest run` over bootstrap CLI/plan/preflight/server, identity provider, and server-security suites passed **43/43**. It covers idempotent bootstrap, conflict/duplicate planning, zero/multiple memberships, invalid UUID input, and the production scan for privileged-key patterns. The matching PR 3 TRIANGULATE row is now visibly `[x]` in `tasks.md`.

RLS startup diagnosis was read-only: `supabase/validation/config.toml` uses deprecated `[inbucket]`; CLI 2.109.1 warned about it, but no retained startup log exists after authorized cleanup, so it is not proven to be the timeout cause. No blind retry was performed. No `mv-rls-validation-*` container remains; the dedicated loopback PostgreSQL container was untouched. The RLS-matrix and smoke rows remain unchecked.

---

## PR 3 — bounded evidence follow-up

Forecast before edits: progress evidence only (under 30 lines), preserving the 500-line ceiling. Read-only diagnosis confirms the available PostgreSQL 17 image and `supabase start` supports `--ignore-health-check`, but that flag would bypass the readiness gate required for RLS evidence; without the deleted startup log it cannot establish a safe corrective retry. No runtime was created.

Focused smoke-layer coverage passed **52/52** across vehicle actions, vehicle use cases, expiry domain behavior, and final-table repositories. It covers create/list/deactivate, events/cost, kilometre updates, expiry, and historical event handling, but is not a real isolated database end-to-end smoke; the E2E checkbox remains unchecked. Classified `mv_*` search found only allowed immutable historical migration references/source-contract evidence and the historical migration filenames consumed by the active harness; no active runtime, fixture, assertion, or concurrency SQL references remain. The catalog-dependent final-search checkbox remains unchecked until an isolated final-schema catalog run succeeds.

No task checkbox changed. `git diff --check` passed; no generated file or isolated Docker resource was created. Deferred lifecycle actions remain parent-owned and unchanged.

---

## PR 3 — RLS evidence and disposable cleanup correction

Forecast before edits: one script line, three focused test expectations, two checkboxes, and concise progress evidence; below the remaining 88-line exception capacity. RED: after changing the expectations, `validate-supabase-rls.test.ts` failed 3/21 because cleanup still invoked `supabase stop --workdir`. GREEN: cleanup now invokes `supabase stop --no-backup --workdir "$workspace"` only after all existing ownership/safe-cleanup guards; focused test passed 21/21 and `npm test` passed 48 files, 373 tests, 16 skipped. The existing fail-closed cleanup test continues to require that a stop failure preserves the workspace.

Authorized diagnostic: `timeout --kill-after=30s 240s bash scripts/validate-supabase-rls.sh` exited 0 in ~31.2s for isolated project `mv-rls-validation-1784461751-5831`. Its log reports successful migration/fixture/RLS matrix, `schema.tables|5-rls-tables|5|PASS`, anonymous/non-member/editor/admin/platform-role/cross-household/vehicle cases, last-admin concurrency, and `SUMMARY|status=PASS|passed=3|failed=0|blocked=0|concurrency=passed`. This supersedes the transient prior timeout; it does not identify a configuration defect.

The RLS matrix and final productive-`mv_*` search rows are now visibly `[x]`: classified source hits are immutable historical migration/source-contract evidence or required historical filenames; successful final-schema migration/catalog assertions plus the five final RLS tables prove no active final `mv_*` owner objects. Diagnostic logs are `/tmp/pr3-rls-diagnostic-43425.log`, `.docker-status.log`, and `.docker-events.log`.

Cleanup proof: the exact project containers, network, and workspace were removed; the dedicated `127.0.0.1:55432` PostgreSQL was untouched. Post-check found one stopped-volume remnant, `supabase_storage_mv-rls-validation-1784461751-5831` (label `mv-rls-validation-1784461751-5831`); destructive removal requires parent authorization and was not performed. Smoke/database E2E, repository-integration, and refactor rows remain unchecked. No commit, push, PR, merge, rebase, activation, or shared database mutation occurred.

---

## PR 3 — final bounded coverage mapping

Forecast before edits: no code or checkbox edit; at most 20 progress lines, remaining below the 64-line ceiling. Focused final-contract coverage passed **66/66** across vehicle/event repositories, use cases, and vehicle/event/expiry domain tests. It proves inactive-plate uniqueness, composite FK/cross-event database constraints through the successful isolated RLS run, mileage/soft-delete/cost/year/date/state/negative validation, historical events, and injected clock values.

The exhaustive repository-integration row remains unchecked: the evidence combines adapter fakes, domain/in-memory tests, and RLS SQL—not one repository integration suite covering every listed criterion with an injected timezone. The database E2E smoke row remains unchecked because no isolated run exercises create/list/deactivate/events/cost/mileage/expiry/history as an end-to-end application flow. Refactor inspection found no safe bounded change needed; the row remains unchecked rather than claiming a no-op refactor. These gaps require the smallest PR 3B boundary: **isolated repository integration plus database E2E smoke evidence**, likely exceeding this PR's remaining budget.

The parent-authorized volume cleanup is now verified: no matching containers, networks, volumes, or workspace remain. No task checkbox changed in this mapping batch.

---

## PR 3A / PR 3B delivery boundary

The maintainer authorized splitting the remaining evidence work rather than increasing the 500-line exception again. PR 3A freezes the coherent consumer/bootstrap/RLS contract and its verified cleanup behavior. PR 3B will start from PR 3A and contain only the unchecked exhaustive repository integration, isolated database E2E smoke, and any evidence-driven bounded refactor. Neither slice activates independently; combined-head validation must overlay current `origin/main` without rewriting PR 2 receipts.

Combined-head validation over `origin/main@02aa1f9` plus PR 2A `eea99df`, PR 2B `9ffb336`, and the exact PR 3A overlay passed `npx tsc --noEmit`, focused Vitest (**115 passed, 11 skipped**) and `npm test` (**48 files passed, 1 skipped; 373 passed, 16 skipped**). The combined tree was `d09b9009090ddff5769ed141c158e30383fc5214`; frozen PR 2 blobs and the main-only family-context fix remained unchanged.

The verifier initially ran `tsc` in the source worktree and modified only tracked `tsconfig.tsbuildinfo`. The parent restored that generated artifact; branch, HEAD, index and authored diff remained unchanged, and the source overlay hash returned to `c3deb325c73a09b7f1bf221b72000d799f31e2cc4971ff9f9f4d274eb4f939b3`. No Docker or database resource was touched during combined-head verification.

---

## PR 2 — continuation: isolated PostgreSQL integration harness (blocked before edit)

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: openspec
applyState: ready
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
nextRecommended: apply
warnings:
  - PR 2 and PR 3 must activate only in one coordinated deployment window.
  - Remote publication is blocked by native-publication-base-required; no commit, push, PR, or shared-Supabase mutation was performed.
```
Selected work unit: **PR 2 / make the existing loopback-only PostgreSQL integration harness deterministic, then demonstrate preservation of historical UUIDs, rows, and relations**. This is the smallest coherent unchecked integration-evidence slice; runtime consumers, preflight, concurrency, rollback/fix-forward, and shared Supabase remain out of scope.

### Strict TDD safety-net result
The existing focused integration file was executed against the supplied dedicated loopback container/database contract before any edit:

```text
FAMILY_APP_MIGRATION_TEST_DATABASE_URL=<loopback dedicated database> \
  npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts
```

Result: source-contract tests passed (4/5), but the PostgreSQL integration test failed before exercising the migration with `duplicate key value violates unique constraint "users_pkey"` while applying the historical fixture SQL. The supplied dedicated database already contained three `public.mv_*` relations, so the test is not isolated/repeatable as currently written.

Per strict TDD safety-net rules, no test, fixture, migration, or runtime code was edited after that pre-existing focused failure. No task checkbox was completed or changed. The next apply batch must first make this test's isolated database lifecycle deterministic (within the existing loopback-only dedicated-container contract), then repeat RED → GREEN → TRIANGULATE before claiming the PR 2 integration checkbox.

### Verification and workload
- `psql` loopback inspection of the named dedicated test database: current database confirmed; 3 existing `public.mv_*` relations detected.
- Focused PostgreSQL test: 4 passed, 1 failed as described above.
- `npm test` was not run because the strict-TDD safety net failed before implementation.
- No files changed by this batch other than this cumulative progress record; no persisted task checkbox update was warranted.
- PR boundary remains under 400 lines because no code/test work was accepted.

No design deviation. Deferred parent lifecycle actions remain byte-for-byte unchanged: backup/traffic/jobs/consumer confirmation, coordinated PR 2+PR 3 activation, complete post-cut evidence, and post-window monitoring.

---

## PR 2 — continuation: authorized dedicated database reset (blocked on missing Auth fixture)

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
authoritativeOpenSpec: { applyState: ready, nextRecommended: apply }
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
localApplyResult: blocked
warnings:
  - The reset was restricted to the explicitly authorized dedicated loopback database.
  - PR 2 and PR 3 still activate only in one coordinated deployment window.
```

The destructive-operation boundary was verified twice before each reset: Docker container `family-app-modularization-pg16` was running with PostgreSQL bound only to `127.0.0.1:55432`; its `POSTGRES_DB` contract and the PostgreSQL catalog both named exactly `family_app_modularization_test_review_da7a7c22062311e6`. No remote host, shared Supabase, staging, production, or other database was queried or modified. The authorized database was dropped and recreated, then verified to contain zero `public` relations. It was reset a second time after the diagnostic test to leave the dedicated database empty.

### Strict TDD evidence
| Work unit | Safety net / RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Deterministic dedicated PostgreSQL integration setup | Before edits, the existing focused integration test was rerun after the authorized clean reset. Its previous duplicate-key failure was removed, but execution failed earlier while historical fixture SQL referenced the absent `auth` schema: `schema "auth" does not exist`. | Not reached; no code or test was edited. | Not reached. | Not reached. |

Focused command executed with a locally constructed, non-logged loopback URL for the exact authorized database:

```text
FAMILY_APP_MIGRATION_TEST_DATABASE_URL=<127.0.0.1 dedicated URL> \
npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts
```

Observed result: 4 source-contract tests passed; 1 PostgreSQL integration test failed at historical DDL application before migration execution. `npm test` was not run because the focused strict-TDD safety net is not green. Per the corrective-scope guard, the missing `auth` schema is a different fixture/environment defect, so no migration, harness, fixture, runtime, or task checkbox was changed.

### Remaining work and blocker
- [ ] Crear pruebas de integración en `supabase/validation/` o el harness PostgreSQL existente que apliquen DDL histórico en una base efímera y fallen al exigir `fam_hogares`, `fam_miembros_hogar`, `fam_roles_plataforma`, `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo` con los mismos UUIDs, filas y relaciones. <!-- sdd-owner: implementation -->

The next apply batch must resolve the isolated historical Auth-fixture prerequisite without broadening into shared-Supabase or runtime work, then rerun RED → GREEN → TRIANGULATE. `tasks.md` was intentionally unchanged; its PR 2 integration row remains visibly `[ ]`. No design deviation, commit, push, PR, PR activation, or shared-Supabase mutation occurred.

---

## PR 2 — continuation: deterministic isolated PostgreSQL migration evidence

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
authoritativeOpenSpec: { applyState: ready, nextRecommended: apply }
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
localApplyResult: completed-work-unit
warnings:
  - PR 2 and PR 3 still activate only in one coordinated deployment window.
  - The destructive test reset is limited to the authorized dedicated loopback database after URL and connected-catalog validation.
```

Completed the smallest PR 2 integration-evidence slice only. The focused harness now creates the minimal historical Auth fixture (`auth.users` columns consumed by the historical seed plus `auth.uid()` used while creating historical RLS functions), validates the connected database name after connecting, and resets only `public` and `auth` schemas in the already-validated dedicated database. It then applies the historical DDL and fixture unchanged before the atomic migration.

### Completed implementation task and persisted checkbox
- [x] Crear pruebas de integración en `supabase/validation/` o el harness PostgreSQL existente que apliquen DDL histórico en una base efímera y fallen al exigir `fam_hogares`, `fam_miembros_hogar`, `fam_roles_plataforma`, `fam_ve_vehiculos` y `fam_ve_eventos_vehiculo` con los mismos UUIDs, filas y relaciones. <!-- sdd-owner: implementation -->

`tasks.md` was updated immediately and reread. This exact PR 2 integration checkbox is visibly `[x]`; no other implementation or parent-owned checkbox changed.

### TDD Cycle Evidence
| Work unit | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| Minimal isolated Auth prerequisite | Existing focused integration run failed on missing `auth` schema after the authorized empty-database reset. | Adding the fixture path before it existed failed with `ENOENT`; after adding the schema/table it exposed the second historical-DDL requirement, missing `auth.uid()`. | Added only the seed-consumed `auth.users` columns and a stable UUID-returning `auth.uid()`; focused PostgreSQL run passed 5/5. | A second focused run initially failed because the first left schemas behind; the harness now verifies its connected database name and resets only the authorized schemas. Two subsequent focused executions passed 5/5, proving repeatability. Exact vehicle UUID and household-member relationship assertions, plus an exact five-final-table catalog count, passed. | Kept all reset logic inside the focused test harness and the Auth surface minimal; no migration SQL, runtime consumer, shared Supabase, or broad Supabase emulation changed. |

### Files and verification
- `supabase/validation/auth-fixture.sql`: minimal deterministic isolated Auth DDL for the historical migrations and seed.
- `src/compartido/pruebas/migracion-family-app-modularization.test.ts`: loads Auth before historical DDL, fail-closes unless the connected database equals the URL-selected dedicated database, resets only validated test schemas, and verifies five final tables, rows, historical vehicle UUIDs, household-member relationships, rollback, and unrelated `mv_*` objects.
- `openspec/changes/family-app-modularization/tasks.md`: exact integration-evidence row changed to `[x]`.
- `openspec/changes/family-app-modularization/apply-progress.md`: cumulative evidence.
- Before every destructive test reset, Docker/container configuration and PostgreSQL catalog were reverified as `family-app-modularization-pg16`, loopback `127.0.0.1:55432`, and `family_app_modularization_test_review_da7a7c22062311e6`; no other database was modified.
- Focused PostgreSQL test: `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — 5/5, run twice after the repeatability change.
- Full suite: `npm test` — 48 files passed, 1 skipped; 363 passed, 16 skipped. The PostgreSQL case was observed, not skipped, in the focused runs.
- `git diff --check` — passed.

### Deviations, workload, and remaining work
No design deviation. The work-unit diff remains below 400 changed lines, including cumulative apply-progress evidence. PR boundary: PR 2 migration SQL and isolated historical preservation evidence; next work must address separate unchecked PR 2 atomicity, preflight, recovery, catalog, and determinism/review work without touching PR 3 consumers.

Exact unchecked PR 2 implementation rows remain:
- [ ] Crear pruebas de atomicidad observable que fallen si un lector/escritor concurrente ve una mezcla de objetos `mv_*`/`fam_*`, si el orden de locks permite deadlock, o si `lock_timeout`/`statement_timeout` deja renombres parciales en lugar de rollback completo. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de preflight que fallen ante objetos `fam_*` conflictivos, consumidores externos `mv_*` no clasificados, invariantes rotas, backup no recuperable o dependencias de catálogo no inventariadas. <!-- sdd-owner: implementation -->
- [ ] Añadir casos de rollback/fix-forward que documenten el punto de no retorno y comprueben que la recuperación no borra, reasigna ni abre permisos inciertos. <!-- sdd-owner: implementation -->
- [ ] Actualizar dentro de la migración los cuerpos y nombres de funciones, constraints, índices, triggers y policies al prefijo propietario `fam_*`; verificar propietarios, revocaciones y grants existentes sin tratarlos como objetos renombrables, conservando `household_id`/`p_household_id` y sin crear compatibilidad `mv_*`. <!-- sdd-owner: implementation -->
- [ ] Implementar el preflight y la evidencia operativa en los scripts/SQL existentes bajo `supabase/validation/` y `scripts/`, incluyendo backup restaurable, OID/definiciones, conteos, UUIDs, relaciones, RLS, jobs, webhooks y consumidores externos. <!-- sdd-owner: implementation -->
- [ ] Añadir aserciones dentro y después de la migración para rechazar tablas/objetos productivos `mv_*`, exigir las cinco tablas finales, RLS habilitado y dependencias esenciales completas. <!-- sdd-owner: implementation -->
- [ ] Ejecutar la prueba concurrente de corte con una sesión lectora/escritora bloqueada, un escenario de lock contention y un timeout forzado, demostrando que otros consumidores observan solo el contrato anterior completo o el contrato final completo. <!-- sdd-owner: implementation -->
- [ ] Verificar catálogo `pg_class`, `pg_constraint`, `pg_proc`, `pg_trigger`, `pg_policy`, grants y dependencias para distinguir archivos históricos permitidos de referencias productivas activas. <!-- sdd-owner: implementation -->
- [ ] Ensayar la migración en entorno aislado con fallo antes y después del commit, dejando evidencia del procedimiento y de la decisión rollback/fix-forward. <!-- sdd-owner: implementation -->
- [ ] Hacer la migración determinista, explícita y revisable; parametrizar solo valores operativos que dependan del entorno y documentar el punto de no retorno en `docs/general/persistencia-y-migraciones.md` cuando esa documentación se cree en PR 4. <!-- sdd-owner: implementation -->

Deferred lifecycle actions (parent-owned, unchanged): backup/traffic/jobs/consumer confirmation, coordinated PR 2+PR 3 activation, complete post-cut evidence, and post-window monitoring. No commit, push, PR, activation, runtime-consumer change, or shared-Supabase mutation occurred.

---

## Gate correction `review-da7a7c22062311e6`: effective PostgreSQL target guard

### Status and delivery boundary
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
nextRecommended: parent-lifecycle
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
warnings:
  - The native OpenSpec state remains apply-ready because other PR 2 implementation tasks are unchecked.
  - This completed PR 2B correction must not be treated as completion of the PR 2/PR 3 activation chain.
```

The gate finding was corrected in the PR 2 integration-harness continuation only. The guard no longer trusts `new URL(...).hostname`. It uses the installed `pg-connection-string@2.14.0` `parseIntoClientConfig()` result, validates the effective parsed host and database before constructing `Client`, and constructs `Client` from that validated parsed configuration. It accepts only `127.0.0.1`, `localhost`, or `[::1]` and exactly `family_app_modularization_test_review_da7a7c22062311e6`. It fail-closes before connect/reset on remote query-host override, multi-host, Unix socket, malformed URL, and wrong database values. No reset/query occurs before that validation.

### Completed implementation task and persisted checkbox
The existing PR 2 integration-evidence row remains `[x]` after correction. It was reread in `tasks.md`; no additional implementation row and no parent-owned row changed. The corrected parser-level fail-closed tests and two observed PostgreSQL preservation runs fully support retaining this checkbox.

### TDD Cycle Evidence
| Work unit | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| Effective `pg` connection target guard | Added 3 accepted exact-loopback cases plus 6 rejection cases; focused Vitest failed 9/14 because `resolverDestinoDedicado` did not exist. | Implemented the guard with `parseIntoClientConfig`; focused test passed 13/13 with PostgreSQL integration skipped when no URL is supplied. | Two focused executions with the authorized exact loopback URL passed 14/14 each; both exercised reset, historical DDL, rollback, migration, UUID/relationship preservation, and unrelated-object preservation. | Removed the obsolete URL-shape guard from the integration path; `Client` now receives the same validated parser output asserted by tests. |

### Verification
- Focused RED: `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — 9 failed, 4 passed, 1 skipped; failure was the absent resolver.
- Focused GREEN/refactor: same command — 13 passed, 1 skipped.
- Authorized observed PostgreSQL evidence (twice): `FAMILY_APP_MIGRATION_TEST_DATABASE_URL=<exact local authorized URL> npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — 14/14 each run. The URL was constructed locally and not persisted/logged; Docker binding was `127.0.0.1:55432` and database was exactly `family_app_modularization_test_review_da7a7c22062311e6`.
- `npm test` — 48 files passed, 1 skipped; 372 passed, 16 skipped.
- `git diff --check` — passed.

### Workload / PR boundary
Approved `feature-branch-chain`: `eea99df` remains **PR 2A**. This integration-harness continuation is **PR 2B** and has a prospective delta from `eea99df` of **+264/-10 = 274 changed lines**, including the 17-line untracked `supabase/validation/auth-fixture.sql` and cumulative OpenSpec evidence. It is below 400 lines. This is not a claim that the complete PR 2 chain is a single under-budget PR. No branch, commit, push, PR, runtime consumer, PR 3 work, shared Supabase, staging, production, or activation changed.

### Remaining implementation tasks
- [ ] Crear pruebas de atomicidad observable que fallen si un lector/escritor concurrente ve una mezcla de objetos `mv_*`/`fam_*`, si el orden de locks permite deadlock, o si `lock_timeout`/`statement_timeout` deja renombres parciales en lugar de rollback completo. <!-- sdd-owner: implementation -->
- [ ] Crear pruebas de preflight que fallen ante objetos `fam_*` conflictivos, consumidores externos `mv_*` no clasificados, invariantes rotas, backup no recuperable o dependencias de catálogo no inventariadas. <!-- sdd-owner: implementation -->
- [ ] Añadir casos de rollback/fix-forward que documenten el punto de no retorno y comprueben que la recuperación no borra, reasigna ni abre permisos inciertos. <!-- sdd-owner: implementation -->
- [ ] Actualizar dentro de la migración los cuerpos y nombres de funciones, constraints, índices, triggers y policies al prefijo propietario `fam_*`; verificar propietarios, revocaciones y grants existentes sin tratarlos como objetos renombrables, conservando `household_id`/`p_household_id` y sin crear compatibilidad `mv_*`. <!-- sdd-owner: implementation -->
- [ ] Implementar el preflight y la evidencia operativa en los scripts/SQL existentes bajo `supabase/validation/` y `scripts/`, incluyendo backup restaurable, OID/definiciones, conteos, UUIDs, relaciones, RLS, jobs, webhooks y consumidores externos. <!-- sdd-owner: implementation -->
- [ ] Añadir aserciones dentro y después de la migración para rechazar tablas/objetos productivos `mv_*`, exigir las cinco tablas finales, RLS habilitado y dependencias esenciales completas. <!-- sdd-owner: implementation -->
- [ ] Ejecutar la prueba concurrente de corte con una sesión lectora/escritora bloqueada, un escenario de lock contention y un timeout forzado, demostrando que otros consumidores observan solo el contrato anterior completo o el contrato final completo. <!-- sdd-owner: implementation -->
- [ ] Verificar catálogo `pg_class`, `pg_constraint`, `pg_proc`, `pg_trigger`, `pg_policy`, grants y dependencias para distinguir archivos históricos permitidos de referencias productivas activas. <!-- sdd-owner: implementation -->
- [ ] Ensayar la migración en entorno aislado con fallo antes y después del commit, dejando evidencia del procedimiento y de la decisión rollback/fix-forward. <!-- sdd-owner: implementation -->
- [ ] Hacer la migración determinista, explícita y revisable; parametrizar solo valores operativos que dependan del entorno y documentar el punto de no retorno en `docs/general/persistencia-y-migraciones.md` cuando esa documentación se cree en PR 4. <!-- sdd-owner: implementation -->

Deferred lifecycle actions remain parent-owned and unchanged.

---

## Ordinary-review correction `review-c3213ff3c6afbb4a`

Corrected the two severe preservation-harness findings without changing migration SQL, runtime consumers, PR 3, or shared Supabase:

- Target validation now uses the effective `pg-connection-string` result and requires an exact authorized host, database, and port `55432`; a different loopback port fails before connection/reset. Test vectors use non-secret placeholder credentials and case labels never render URLs.
- The deterministic historical fixture now includes one platform `superadmin` role and one vehicle event. Post-migration assertions require their exact row/UUID values and prove the event still references the expected vehicle and household.
- The post-connect `current_database()` check remains immediately before the schema reset. The exact integration task remains `[x]` after observed preservation evidence.

Strict TDD evidence: wrong-port RED failed because the previous guard accepted `127.0.0.1:55433`. A dedicated PostgreSQL RED without the new historical fixture produced `platform_role_ok=false` and `vehicle_event_relationship_ok=false`. Restoring the minimal fixture produced two consecutive focused GREEN runs, each 15/15.

The target was reverified as container `family-app-modularization-pg16`, binding `127.0.0.1:55432`, and database `family_app_modularization_test_review_da7a7c22062311e6`. Validation used a random ephemeral login and secret that were neither printed nor persisted. The temporary role owned only the dedicated database during each run; membership needed by historical `OWNER TO postgres` statements existed only for the test window. Guaranteed cleanup removed the role, restored database owner `postgres`, preserved the original null database ACL, and recreated the empty `public` schema. Final cleanup proof was `role absent=true`, `owner restored=postgres`, `database ACL=<null>`.

Validation: focused PostgreSQL test 15/15 twice after RED; `npm test` 48 passed/1 skipped with 373 passed/16 skipped; `git diff --check` passed. Correction delta is 65 changed lines relative to the frozen candidate, within the 137-line correction budget.

Remaining warnings: ordinary `npm test` intentionally skips the database-backed case without its dedicated URL; PR 2/PR 3 still require coordinated activation; all other unchecked PR 2 tasks and parent lifecycle gates remain unchanged.

---

## PR2B-v2 — reconstrucción local aprobada y evidencia sincronizada

**Alcance de esta entrada:** sincronización documental posterior al ciclo local aprobado; no se modificaron código, paquetes, CI, índice, rama, commits, reseñas ni servicios, y esta fase no ejecutó pruebas.

- **Rama y procedencia:** `test/family-app-modularization-pr2-integration-v2`; base PR2A `eea99df`; PR2B original `9ffb336` se aplicó con `cherry-pick -n` y produjo inicialmente el árbol idéntico. La adaptación posterior se limitó al harness de migración.
- **Sustitución explícita y limitada:** para la verificación actual, sustituye la referencia operativa a PostgreSQL 16 independiente persistente en `127.0.0.1:55432` por Supabase local completo con PostgreSQL 17 en `127.0.0.1:54322`. No sustituye la evidencia histórica ni las garantías de destino dedicado.
- **Destino y aislamiento:** base exacta `family_app_modularization_test_review_da7a7c22062311e6`; el harness sigue rechazando `postgres` u otra base, host remoto u override por query, puerto incorrecto y socket Unix. La recreación de `public` concede `USAGE, CREATE` al rol administrado `postgres`, requisito de `ALTER FUNCTION ... OWNER TO postgres` histórico.
- **TDD recibido:** RED1 14/15 por contrato anterior de 55432; RED2 14/15 por requisito temporal de `SET ROLE postgres`; RED3 14/15 por `permission denied for schema public`; GREEN 15/15. La evidencia aprobada cubre rollback, preservación de datos, postcondiciones y objetos `mv_*` ajenos.
- **Limpieza aprobada:** se crearon rol y base temporales exactos dentro de Supabase local mediante `supabase_admin`; no se tocaron esquemas del `postgres` principal. El intento parcial de crear el rol se revirtió de inmediato. La limpieza final eliminó ambos recursos y verificó `database=0`, `role=0`, sin residuos.
- **Presupuesto PR2B-v2:** pronóstico antes de esta sincronización `+301/-11 = 312` líneas frente a PR2A; actual final `+315/-11 = 326` con tracked, staged y untracked incluidos, límite `<=400`.
- **Pendiente:** validación/revisión combinada sobre `main` y commit siguen siendo acciones del responsable; ninguna checkbox se marca solo por esta reconstrucción. Las tareas de implementación no completadas y las acciones parent-owned permanecen exactamente como están en `tasks.md`.

---

## Corrección de revisión escalada `review-pr33-v3-corrected-20260721`

La corrección hace explícito que el marcador persistente autoriza a desechar **todo** el contenido de la base dedicada exacta. La primera adopción exige mediante catálogos que `public` no tenga relaciones ni rutinas y que `auth` no exista; el marcador vincula nombre de base y propiedad completa, y exige una única fila exacta. El SQL cargado desde el repositorio se valida antes de ejecutarse con la conexión administrativa y rechaza operaciones de rol/usuario/grupo, base, tablespace, sistema, extensión/carga, membresía y `COPY PROGRAM`. Los advisory locks pasan a adquisición no bloqueante con error accionable, liberación garantizada y cierre seguro. La validación de URL ya no usa una expresión con coma.

Evidencia estricta recibida para esta corrección: RED dirigido **18/19**, con fallo por ausencia de `fam_hogares`; GREEN PostgreSQL dirigido corregido **19/19**; `npx tsc --noEmit` aprobado; suite estándar completa **377 aprobadas, 16 omitidas**; build aprobado. La fixture histórica dedicada `supabase/validation/pre-family-app-modularization-fixtures.sql` fue añadida para preservar exactamente el estado previo a migración. Esta entrada agrega evidencia y no reescribe registros anteriores.

---

## PR33-v3 — aislamiento final con privilegios mínimos

Esta entrada sustituye operativamente el diseño de marcador descrito arriba, sin borrar su historial. Cada ejecución recrea únicamente la base loopback de nombre fijo y ejecuta migraciones y fixtures con un runner `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`, `NOREPLICATION` y `NOBYPASSRLS`, sin membresías ni configuración persistente. La conexión administrativa solo adquiere el bloqueo, recrea la base exacta y concede capacidades limitadas dentro de ella. Las cláusulas históricas `OWNER TO postgres` se adaptan exclusivamente en copias de ejecución, fuera de strings, comentarios y bloques dollar-quoted; el SQL original sigue alimentando las aserciones estáticas.

Evidencia final: PostgreSQL dirigido **19/19**, `npx tsc --noEmit` aprobado, suite estándar **377 aprobadas y 16 omitidas**, y build de producción aprobado. No se creó ningún worktree adicional y `tsconfig.tsbuildinfo` fue restaurado exactamente tras la validación.

---

## PR 2 — sincronización de evidencia de atomicidad/concurrencia (PR #38)

**Alcance:** sincronización de artefactos únicamente; no se modificó código, pruebas, base de datos, contenedores ni servicios.

- **Tarea completada y checkbox persistido:** `Crear pruebas de atomicidad observable...` está ahora en `[x]` en `tasks.md`.
- **Implementación verificada:** `src/compartido/pruebas/migracion-family-app-atomicidad-concurrencia.test.ts`, incorporado por `b78c911` (`test(database): cover migration atomicity under concurrency`) y contenido en el merge `c4a342eaa38bc410ba2205215eed674586a5f0b3` / PR #38. `main` y `origin/main` resuelven ambos al merge.
- **Corrección vigente (sustituye las afirmaciones de completitud anteriores de esta sección):** la cobertura/evidencia es parcial: verifica rollback ante `lock_timeout` (`55P03`) y `statement_timeout` (`57014`), además de visibilidad antes/después, pero no observa accesos durante los renombres ni varía el orden de locks para demostrar ausencia de deadlock; por ello la tarea permanece pendiente `[ ]`.
- **TDD Cycle Evidence:** RED y GREEN ocurrieron en el work unit incorporado; esta sincronización no reejecuta pruebas porque no cambia comportamiento y conserva su evidencia durable. No hay desviación de diseño.
- **Fuera de alcance / pendiente:** las tareas PR 2 de preflight, rollback/fix-forward, catálogo y determinismo, más los demás ítems sin marcar y todos los gates parent-owned, permanecen sin cambios. PR 2 y PR 3 siguen requiriendo activación coordinada.
- **Verificación de sincronización:** se releyeron `tasks.md` y este progreso; `git diff --check` pasó tras ambos cambios. Límite/PR: `feature-branch-chain`; esta entrada solo sincroniza el work unit ya merged y no abre una nueva frontera de entrega.

---

## Apply gate — atomicity/concurrency completion correction

```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
nextRecommended: apply
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
```

No code or test was edited. The authoritative task is visibly pending: `Crear pruebas de atomicidad observable... <!-- sdd-owner: implementation; evidence-status: partial -->`. The parent supplied `auto-forecast`, but the workload guard requires an explicit resolved delivery path because the task forecast says both `Chained PRs recommended: Yes` and `400-line budget risk: High`. The requested one-work-unit scope does not identify the required delivery mode (`auto-chain` with the PR boundary, or an explicit `size:exception`/`exception-ok`).

Verified before stopping: `HEAD` and `main` are `d552c0bb72e5ae19ed3f6a96acd57c2396ff4ad3`, which contains the required base; the workspace has no reported changes; the task remains `[ ]`. Required implementation evidence is still missing: (1) reader/writer observations while rename execution is in progress, with no mixed contract; and (2) varied lock ordering that detects a lock-order regression/deadlock. Parent-owned lifecycle rows remain unchanged.

TDD did not start because the workload gate blocked before the RED edit. No checkbox was updated. Engram progress mirror is updated cumulatively with this decision.

---

## PR 2 — atomicidad/concurrencia: evidencia completa del corte aislado

### Estado y límite de entrega
```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
nextRecommended: apply
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
delivery: { mode: isolated-slice, capChangedLines: 400 }
```
La decisión posterior aprobó este slice aislado. Solo se completó la tarea de atomicidad/concurrencia; no se mezcló preflight, rollback/fix-forward, catálogo, consumidores ni acciones parent-owned.

### Tarea completada y checkbox persistido
- [x] Crear pruebas de atomicidad observable que fallen si un lector/escritor concurrente ve una mezcla de objetos `mv_*`/`fam_*`, si el orden de locks permite deadlock, o si `lock_timeout`/`statement_timeout` deja renombres parciales en lugar de rollback completo. <!-- sdd-owner: implementation; evidence-status: complete -->

`tasks.md` se actualizó inmediatamente y se releerá antes de cerrar. No se modificó ninguna fila parent-owned.

### TDD Cycle Evidence
| Fase | Evidencia |
|---|---|
| RED | La nueva observación de renombre activo falló: `La migración no alcanzó la ventana observable después del primer renombre`. El primer detector dependía del texto de la consulta completa de PostgreSQL y no podía observar la ventana. |
| GREEN | La instrumentación solo de prueba etiqueta la sesión después del primer `ALTER TABLE ... RENAME` y durante `pg_sleep(0.25)`. Durante esa ventana, lector (`SELECT` sobre `mv_vehiculos`) y escritor (`UPDATE` sobre `mv_vehiculos`) con `lock_timeout` reciben ambos `55P03`; no pueden observar un contrato mezclado. Tras el commit, el observador ve únicamente los cinco `fam_*`. |
| TRIANGULATE | El caso de orden canónico contra orden inverso, instrumentado en dos migradores, produce exactamente un `40P01` y un commit; eso demuestra que el test es sensible a la regresión de orden, mientras el caso preexistente de dos migraciones canónicas conserva ausencia de `40P01`. El caso de `statement_timeout` sigue probando rollback completo con `57014`. |
| REFACTOR | Se extrajeron helpers locales para esperar la ventana y construir el orden de locks instrumentado. No cambió SQL productivo, runtime, fixtures, servicios ni la base compartida. |

### Verificación
- `SUPABASE_BOOTSTRAP_DATABASE_URL=<postgres local exacto> npx vitest run src/compartido/pruebas/migracion-family-app-atomicidad-concurrencia.test.ts` — RED: 1 fallo / 3 pasan; GREEN: 4/4 pasan con PostgreSQL local aislado.
- `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — 18 pasan, 1 omitido.
- `npm test` — 48 archivos pasan, 3 omitidos; 377 pasan, 21 omitidos.
- `npx tsc --noEmit` — pasa; `tsconfig.tsbuildinfo` se restauró si era necesario.
- `git diff --check` — pasa.

### Alcance, desviaciones y pendientes
Sin desviación de diseño. Los accesos bloqueados se realizan mientras la migración está activa después del primer renombre; el observador no ve un estado mixto y, después del commit, ve solo el contrato final. El test de orden inverso es deliberadamente una mutación de prueba para probar sensibilidad a deadlock, no una ruta productiva.

Límite/revisión: slice aislado, máximo 400 líneas. Rutas cambiadas: `src/compartido/pruebas/migracion-family-app-atomicidad-concurrencia.test.ts`, `openspec/changes/family-app-modularization/tasks.md`, `openspec/changes/family-app-modularization/apply-progress.md`. Permanecen sin marcar todas las otras tareas PR 2–4 y las acciones parent-owned; la siguiente unidad debe ser una sola de esas tareas.

---

## Corrección acotada `review-atomicity-concurrency-20260724`

`RELIABILITY-001` sustituye los sleeps de 25/150 ms por una barrera observable: el observador retiene dos advisory locks transaccionales, verifica en `pg_locks` que los dos PID exactos poseen sus primeros `ACCESS EXCLUSIVE`, y solo entonces libera ambos migradores. La mutación desactiva localmente `lock_timeout` y `statement_timeout`, por lo que el único desenlace de contención aceptado sigue siendo un `40P01` y un commit; no cambia configuración persistente ni SQL productivo.

RED dirigido: con `lock_timeout='10ms'`, el test anterior falló 1/4 porque no produjo ningún `40P01`. GREEN: 4/4. TRIANGULATE: cinco ejecuciones consecutivas 4/4; regresión de migración 18/18 con 1 omitida; `npm test` 377/377 con 21 omitidas; `npx tsc --noEmit --incremental false` pasó sin alterar `tsconfig.tsbuildinfo` (`cfb091047a753450fdc41b99b4b9f835fa98a1b6`); `git diff --check` pasó. La tarea de atomicidad/concurrencia permanece `[x]`; no cambió ninguna otra checkbox.

---

## Apply forecast — PR 2 preflight evidence blocked before RED

```yaml
schemaName: gentle-ai.sdd-status
changeName: family-app-modularization
artifactStore: both
applyState: ready
nextRecommended: resolve-delivery-path
actionContext: { mode: repo-local, workspaceRoot: /home/josep/proyectos/family-app, allowedEditRoots: [/home/josep/proyectos/family-app] }
warning: "No production/test edit was made; the next unchecked task exceeds the 400-line work-unit cap."
```

Selected first dependency-ready unchecked implementation row after atomicity/concurrency: `Crear pruebas de preflight que fallen ante objetos fam_* conflictivos, consumidores externos mv_* no clasificados, invariantes rotas, backup no recuperable o dependencias de catálogo no inventariadas.` It requires five independently observable failure modes spanning an operational preflight runner, PostgreSQL catalog/dependency queries, backup-evidence intake, external-consumer classification, and focused isolated-database tests. Existing migration and RLS scripts have no such shared preflight surface; the migration checks only source/final table presence.

Forecast before code edits: **approximately 470–560 changed lines** (preflight implementation 210–260, focused RED/GREEN/triangulation tests 180–220, task/progress evidence 80). This cannot fit the hard 400-line budget and no size exception is authorized. Strict TDD did not start: no RED test, production change, test command, database operation, or checkbox update occurred. `tsconfig.tsbuildinfo` remains unmodified.

Required minimal delivery boundary: **PR 2C-1 — catalog-only preflight** (conflicting `fam_*` objects, target OID/definition inventory, dependencies via `pg_depend`, and explicit failure when a required catalog record is absent), estimated **300–360 lines** including tests/evidence. Defer backup recoverability, external consumer classification, and data-invariant checks to PR 2C-2; those require a separate operational evidence contract. Parent-owned activation rows remain unchanged.

---

## PR 2C-1 — catálogo preflight aislado (completado como slice parcial)

Esta entrada **sustituye el pronóstico anterior con el resultado real**: se implementó exclusivamente el inventario de catálogo. `supabase/validation/preflight-catalogo-family-app.ts` consulta sin mutar las cinco tablas origen `mv_*`, inventaría sus OIDs, propietario y definición de columnas, rechaza cualquier objeto final `fam_*` conflictivo e inventaría dependencias de `pg_depend`, incluidas definiciones de índices. Falla cerrado si falta una tabla fuente requerida o si existe un contrato final conflictivo.

### TDD Cycle Evidence
| Fase | Evidencia |
|---|---|
| Safety net | `npx vitest run src/compartido/pruebas/migracion-family-app-modularization.test.ts` — 18 pasan, 1 omitida. |
| RED | El nuevo test `preflight-catalogo-family-app.test.ts` falló al no existir el módulo de producción. |
| GREEN | Los tests unitarios enfocados pasaron 3/3 tras la implementación mínima. |
| TRIANGULATE | PostgreSQL loopback aislado: `SUPABASE_BOOTSTRAP_DATABASE_URL=<local 127.0.0.1:54322> npx vitest run ...migracion-family-app-modularization.test.ts ...preflight-catalogo-family-app.test.ts` — 23/23; comprueba inventario real, definición `household_id`, índice dependiente y bloqueo ante `fam_hogares` conflictivo. Los unit tests cubren además una tabla origen faltante. |
| REFACTOR | Las tres consultas se serializaron para no solapar `pg.Client.query()` y el inventario de dependencias pasó de solo relaciones a todos los registros de `pg_depend`, conservando definición de índice cuando aplica. |

Verificación final: `npm test` — 49 archivos pasan, 3 omitidos; 380 pasan, 22 omitidos. `npx tsc --noEmit --incremental false` y `git diff --check` pasan; `tsconfig.tsbuildinfo` permanece igual a `HEAD`.

La checkbox global de preflight permanece **`[ ]`** deliberadamente: PR 2C-1 no cubre backup recuperable, clasificación de consumidores externos ni invariantes amplias; esos criterios siguen diferidos a PR 2C-2. No se modificó ninguna otra checkbox ni acción parent-owned. Sin desviación de diseño, migración productiva, runtime, instancia compartida, commit, push o activación.

### Corrección de gate independiente — semántica completa y orden estable de `pg_depend`

Esta corrección sustituye la afirmación anterior sobre dependencias: el inventario ahora une la referencia a tabla **solo** con `d.refclassid = 'pg_class'::regclass and origen.oid = d.refobjid`, por lo que no atribuye OIDs de otros catálogos a las cinco tablas. Ya no excluye `d.deptype = 'i'`; conserva dependencias internas junto a las demás. Cada salida expone `classid`, `objid`, `objsubid`, `refclassid`, `refobjid`, `refobjsubid`, tipo y definición, y el `ORDER BY` usa todos esos campos como desempate estable.

TDD de corrección: safety net unitario 3/3 y PostgreSQL aislado 20/20. RED: los nuevos expected exactos fallaron porque faltaban las claves de identidad de catálogo. GREEN: el guard de clase de referencia, la inclusión `i` y el mapeo de claves hicieron pasar el unitario 3/3. TRIANGULATE: PostgreSQL loopback 23/23 verifica el orden exacto de las cinco tablas, las dos filas internas de `mv_vehiculos` (`type` y toast), el índice dependiente y el conflicto final. REFACTOR: se eliminaron aserciones `arrayContaining` de estas dependencias y se conservaron representaciones deterministas. `npm test` sigue en 49 archivos/380 tests pasados (3/22 omitidos); TypeScript incremental false y diff check pasan, sin cambio de `tsconfig.tsbuildinfo`.

La checkbox global sigue `[ ]` y PR 2C-2 sigue siendo necesaria; esta corrección no añadió backup, consumidores externos, invariantes amplias ni otro criterio.

### Corrección acotada RELIABILITY-001 — conflictos del namespace de tipos

La detección final consulta ahora `pg_type` unido a su `pg_namespace`, conserva el OID exacto y ordena por nombre y OID. Así bloquea tanto el row type de una relación final existente como un tipo independiente `public.fam_*`, cualquiera de los cuales impide el renombre de tabla; no añade criterios diferidos de PR 2C-2.

TDD estricto: RED unitario 1/3 por contrato todavía basado en `pg_class`; RED PostgreSQL 19/20 porque un enum independiente `public.fam_hogares` no fue detectado. GREEN: unitario 3/3 y PostgreSQL loopback aislado 20/20. La triangulación conserva el caso de tabla conflictiva y fija en el unitario el uso de `pg_type`, la ausencia de `pg_class` y el orden determinista.

Verificación: `npm test` — 49 archivos aprobados, 3 omitidos; 380 tests aprobados, 22 omitidos. `npx tsc --noEmit --incremental false` aprobó. La checkbox global de preflight permanece `[ ]`; backup recuperable, consumidores externos e invariantes amplias siguen en PR 2C-2.
