# Apply progress — PR/cut 1 remediation

## Status

**BLOCKED.** Cut 1 remains non-zero and does not authorize deployment. WU-5 sequential matrix now passes in local/ephemeral Supabase; the remaining blocker is WU-7/WU-8 concurrency. Supabase CLI 2.109.1 and Docker are available; the harness was adjusted for the CLI's wildcard local bindings, secret-bearing start output, and explicit PostgreSQL identity.

## Implemented

- Fail-closed rejection of Docker routing/TLS environment variables before tool invocation.
- Active Docker context endpoint verification; only a local Unix socket is accepted before `supabase start`.
- Database-container discovery filtered by project ownership plus DB service label/name, with ambiguity blocked.
- Cleanup preserves the workspace and reports `BLOCKED` when scoped `supabase stop --workdir` fails.
- RLS `WITH CHECK` denials for insert/cross-household update now expect SQLSTATE `42501`; row counts remain for `USING` visibility cases.
- Deterministic fake-tool tests prove Docker routing guards do not run `supabase start`, `docker exec`, or `supabase stop`.
- Fake-tool coverage now also blocks an unavailable Docker daemon after Supabase/version checks, and zero, multiple, or ownership-ambiguous DB candidates before SQL or cleanup mutation.
- Cleanup stop failure preserves the workspace for inspection; failed or ownership-blocked cleanup forces non-zero exit if a future completed main validation would otherwise return zero.
- WU-6 and the PR 1 boundary now describe the sequential matrix as complete while retaining WU-7/WU-8 concurrency as the deployment blocker.
- `supabase start` stdout/stderr is captured in a mode-600 workspace log and is never replayed; `supabase status` is not invoked.
- CLI 2.109.1 wildcard host bindings (`0.0.0.0`/`[::]`) are accepted with an explicit warning only after proving a local Unix Docker endpoint and exact ephemeral-project container ownership. Remote endpoints, external routing inputs, wrong ownership, and ambiguous DB candidates still block.
- Every in-container `psql` invocation now explicitly selects `-U postgres -d postgres`, including both guard identity queries and the migration, fixture, and assertion execution paths. Deterministic fake-Docker coverage verifies all five invocations and preserves secret-capture and cleanup assertions.

## Sequential matrix actually covered

WU-5 is complete. The local/ephemeral runtime matrix covers anon denial; non-member visibility and vehicle denial; editor A vehicle/event visibility and allowed/denied mutations; admin A household, membership, vehicle and event operations; admin B mirror/isolation; membership policies; cross-household `using`/`with check`; FK and check constraints; duplicate plate semantics; last-admin delete/demote/move rejection; allowed changes when a second admin remains; privileged post-negative state checks; and explicit household deletion cascade for members, vehicles and events.

## Validation evidence

| Check | Result |
|---|---|
| Strict TDD RED | PASS — the explicit DB identity assertion failed before implementation because the two guard `psql` invocations omitted `-U postgres -d postgres`. |
| Strict TDD GREEN | PASS — all five fake-Docker `psql` invocations explicitly contain `-U postgres -d postgres`; 7 files, 55 tests pass. |
| `npm test` | PASS — 7 files, 55 tests. |
| `bash -n scripts/validate-supabase-rls.sh` | PASS. |
| `git diff --check` | PASS after the final implementation and progress-note updates. |
| `./scripts/validate-supabase-rls.sh` | PASS/BLOCKED as designed for cut 1: preflight passed, local ephemeral Supabase started with secret output captured, ownership guard passed, migration and fixtures applied, full WU-5 sequential matrix passed, cleanup stopped the owned runtime and removed its workspace; final exit remained `1` because `concurrency=pending`. |

## Residual blockers

- `BLOCKED: concurrency pending` — WU-7/WU-8 are not part of cut 1.
- The explicit PostgreSQL identity fix was exercised against a real local container: guard identity queries passed and SQL execution reached migration, fixtures, and assertions.
- Runtime cleanup succeeded for the final run: the owned ephemeral Supabase project was stopped and no `mv-rls-validation` containers remained active.

Earlier generated runtimes that reached container startup were manually stopped through proven workdirs when ownership could be established. No MCP, remote target, shared Supabase, or product migration mutation occurred.

## WU-5 continuation and cascade schema fix

The remaining sequential cases were added under strict TDD, including admin B isolation, event and membership policy operations, remaining check constraints, last-admin demote/transfer and allowed-second-admin paths, privileged post-negative state checks, and explicit household-delete cascade verification. The harness also now propagates a failed migration/fixture/assertion `psql` step instead of incorrectly reporting a sequential-matrix pass.

The first local/ephemeral continuation run exposed a **product migration defect**: `mv_vehiculos.household_id` referenced `mv_households(id)` without `ON DELETE CASCADE`, so explicit household deletion failed with SQLSTATE `23503`. The product migration was then updated so household deletion cascades to vehicles and events. The cascade assertion now deletes the household as authenticated `admin_b`, then resets to privileged inspection for postconditions, proving the externally visible RLS contract as well as FK mechanics.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| WU-5 sequential matrix | `src/compartido/pruebas/validate-supabase-rls.test.ts` + ephemeral Supabase | Unit + runtime integration | PASS — 16 focused tests | PASS — case-contract test failed for missing admin-B/event/membership/integrity/last-admin/cascade IDs | PASS — 17 focused tests after SQL matrix additions | PASS — runtime exercised each added case; discovered cascade failure, then passed after schema fix | Cascade assertion changed to execute household deletion as authenticated `admin_b` |
| Harness SQL failure propagation | `src/compartido/pruebas/validate-supabase-rls.test.ts` | Unit + runtime integration | PASS — 17 focused tests | PASS — harness contract test failed because `run_sql` failures did not return from the sequential phase | PASS — 18 focused tests after explicit returns | PASS — real assertion failure surfaced as `FAIL|sql|sql`, not a false matrix pass | None — stopped on schema defect |

### Continuation validation evidence

| Check | Result |
|---|---|
| Focused `npm test -- src/compartido/pruebas/validate-supabase-rls.test.ts` | PASS — 18 tests after GREEN. |
| `bash -n scripts/validate-supabase-rls.sh` | PASS. |
| `git diff --check` | PASS before the final runtime run. |
| `./scripts/validate-supabase-rls.sh` | PASS/BLOCKED as intended after schema fix: all WU-5 RLS/integrity/last-admin/cascade cases passed, cleanup stopped the owned runtime and no `mv-rls-validation` containers remained. Exit `1` only because concurrency remains pending. |

### Remaining work

- [ ] WU-7/WU-8 concurrency remain intentionally out of scope and pending.
