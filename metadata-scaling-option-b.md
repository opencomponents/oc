# Option B — Database as opt-in source of truth for metadata

> Status: chosen direction. Statics stay in object storage; only the **metadata
> index** (which components/versions exist) moves to a pluggable database that
> becomes the source of truth. Storage-only remains the default and is fully
> non-breaking. See `metadata-scaling-option-a.md` for the storage-only
> alternative this was weighed against.

## 1. Context — why a database

### The pain (same root as Option A)
Metadata today is a **derived index** rebuilt by scanning the storage directory
tree (`componentsDir/<component>/<version>/package.json`). The expensive op,
`getFromDirectories` (`registry/domain/components-cache/components-list.ts`), runs
a full scan — `listSubDirectories` per component, re-sort every version list with
`semver.compare`, rebuild the whole map, deep `isEqual`, overwrite
`components.json` — on **startup** and **after every publish**. Under heavy,
AI-accelerated publishing across multiple nodes this drives CPU + GC pressure.

### Why storage-only isn't enough here
The full scan is not transactional. Concurrent publishes on different nodes each
scan and then overwrite `components.json` (last-writer-wins, no conditional
write), so one update can clobber another. It "works" only because it is
**eventually consistent and self-healing** — the next scan re-derives truth from
the immutable directory tree. The scan's real job is therefore **periodic
reconciliation**, and its cost is **O(registry size)**. Any storage-only design
keeps that O(registry) reconciliation somewhere (see Option A's ceiling). Under
**unbounded, accelerating growth**, only a queryable store answers "what changed"
in **O(changes)** and turns publish into an **O(1)** atomic append.

### What the DB changes (and doesn't)
- **Does:** replace the global-blob read-modify-write with **row-level appends**.
  Concurrent publishes become independent `INSERT`s — no clobbering, no
  reconciliation needed. Publish stops scanning. Startup stops scanning.
- **Doesn't:** touch statics (still in storage), the hot read path (still served
  from the in-memory cache), or storage-only users (DB is opt-in).

## 2. Decisions locked in

| # | Decision |
| --- | --- |
| Abstraction | **Pluggable metadata adapter**, injected like `storage.adapter`. Core takes zero DB deps. Generic SQL; **Azure SQL (SQL Server / T-SQL)** is the first official adapter; Postgres/MySQL follow. |
| Read model | **In-memory cache stays.** DB is touched only at startup (hydrate), poll (re-hydrate), and publish (insert). Hot reads never hit the DB. |
| Source of truth | In DB mode the **DB is authoritative** for "what exists"; storage holds only the bytes. The directory scan is **abandoned**. |
| Write path | Statics to storage **first**, then **`INSERT` row = commit point**. A version is published iff its row exists. |
| Concurrency | `PRIMARY KEY (component_name, version)`; concurrent same-version publish → one wins, other gets `VERSION_ALREADY_EXISTS`. Different components never contend. |
| Partial failure | Orphan-tolerant on the safe side: statics-ok/insert-failed → publish errors, statics are harmless unreferenced bytes, re-publish is idempotent. Insert-ok/statics-missing is structurally impossible (DB last). |
| Deletes | **Append-only now.** `removeVersion` reserved for future version-level deletes; delete flow mirrors publish in reverse (remove row first, then best-effort `removeDir`). |
| Poll | **Full re-hydration** (parity with today's whole-`components.json` poll; always correct; delete-friendly). `changesSince(cursor)` is a reserved future optimization; tombstones + delta-poll are a coupled future pair. |
| Schema mgmt | **Auto-create by default** (`manageSchema`), opt-out for locked-down DBs; always verify + fail fast with the exact DDL. |
| Config | **Presence-based enable** (`metadata` block, sibling to `storage`); storage still required. Explicit bake-in toggles. |
| Migration | **Gradual with bake-in:** idempotent backfill + storage→DB reconcile + DB→`components.json` exporter; lossless rollback. |
| Failure | Reads survive any DB blip (served from cache); publishes correctly refuse during one; cold-start needs the DB (or the DR snapshot). |
| Exporter | **Kept permanently** as a one-directional, non-authoritative DR snapshot / cold-start fallback. Never read back into the DB. |

## 3. The interface

```ts
type ComponentRow = {
  name: string;
  version: string;
  publishDate: number;     // unix seconds  ← pkg.oc.date
  templateSize?: number;   //               ← pkg.oc.files.template.size
};

interface MetadataStore {
  adapterType: string;                 // 'azure-sql' | 'postgres' | 'mysql' | ...
  isValid(): boolean;                  // config sanity (sync, like StorageAdapter.isValid)
  initialise(): Promise<void>;         // open pool; ensure/verify schema (manageSchema)

  getAllComponents(): Promise<ComponentRow[]>;   // hydration — feeds BOTH caches
  addVersion(row: ComponentRow): Promise<void>;  // commit point; throws VERSION_ALREADY_EXISTS

  // reserved, not implemented now:
  removeVersion?(name: string, version: string): Promise<void>;
  changesSince?(cursor: string): Promise<{ rows: ComponentRow[]; cursor: string }>;
}
```

- One `getAllComponents()` hydrates both `ComponentsList` (`name → versions[]`,
  `semver`-sorted in memory) and `ComponentsDetails`
  (`name → version → {publishDate, templateSize}`). The cached `get()` paths are
  unchanged.
- Each adapter maps its driver's unique-violation (SQL Server 2627/2601,
  Postgres 23505, MySQL 1062) to the shared `VERSION_ALREADY_EXISTS` code in a new
  **`oc-metadata-adapters-utils`** package (mirrors `oc-storage-adapters-utils`).

## 4. The schema

```sql
-- Azure SQL / SQL Server dialect; each adapter ships its own
CREATE TABLE oc_components (
  component_name  NVARCHAR(255) NOT NULL,
  version         NVARCHAR(64)  NOT NULL,
  publish_date    BIGINT        NOT NULL,                          -- unix seconds
  template_size   BIGINT        NULL,
  created_at      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(), -- DB clock; reserved for future delta cursor
  CONSTRAINT pk_oc_components PRIMARY KEY (component_name, version)
);
CREATE INDEX ix_oc_components_name ON oc_components (component_name);
```

- PK gives uniqueness + the concurrency guarantee in one constraint.
- **Lean:** stores only what the in-memory caches need; the full `package.json`
  stays in storage (`getComponentInfo` still fetches it). Richer query columns are
  an additive `ALTER TABLE` later — YAGNI now.
- `created_at` on the DB clock is free now, future-proofs the delta cursor + audit.

## 5. Integration points

| Today | DB mode | File |
| --- | --- | --- |
| `componentsCache.load()` full scan | `getAllComponents()` → group in memory | `components-cache/index.ts` |
| `poll()` re-reads `components.json` | `getAllComponents()` (full re-hydration) | `components-cache/index.ts` |
| `publishComponent` → `componentsCache.refresh()` scan | `metadata.addVersion(row)` from in-hand `pkgDetails.packageJson` (zero extra reads) | `registry/domain/repository.ts` (~L402) |
| `componentsDetails` second scan | same hydration rows, no per-version `getJson` | `components-details.ts` |
| `validateNewVersion` vs storage listing | cache pre-check + authoritative unique constraint | `repository.ts` / `version-handler.ts` |

Add one seam — an **index source** with two implementations (storage scan vs
`MetadataStore`) behind the unchanged cache API — so `repository.ts` doesn't
branch on `if (db)` throughout. `componentsCache(conf, cdn, metadataStore?)`:
present → route `load/poll/add` through the store; absent → today's storage path.

## 6. Config

```ts
metadata?: {
  adapter: (options: T) => MetadataStore;   // require('oc-azure-sql-metadata-adapter')
  options: T;                               // connection / pool config
  manageSchema?: boolean;                   // default true; false = operator-managed DDL
  reconcileFromStorage?: boolean;           // bake-in: import storage rows missing in DB
  exportLegacyFiles?: boolean;              // bake-in + permanent DR: regenerate components.json from DB
};
```

- `metadata` **absent → storage mode** (today, byte-for-byte). Present → DB mode.
- `storage` **still required** in DB mode (statics). `metadata` is additive.
- Bake-in phases are just config: cutover ships both toggles `true`; steady state
  flips `reconcileFromStorage:false` and keeps `exportLegacyFiles:true` (permanent
  DR snapshot).
- Packaged as `oc-azure-sql-metadata-adapter` + `oc-metadata-adapters-utils`. Core
  gains **zero** runtime deps.

## 7. Migration (gradual with bake-in)

Backfill source is cheap: `components-details.json` already *is* the `ComponentRow`
set (`name → version → {publishDate, templateSize}`); fall back to a full scan only
if it's missing/partial. The backfill is an **idempotent bulk upsert** (PK-keyed,
safe to re-run and safe across nodes).

**Phases:**
1. **Backfill** — `oc registry migrate-metadata` (command) and/or auto-on-empty in
   `initialise()`. Registry untouched, still storage mode.
2. **Cutover** — deploy with `metadata` configured, `reconcileFromStorage:true`,
   `exportLegacyFiles:true`. Nodes hydrate from DB.
3. **Bake-in** — run mixed / observe.
   - **storage→DB reconcile** (on boot, optional slow timer): upsert any
     `name@version` in the dir tree but missing from the DB → heals anything a
     still-storage-mode node published during cutover.
   - **DB→`components.json` exporter** (slow timer, single query → blob): keeps the
     legacy files fresh so external consumers work and **rollback is lossless**
     (revert to storage mode, lose at most one export interval).
4. **Steady state** — scan abandoned; `reconcileFromStorage:false`; exporter kept
   permanently as DR snapshot; `components.json` is now a non-authoritative
   projection of the DB.

**Consistency:** during the window, the dir tree remains authoritative-enough for
the reconcile to heal any miss (same self-healing principle today's scan relies
on, applied deliberately, once, at the boundary).

## 8. Failure model

- **Startup hydration, DB down:** fail readiness + retry/backoff (running nodes
  keep serving from cache; LB skips the not-ready node). During bake-in, may
  hydrate degraded from the fresh `components.json`. Never start silently-empty.
- **Poll, DB blip:** fully resilient — keep serving the in-memory cache, log, retry
  next interval. Non-overlapping poll + query timeouts so a slow DB can't wedge or
  stack the loop. Only effect: new publishes propagate a bit later.
- **Publish, DB unreachable:** fail the publish with a clear error; statics may be
  orphaned (harmless); client retries (idempotent). No buffering.
- **Cold-start with DB down (steady state):** hydrate degraded from the permanent
  DR snapshot (read-only-ish, possibly stale); publishes fail until DB returns.

Net: **reads survive any DB blip; publishes correctly refuse during one; the DB is
never an absolute single point of failure for booting** thanks to the DR snapshot.

## 9. The exporter guardrail
`components.json`/`components-details.json` become a **one-directional projection**
of the DB: DB → files only, never read back to mutate the DB, only consulted as a
flagged-stale cold-start fallback. The DB is authoritative for every write and
every steady-state read.

## 10. Prerequisite (shared with Option A)
Fix `listSubDirectories` pagination (S3 adapter caps at 1000 prefixes with no
continuation token) — needed by the backfill-scan fallback and the storage→DB
reconcile.

## 11. Build order
1. `oc-metadata-adapters-utils` (types + shared error codes).
2. `MetadataStore` seam in core (`components-cache` / `components-details` /
   `repository.publishComponent`), storage path unchanged when `metadata` absent.
3. `oc-azure-sql-metadata-adapter` (pool, `manageSchema` DDL, `addVersion`,
   `getAllComponents`, unique-violation mapping).
4. Migration command + auto-on-empty backfill.
5. Bake-in machinery: storage→DB reconcile + DB→json exporter (config-gated).
6. Fix `listSubDirectories` pagination.
7. Docs + a Postgres adapter to validate the interface stays dialect-neutral.

## 12. Testing
- Unit: `addVersion` insert + unique-violation → `VERSION_ALREADY_EXISTS`;
  `getAllComponents` → correct `ComponentsList` + `ComponentsDetails` grouping.
- Concurrency: two nodes, different components (both land) and same version (one
  wins, one rejected).
- Migration: backfill idempotency (re-run = no-op); reconcile heals a storage-only
  publish; exporter round-trips DB → `components.json`.
- Failure injection: DB down at startup (not-ready), during poll (serves cache),
  during publish (fails, statics orphaned, retry succeeds).
- Non-breaking: full suite green with `metadata` absent (storage mode unchanged).

## 13. Bottom line
Publish becomes an O(1) atomic append, startup an O(1) query, cross-node
correctness a `UNIQUE` constraint instead of expensive self-healing — and it stays
flat under unbounded growth. Statics, the in-memory hot path, and storage-only
users are untouched. The cost is a pluggable adapter, a one-table schema, and
temporary bake-in machinery you mostly retire — with a permanent, cheap DR
snapshot keeping the DB from becoming a single point of failure for booting.
