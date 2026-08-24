# Implementation Plans

Generated on 2026-07-23 and extended on 2026-08-17. Each numbered plan is intended to land as its own PR. Execute in dependency order, read the selected plan fully before starting, honor its STOP conditions, and update its status row when done.

## Execution Order & Status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 006 | Keep the successful render path synchronous and allocation-light | P1 | M | - | DONE |
| 007 | Compile component parameter schemas and add an empty-schema fast lane | P2 | M | 006 | DONE |
| 008 | Enforce one storage concurrency budget during legacy reconciliation | P1 | M | - | DONE |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with reason) | REJECTED (with rationale)

## Dependency Notes

- 006 can proceed now that the registry artifact and manifest cache work has landed; it should measure the synchronous lane on the intended steady-state architecture.
- 007 follows 006 because both touch render orchestration, and its schema cache should be measured after the larger promise/allocation wins land.
- 008 can be developed/reviewed independently of 006–007; it touches the legacy reconciliation path, not rendering.

Recommended PR landing sequence: **006 → 007**, with **008** independently.

## Findings Considered And Rejected Or Deferred

- The previous rejection of a full component `package.json` cache is superseded by the registry-scoped, bounded, mutation-safe, and benchmarked cache design. Adding manifests to the existing `nice-cache` singleton remains rejected.
- Registry-wide batch/nested render scheduler: deferred. Burst and batch benchmarks measured a real trade-off (about 10% lower RPS but better p95/p99 and half the storage concurrency) for the current per-request cap. A global fair limit needs production capacity requirements and tuning before it is safe to specify.
- Replacing `pLimit` with a callback-aware batch pump: deferred until scheduler scope is decided; promise allocation should be profiled again after Plans 006–007.
- Parallel cold env/provider reads: rejected for this sequence because an env failure currently prevents the provider read; starting both would report lower success-path latency by doing extra work on an error path, violating the equal-work benchmark rule.
- Serving valid legacy metadata before startup reconciliation: deferred because it changes readiness/consistency semantics for registries modified outside OC.
- Coalescing legacy publish refreshes and reusing metadata snapshots for legacy exports: valid follow-ups for publish-heavy or metadata-export deployments, but lower leverage than the selected request-path work.
- Replacing the adapter capability probe that calls `getFile('')`: deferred because it saves one startup operation but requires a compatibility contract for third-party callback adapters.
- CORS re-normalization, Express parameter-copy fast lanes, URL/string micro-optimizations, and cold-route dynamic imports: not worth prioritizing until higher-tier work is measured; dynamic imports additionally need module-graph and cold-start evidence.
- Removing Node `Domain` from provider execution: rejected for this sequence due to compatibility and error-semantics risk; none of the selected PRs require it.
