# ADR-003: Selection of Cloud Database Access Layer & ORM

## Status
**ACCEPTED** (2026-08-29)

## Context
The GymDeck Cloud Backend requires a type-safe, high-performance database access and migration layer to interface with PostgreSQL for the multi-tenant mobile member API and future cloud synchronization.

We evaluated the two leading TypeScript data access options:
1. **Prisma ORM**
2. **Drizzle ORM**

### Evaluation Criteria
1. **TypeScript Quality & Type Inference**: Zero-code-generation schema typing vs generated client models.
2. **Migration Reliability & Predictability**: Deterministic SQL migrations vs declarative shadow databases.
3. **Performance & Runtime Overhead**: Low memory footprint, cold startup latency on serverless/container runtimes, query overhead.
4. **PostgreSQL Multi-Tenancy**: Ease of enforcing compound multi-tenant query filters (`gym_id` + `member_id`) and Row-Level Security (RLS).
5. **Relational Schema Suitability**: Managing complex relational boundaries (members, attendance, payments, workout logs, PT sessions).
6. **Future Desktop/Cloud Synchronization**: Compatibility with SQLite syntax and portability across engines.

---

## Evaluation Comparison

| Evaluation Metric | Prisma ORM | Drizzle ORM | Winner |
| :--- | :--- | :--- | :--- |
| **Runtime Overhead** | Rust engine binary (`prisma-query-engine`) with inter-process communication overhead | Zero dependencies beyond native `pg` driver; pure TypeScript query builder | **Drizzle** |
| **Type Safety & Inference** | Generated code requiring `prisma generate` step on every schema modification | Pure TypeScript schema definition (`drizzle-orm/pg-core`) with instant type inference | **Drizzle** |
| **Multi-Tenant Query Scoping** | Global middleware extensions (`$use` / `$extends`) with abstraction overhead | Direct composition: `and(eq(table.gymId, gymId), eq(table.memberId, memberId))` | **Drizzle** |
| **Migration Control** | Automatic shadow database required for migration diffing | Direct, transparent SQL migration files via `drizzle-kit` | **Drizzle** |
| **Memory Footprint** | ~50–80 MB engine memory baseline | < 5 MB runtime memory baseline (Ideal for resource-constrained environments) | **Drizzle** |
| **Cross-Engine Portability (Sync)** | Different syntax paradigms for SQLite and Postgres | Uniform query builder syntax mapping between Postgres (cloud) and SQLite (desktop) | **Drizzle** |

---

## Decision
We select **Drizzle ORM** (`drizzle-orm` + `drizzle-kit` + `pg`) as the primary database access and migration tool for the GymDeck Cloud Backend.

### Rationale
1. **Serverless & Container Efficiency**: Drizzle has zero binary engine dependencies, resulting in instant cold starts and minimal memory consumption.
2. **Explicit, Deterministic SQL Control**: Complex multi-tenant joins, subqueries, and compound tenant scoping (`WHERE gym_id = $1 AND member_id = $2`) are natural and inspectable.
3. **Synchronization Ready**: Drizzle’s schema syntax is modular and easily aligns with future desktop SQLite synchronization pipelines.

---

## Consequences
* **Positive**:
  * Predictable query execution with zero hidden N+1 queries.
  * Instant TypeScript compilation without required code generation build steps.
  * Standard SQL migration scripts that can be audited directly by database administrators.
* **Negative**:
  * Developers write explicit SQL-like query builder statements rather than relying on abstract high-level nested object mutations.
