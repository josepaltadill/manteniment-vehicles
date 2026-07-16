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
