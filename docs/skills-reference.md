# Skills Reference Guide

This document mirrors the current frontend and backend architecture skills used in this repository.

It is intentionally detailed so it can function as:
- onboarding context,
- architecture guardrails,
- a practical placement guide for daily implementation and refactoring.

## Source Skills

- Frontend skill: `/Users/jasonnathan/.codex/skills/frontend-slice-architecture/SKILL.md`
- Backend skill: `/Users/jasonnathan/.codex/skills/backend-slice-architecture/SKILL.md`

## Why These Skills Exist

The repo has sustained delivery pressure, multiple runtime concerns, and a large enough surface area that ad-hoc folder decisions quickly create hunt-time and coupling drift.

The skills define lightweight operating rules that keep code:
- legible,
- package-ready,
- easy to move without trauma,
- safe to evolve incrementally.

They are not strict doctrine checklists.
They are practical rules for predictable change.

## Shared Mental Model

### Two homes

Across frontend and backend, most code should end up in one of two homes:

1. Feature/capability-local (default)
- New behavior starts here.
- The module owns its internals.

2. Global agnostic (earned)
- Only promoted code that is truly reusable and stable.
- Not a dumping ground for convenience abstractions.

### One direction of travel

Direction is feature -> global via promotion when repetition is visible and painful.

Avoid speculative shared abstractions.

### Explicit orchestration

Cross-feature/cross-capability stories are orchestrated in dedicated orchestration surfaces.

Feature modules expose behavior.
Orchestration composes behavior.

## Frontend Architecture (Skill-Aligned)

### What "feature-first frontend" means here

Frontend work defaults to `apps/admin-web/src/features/*`.

A feature contains:
- local UI,
- local hooks,
- local state,
- local service wrappers/mappers,
- a stable public API entry (`index.js` or `index.ts`).

### Frontend orchestration surface

Top-level route/screen composition lives in scenes:
- `apps/admin-web/src/scenes/*`

Scenes are responsible for:
- page-level composition,
- routing and shell composition,
- cross-feature assembly for a pathname/screen.

Scenes are not a place for deep feature internals.

### Frontend global layers (earned)

- `apps/admin-web/src/components/*`: agnostic UI primitives/layout
- `apps/admin-web/src/hooks/*`: cross-feature hooks only

Rules:
- shared components should not encode feature workflows,
- shared hooks should not become a hidden orchestration layer,
- default placement remains feature-local until promotion is justified.

### Frontend public import contract

Allowed:
- import from feature root/public surface
- import from global agnostic primitives/hooks

Disallowed:
- deep imports into another feature's internals

If a consumer repeatedly needs internals, the feature public surface is incomplete and should be updated.

### Frontend path map in this repo

- Scenes: `apps/admin-web/src/scenes/`
- Features: `apps/admin-web/src/features/`
- Global components: `apps/admin-web/src/components/`
- Global hooks: `apps/admin-web/src/hooks/`
- Frontend tests: `apps/admin-web/test/`

## Backend Architecture (Skill-Aligned)

### What "feature-first backend" means here

Backend behavior should live by default in capability packages under `packages/*`.

Current primary capability slices include:
- `packages/content/src/`
- `packages/auth/src/`
- `packages/wp-core/src/`

Capability packages should own:
- rules and behavior,
- internal implementation,
- clear public surfaces.

### Backend orchestration surface

Cross-capability flows live in:
- `apps/api/src/orchestration/`

Orchestration responsibilities:
- sequence capability calls,
- model workflow outcomes,
- handle cross-cutting flow concerns (idempotency/retries/workflow shape).

Orchestration should remain thin and avoid absorbing feature rules.

### Backend delivery adapters

Delivery channels are adapters, not feature homes.

For HTTP in this repo:
- routes: `apps/api/src/adapters/http/routes/`
- controllers: `apps/api/src/adapters/http/controllers/`

Controllers are request/response adapters and should stay thin:
- validate/map request input,
- call orchestration/capability entrypoints,
- map outputs to transport envelopes.

### Backend composition root

App wiring and bootstrap:
- `apps/api/src/app/`

Examples include handler creation and runtime wiring.

### Backend global agnostic packages (earned)

These provide cross-cutting or platform plumbing and must stay capability-agnostic:
- `packages/api-core/src/`
- `packages/platform-base/src/`
- `packages/cloudflare/src/`
- `packages/domain/src/`
- `packages/hooks/src/`
- `packages/testing/src/`

Only promote code here when repetition and stability justify it.

## Current Monorepo Mapping

The repo follows a practical `apps/* + packages/*` model:

### `apps/*`

Runtime entrypoints and delivery surfaces.

`apps/api` includes:
- inbound adapters (HTTP route/controller layer),
- orchestration/workflows,
- app composition/bootstrap.

`apps/admin-web` includes:
- UI delivery/runtime shell,
- scene composition,
- feature wiring for web admin flows.

### `packages/*`

Extractable capability and platform slices.

- Capabilities (default behavior home): content/auth/wp-core
- Platform/cross-cutting plumbing (earned): api-core/platform-base/cloudflare/domain/hooks/testing

## Decision Rules (Practical)

### Placement rules

Default to feature/capability-local placement.

Move to global only if all are true:
- no business semantics,
- reusable across multiple modules without leaking assumptions,
- stable behavior,
- duplication would harm correctness/security/consistency.

### Promotion rules

Promote only when:
- repetition appears in 2+ places,
- repeated edits are creating friction,
- abstraction is obvious (not speculative).

### Dependency rules

Allowed:
- orchestration -> capability public surfaces
- features/capabilities -> global agnostic packages
- scenes -> frontend feature public surfaces

Disallowed:
- deep-importing feature internals across boundaries
- feature-to-feature internal coupling
- using global layers as orchestration dumping grounds

### No nesting rule

If something appears as a sub-feature/sub-capability:
- split into sibling feature/capability modules,
- move coordination to scenes (frontend) or orchestration (backend).

## Delivery Channels and Adapters

API/SDK/CLI are delivery adapters over orchestration and capabilities.

They are not feature homes.

In this repo:
- HTTP API adapters live under `apps/api/src/adapters/http/`
- Admin API client adapter lives under `apps/admin-web/src/adapters/`

Transport contracts should be explicit.

## Anti-Patterns (Action Triggers)

### Frontend anti-patterns

- cross-feature deep imports,
- global hooks coordinating many features,
- scenes owning feature internals,
- shared components containing feature workflow logic.

### Backend anti-patterns

- business rules in HTTP controllers,
- orchestration becoming a monolith of feature logic,
- premature global abstractions,
- capability behavior parked in app-local files when it belongs in package slices.

### Shared anti-patterns

- one change requiring hunt across unrelated folders,
- repeated boundary exceptions "just this once",
- unclear or missing public surfaces.

## Amber and Red Flags

### Amber (watch)

- simple changes touch too many modules,
- cross-boundary imports start appearing,
- onboarding feedback says "hard to find where behavior starts",
- orchestration/scenes grow quickly.

### Red (act)

- deep imports normalized,
- large god-files (roughly ~1K SLOC as smoke alarm),
- orchestration/scenes becoming rule sinks,
- CI slowdown and long-lived branch compensation.

## Standard Responses to Smells

- Duplication appears: keep local until repetition is obvious, then promote.
- Module grows too large: split into sibling feature/capability modules.
- Orchestration/scene too large: split workflows/scenes and push rules down.
- Cross-import drift: enforce public surfaces and refactor offenders immediately.

## Testing and Validation Expectations

### Placement expectations

- Capability tests should live with capability packages.
- App/orchestration tests should live with app runtime surfaces.
- Shared testing utilities/fixtures may live in `packages/testing`.

### Behavioral validation

Before merging architecture-affecting changes:
- run lint,
- run unit/integration tests relevant to touched surfaces,
- verify boundary/import rules still hold,
- verify public exports are updated for moved/renamed surfaces.

## Review Checklist

Use this quick checklist in PR review:

1. Does new behavior start in the relevant feature/capability?
2. Is cross-module coordination in scenes/orchestration (not internals)?
3. Are controllers/adapters thin and transport-focused?
4. Are public surfaces explicit and used by consumers?
5. Are deep imports absent?
6. Was promotion to shared layers earned by repetition?
7. Can a new engineer trace one lifecycle without folder hunting?

If any answer is "no", boundary placement likely needs correction.

## Repo Path Reference (Current)

- Backend HTTP routes: `apps/api/src/adapters/http/routes/`
- Backend HTTP controllers: `apps/api/src/adapters/http/controllers/`
- Backend orchestration: `apps/api/src/orchestration/`
- Backend app composition: `apps/api/src/app/`
- Backend tests: `apps/api/test/`

- Frontend scenes: `apps/admin-web/src/scenes/`
- Frontend features: `apps/admin-web/src/features/`
- Frontend shared components: `apps/admin-web/src/components/`
- Frontend shared hooks: `apps/admin-web/src/hooks/`
- Frontend tests: `apps/admin-web/test/`

- Core capability/platform packages: `packages/*/src/`

## Notes on Incremental Migration

The architecture supports incremental migration.

Do not require big-bang folder moves.
Move code when touched, while enforcing boundary and public-surface rules for all new or modified work.

The goal is steady convergence toward clearer boundaries, not ceremonial rewrites.
