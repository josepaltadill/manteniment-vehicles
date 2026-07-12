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
