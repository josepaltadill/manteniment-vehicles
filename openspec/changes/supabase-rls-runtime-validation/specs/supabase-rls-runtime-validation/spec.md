# Supabase RLS Runtime Validation Specification

## Purpose

The project MUST provide a safe, reproducible runtime validation harness for the existing `mv_*` Supabase migration, restricted to a demonstrably local or ephemeral environment. Real or shared Supabase mutation remains out of scope.

## Requirements

### Requirement: Fail-closed preflight and destination safety

The harness MUST report Supabase CLI and Docker availability and exact versions before mutation. It MUST reject missing or unusable tools, remote/shared/MCP/ambiguous destinations, shared credentials, and any destination not proven to belong to the harness-created local or ephemeral runtime. A failed guard MUST return non-zero and perform no mutation or cleanup.

#### Scenario: Unsafe destination

- GIVEN a destination that cannot be proven local and ephemeral
- WHEN validation starts
- THEN it fails closed before applying migrations, creating fixtures, or deleting resources

### Requirement: Runtime authorization and integrity matrix

The harness MUST apply the existing migration from a clean disposable runtime and test `anon`, non-member, `editor`, and `admin` across two households. The matrix MUST cover row visibility and writes through `using` and `with check`, cross-household attempts, the composed household/vehicle foreign key, defined checks, and unique `(household_id, matricula)`.

#### Scenario: Cross-household and invalid data attempts

- GIVEN valid fixtures for two households
- WHEN an actor attempts unauthorized access, a cross-household insert/update, an incompatible event/vehicle relationship, invalid checked values, or a duplicate plate within one household
- THEN the operation is rejected and no invalid or cross-household state remains

### Requirement: Last-admin safety and concurrency gate

The harness MUST verify rejection of deleting, demoting, or moving the last administrator, acceptance when another administrator remains, and the permitted explicit household deletion behavior. Concurrent last-admin removal MUST be validated with two sessions before production authorization. If deferred from the first implementation slice, it MUST remain an explicit production blocker.

#### Scenario: Concurrent removal

- GIVEN two concurrent sessions attempting last-admin removal in one household
- WHEN both operations execute
- THEN the final state retains at least one administrator and the validation does not report success unless the invariant is proven

### Requirement: Reproducible evidence and bounded cleanup

The result MUST include the exact command, tool/runtime versions, non-secret environment identity, cases, expected and observed outcomes, failures, and exit status. Volatile outputs MUST NOT be committed by default. Apply progress MUST contain the reproducible command, concise manual summary, matrix status, and blockers. Cleanup MUST remove only resources created and identified by the harness.

#### Scenario: Complete evidence

- GIVEN all mandatory cases pass, including concurrency
- WHEN a reviewer reruns the command from a clean repository
- THEN the evidence is sufficient to approve the runtime gate without exposing secrets

## Explicit non-goals

- Real, shared, persistent, or MCP Supabase targets.
- Functional schema changes, TypeScript adapters, UI, permanent seeds, product bootstrap, domain RPCs, or production recovery validation.
