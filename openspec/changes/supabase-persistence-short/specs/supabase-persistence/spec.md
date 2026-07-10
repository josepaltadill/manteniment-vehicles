# Supabase Persistence Specification

## Purpose

This capability specification is the normative source of truth for requirements and scenarios. The root `spec.md` is a human-readable companion.

This change MUST define the first reviewable Supabase persistence slice for vehicles and events, limited to versioned SQL migration design, RLS, guardrails, and validation without mutating the real database.

## Requirements

### Requirement: Application Objects Are Prefixed

The system MUST define only application-owned objects with the `mv_` prefix in this slice.

#### Scenario: Migration is scoped to this app

- GIVEN a versioned SQL migration file
- WHEN its contents are reviewed
- THEN every application-owned table, policy, index, constraint, or function MUST use the `mv_` prefix
- AND it MUST NOT modify or remove unrelated existing public tables.

### Requirement: Minimum Multi-User Model

The system MUST model households, household memberships, vehicles, and vehicle events with `mv_households`, `mv_household_members`, `mv_vehiculos`, and `mv_eventos_vehiculo`.

#### Scenario: Minimum tables exist

- GIVEN the migration SQL
- WHEN the proposed schema is reviewed
- THEN all four minimum tables MUST exist
- AND `mv_vehiculos` and `mv_eventos_vehiculo` MUST have required `household_id` boundaries.

### Requirement: Household Tenancy Boundary

The system MUST guarantee that every vehicle and every event belongs to exactly one household.

#### Scenario: Vehicle belongs to a household

- GIVEN a persisted vehicle
- WHEN its row is reviewed
- THEN it MUST have a valid `household_id`.

#### Scenario: Event belongs to the same household as its vehicle

- GIVEN a vehicle event
- WHEN its relationship to `mv_vehiculos` is validated
- THEN the event MUST reference a vehicle in the same `household_id`
- AND cross-household events MUST be impossible.

### Requirement: Plate Is Unique Per Household

The system MUST prevent duplicate vehicle plates within the same household, including inactive vehicles, through `unique (household_id, matricula)` or an equivalent guarantee.

#### Scenario: Duplicate plate in the same household

- GIVEN a household with vehicle plate `ABC123`
- WHEN another vehicle with the same plate is registered in that household
- THEN persistence MUST reject it.

#### Scenario: Same plate in another household

- GIVEN household A has vehicle plate `ABC123`
- WHEN household B registers a vehicle with the same plate
- THEN the schema MAY allow it
- AND each household's history MUST remain isolated.

### Requirement: Operational Data Integrity

The system MUST reject invalid operational data for vehicles and events.

#### Scenario: Negative values are rejected

- GIVEN a vehicle or event row
- WHEN `kilometros`, `kilometros_actuales`, or `coste` is negative
- THEN persistence MUST reject the row.

#### Scenario: States and types are bounded

- GIVEN a vehicle or event row
- WHEN a vehicle state or event type is provided
- THEN the value MUST belong to the domain's accepted values.

### Requirement: Coherent Household Deletion

Explicit household deletion MUST cascade to its memberships, vehicles, and events. Because PostgreSQL declarative foreign keys cannot distinguish why a parent vehicle was deleted, directly deleting a vehicle also deletes its events; that operation MUST remain restricted to `admin`.

#### Scenario: Explicit household deletion

- GIVEN a household with memberships, vehicles, and events
- WHEN an `admin` explicitly deletes the household
- THEN persistence MUST delete all those children without leaving orphaned rows.

### Requirement: RLS Uses Household Membership

The system MUST enable RLS on every `mv_*` table in this slice and MUST allow access only to authenticated users who are members of the related household.

#### Scenario: Member accesses own household data

- GIVEN an authenticated user with membership in a household
- WHEN they query households, vehicles, or events in that household
- THEN RLS policies MUST allow the appropriate access.

#### Scenario: Non-member cannot access other household data

- GIVEN an authenticated user without membership in a household
- WHEN they try to read, create, update, or delete data for that household
- THEN RLS policies MUST deny access.

#### Scenario: Anonymous user cannot access operational data

- GIVEN an unauthenticated user
- WHEN they try to access `mv_*` tables
- THEN RLS policies MUST deny access.

### Requirement: A Household Retains Its Last Administrator

The system MUST prevent a normal membership update, role downgrade, household move, or deletion from leaving an existing household without at least one `admin`. This invariant MUST be enforced in PostgreSQL and MUST serialize concurrent removals for the same household. Explicit household deletion MAY cascade to its memberships.

#### Scenario: Last administrator cannot be removed

- GIVEN a household has exactly one `admin`
- WHEN that membership is deleted, downgraded, or moved through a normal membership operation
- THEN persistence MUST reject the operation
- AND the household MUST retain its administrator.

#### Scenario: Concurrent removals preserve an administrator

- GIVEN a household has multiple administrators
- WHEN concurrent operations attempt to remove or downgrade them
- THEN operations for that household MUST be serialized sufficiently to prevent a committed state with no administrator.

### Requirement: Migration Guardrails

The system MUST document that this slice explicitly allows `mv_households`, `mv_household_members`, `mv_vehiculos`, and `mv_eventos_vehiculo`, and MUST keep global destructive operations prohibited.

#### Scenario: Checklist reviews dangerous operations

- GIVEN the proposed migration
- WHEN the review checklist is completed
- THEN it MUST confirm absence of `drop schema`, `drop database`, global resets, and unjustified `cascade` operations.

### Requirement: Validation Without Real Supabase Mutation

The system MUST produce review evidence without executing the migration against the real Supabase instance.

#### Scenario: Acceptable validation evidence

- GIVEN this change is under review
- WHEN the migration is validated
- THEN evidence MUST include static SQL review, guardrail checklist review, and RLS review
- AND it MUST NOT include execution against the real database.

### Requirement: Rehearsable Recovery and Release Health

Before a real application, the release MUST have a verified backup, a named responsible operator, and an environment-specific recovery procedure rehearsed in local or ephemeral infrastructure. Recovery SQL MUST preserve business data: prefer additive fix-forward SQL; rollback MUST only remove or reverse objects proven unused and MUST restore from the verified backup rather than truncating or dropping uncertain data.

#### Scenario: Operator chooses recovery action after application

- GIVEN the migration was applied and a defect is detected
- WHEN data remains intact and access can be made safe
- THEN the responsible operator MUST pause writes as needed and prefer reviewed fix-forward SQL
- BUT when data integrity or tenant isolation cannot be guaranteed, the operator MUST enter emergency response and use the rehearsed data-preserving rollback or verified restore procedure.

#### Scenario: Immediate release observation

- GIVEN the migration was applied to a real environment
- WHEN the immediate observation window begins
- THEN the operator MUST monitor database/RLS error rate and database latency against the pre-deployment baseline
- AND an error rate above 1% MUST be investigated
- AND above 2% MUST activate emergency response
- AND above 5% MUST activate all-hands response.

### Requirement: Review Budget Boundary

The complete diff exceeds 400 changed lines because it includes the SDD proposal, specifications, design, tasks, and evidence. A documented size exception MAY keep this learning-oriented artifact bundle in one commit while the implementation payload remains small. TypeScript adapters, UI, or later implementation growth MUST be split into subsequent changes.

#### Scenario: Scope grows beyond this slice

- GIVEN a proposed change adds TypeScript adapters, UI, or real migration execution
- WHEN it is reviewed against this specification
- THEN it MUST be treated as out of scope for this slice.
