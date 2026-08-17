# How to Make a JavaScript Library Fast

A playbook extracted by diffing a from-scratch reimplementation of a mature JS library
against the original. The reimplementation kept the same public API and passes the
original's vendored test suite, while reporting 5–30× throughput on hot operations and
1.2–2.7× on primitives.

Nothing here is domain-specific. The techniques are the transferable part.

---

## 0. The meta-lesson: where the wins actually came from

The speedups are **not** uniformly distributed. Ranked by multiplier:

| Tier | Technique | Typical gain | Cost |
|---|---|---|---|
| 1 | **Skip the work entirely** (tiered fast lanes) | 5–30× | High correctness risk; needs parity tests |
| 2 | **Move work to setup time** (compile, precompute tables) | 2–10× | Memory; staleness if config mutates |
| 3 | **Cache at the right layer** (whole results, not intermediates) | 2–60× | Cache-invalidation bugs; unbounded growth |
| 4 | **Delete async** (sync lanes, no promises when nothing is pending) | 2–10× | Two code paths to keep in sync |
| 5 | **Delete allocations** (no intermediate arrays/objects/closures) | 1.5–3× | Readability |
| 6 | **Micro-optimize primitives** (charCodeAt over regex) | 1.2–2.7× | Readability; low ceiling |

Most engineers start at tier 6 and stop. **The 30× rows all came from tiers 1–4.** Tier 6
is where you go *after* the structure is right, and its main value is that it makes the
fast lanes' guard checks nearly free.

Second meta-lesson, equally important: **the correctness harness is not optional overhead —
it's what makes tiers 1–4 possible at all.** Every aggressive shortcut in this codebase is
backed by a test that pins the observable behaviour it's allowed to skip. Without that,
you cannot ship a fast lane; you can only ship a bug.

---

## Tier 1 — Don't do the work

### 1.1 Build a dispatch ladder, cheapest check first

The single highest-leverage pattern. Instead of one general algorithm, stack progressively
more expensive strategies and return at the first hit:

```js
function resolve(input) {
  // (1) identity memo: two === compares, zero hashing
  if (input === hotKey && context === hotContext) return hotResult

  // (2) per-instance one-slot memo
  if (instance.lastKey === input) return instance.lastResult

  // (3) precomputed exact-answer table (built at setup time)
  const exact = instance.exactTable[input]
  if (exact !== undefined) return remember(input, exact)

  // (4) bounded result cache
  const cached = instance.cache.get(input)
  if (cached !== undefined) return remember(input, cached)

  // (5) specialized walker for the common input class
  const simple = trySimpleStrategy(input)
  if (simple !== undefined) return remember(input, simple)

  // (6) the general algorithm
  return remember(input, generalStrategy(input))
}
```

Each rung must be strictly cheaper than the one below it. Rung (1) costs two pointer
compares; rung (6) may cost a full tree walk. On a workload with any temporal locality you
almost never reach the bottom.

### 1.2 Fast lanes need a *narrowing* gate, not an approximation

The rule that keeps this honest: **a fast lane must either produce the exact same result as
the general path, or refuse to run.** It never approximates.

Express that as an explicit blacklist of everything the lane can't handle:

```js
function canUseFastLane(item) {
  const cached = item._fastLane          // 0 | 1 | undefined
  if (cached === 1) return true
  if (cached === 0) return false

  const opts = item.options
  const ok = !(
    opts.beforeHook || opts.afterHook || opts.transform ||
    opts.errorHandler || opts.customSerializer || opts.middleware
  )
  item._fastLane = ok ? 1 : 0            // memoize on the object, computed once
  return ok
}
```

Two things to copy:
- **Blacklist, not whitelist.** New features are automatically excluded from the fast lane
  until someone deliberately handles them. A whitelist silently breaks on the next feature.
- **Memoize the gate itself** as a `0 | 1` integer field on the object. The gate runs on
  every call; the predicate runs once per object. Using `0/1` instead of `true/false/undefined`
  keeps the field a Smi and the compare monomorphic.

### 1.3 Tri-state returns: "hit", "miss", "not my job"

A specialized strategy needs to distinguish *"I definitively determined there's no result"*
from *"this input is outside my competence, ask someone else"*. Collapsing those forces the
caller to re-run the expensive path on every negative.

```js
// undefined = ineligible, fall through to the general path
// null      = definitively no result, stop
// value     = hit
function trySimpleStrategy(input) {
  if (hasComplexFeature(node)) return undefined   // not my job
  const child = node.children[key]
  if (!child) return null                         // definitive miss
  return buildResult(child)
}
```

The same idea at a coarser grain, for lanes that may complete synchronously, go async
mid-flight, or bail out:

```js
// true          = completed synchronously
// Promise       = went async mid-lane
// false         = ineligible, caller should use the general path
function tryFastLane(input) { ... }
```

### 1.4 Precompute the answer table for the enumerable cases

If the set of "simple" inputs is finite and derivable from config, compute all the answers
at setup and serve them from a dictionary:

```js
function buildExactTable(config) {
  const table = Object.create(null)
  for (const item of config.items) {
    if (!isSimple(item.key)) continue           // only inputs with no dynamic parts
    if (needsRuntimeHook(item)) continue        // guard: anything user-observable is excluded
    table[item.key] = computeResult(config, item.key)
    if (caseInsensitive) table[item.key.toLowerCase()] = table[item.key]  // pre-fold aliases
  }
  return table
}
```

At call time this is one property load returning a **shared, frozen** result — no walk, no
allocation, no parameter object. This was the biggest single structural win in the codebase.

Note the guards. Anything that could invoke user code, mutate, or vary per call disqualifies
an entry from precomputation. Precompute only pure, config-derived answers.

### 1.5 Skip the whole operation when the state is already correct

```js
function refresh(opts) {
  if (!opts?.force && isAlreadySettled()) {
    return RESOLVED          // shared singleton, zero allocation, zero microtasks
  }
  return doTheWork(opts)
}
```

The general path in the original always allocated a promise and burned at least one tick
even when everything was already up to date. Checking for "nothing to do" is often the
cheapest big win in a library, and it's usually missing because the code was written
async-first.

**Ethics note:** the reimplementation's benchmark harness *deliberately excludes* this row
from its published table, because "we can skip the call entirely" isn't a comparison of
equivalent work. Do the same. Optimize it, don't brag about it.

---

## Tier 2 — Move work from call time to setup time

### 2.1 Compile patterns into op arrays

Instead of re-parsing a template string on every call, parse once into a flat array of ops
and cache it — **including the failure**, so complex templates aren't rescanned forever:

```js
const compiled = Object.create(null)   // key -> ops[] | null (null = "not compilable")

function compile(template) {
  const hit = compiled[template]
  if (hit !== undefined) return hit    // `undefined` = miss, `null` = negative cache hit

  const ops = []
  // ...scan once...
  if (tooComplex) return (compiled[template] = null)
  return (compiled[template] = ops)
}

function apply(template, values) {
  const ops = compile(template)
  if (!ops) return null                // caller falls back to the general path
  let out = ''
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    out += op.t === 0 ? op.s : values[op.k]
  }
  return out
}
```

Note `undefined` vs `null` doing double duty as miss-vs-negative-hit. Negative caching
matters: without it, every uncompilable input pays a full scan forever.

### 2.2 Specialize a closure for the common arity

One step further than op arrays — compile straight to a closure, with a hand-written
monomorphic case for the overwhelmingly common shape:

```js
function compileToClosure(template, keys) {
  if (keys.length === 1) {                     // the ~90% case
    const key = keys[0]
    const idx = template.indexOf('$' + key)
    const pre = template.slice(0, idx)
    const post = template.slice(idx + key.length + 1)
    return (values) => pre + values[key] + post   // one concat, zero scanning
  }
  const parts = buildParts(template)
  return (values) => { /* generic loop */ }
}
```

The one-param closure has no loop, no array indexing, no branch. V8 inlines it.

### 2.3 Precompute capability flags on the config object

Walk the whole configuration once at setup and hoist "does anything anywhere use feature X"
into booleans. Then gate entire subsystems at call time with one property load:

```js
// setup
let hasValidation = false
let hasMiddleware = false
for (const id in registry) {
  const o = registry[id].options
  if (o?.middleware?.length) { hasMiddleware = true; hasValidation = true; break }
  if (o?.validate) hasValidation = true
}
processed.hasValidation = hasValidation
processed.hasMiddleware = hasMiddleware

// call time
if (processed.hasValidation) { /* the entire validation pipeline */ }
```

**Caveat found in the wild:** one such flag was computed with a full recursive tree walk at
setup and then *never read on any hot path* — only by a unit test. Audit your precomputation
for dead work. Setup cost isn't free just because it's not in the hot loop.

### 2.4 Fold case/normalization into the key at build time

If lookups are case-insensitive, don't lowercase the input on every call and don't keep two
lookup tables. Normalize the *keys* once at setup and store pre-folded aliases. This is only
possible if you scope the feature at the container level rather than per-item — see §9.2,
where deleting a feature enabled a strictly better data structure.

---

## Tier 3 — Cache at the right layer

### 3.1 The cache hierarchy, cheapest first

| Layer | Cost per hit | When to use |
|---|---|---|
| Module-level 1-slot identity memo | 2× `===` | The exact same call repeats back-to-back |
| Per-instance 1-slot memo | 1 field load + `===` | Same, but instances interleave |
| Null-prototype dictionary | 1 keyed load | Small bounded key space |
| `Map` | hash + call | Non-string keys, or you need real LRU |
| Linked-list LRU | hash + 3–6 pointer writes | Large key space, real eviction pressure |

A one-slot memo is *dramatically* cheaper than a `Map` and is often enough:

```js
let lastA = '', lastB = '', lastResult = ''
function expensive(a, b) {
  if (a === lastA && b === lastB) return lastResult
  const result = compute(a, b)
  lastA = a; lastB = b; lastResult = result
  return result
}
```

Initialize sentinels to a value **no real input can equal** (`'\0'`, not `''`) so the
comparison IC never sees a degenerate shape and the guard never accidentally hits.

### 3.2 Cache the whole downstream result, not the intermediate

The biggest cache win wasn't caching the core algorithm — it was caching the **entire
derived tuple** the caller actually wanted, returned **by reference**:

```js
function getDerived(key) {
  const hit = cache[key]
  if (hit) return hit              // returns the SAME array/tuple, zero allocation

  const base = coreAlgorithm(key)
  const result = [buildChain(base), base.params, base.leaf]
  cache[key] = result
  return result
}
```

The original cached the core algorithm's output but then rebuilt the tuple, copied a params
object, and allocated an array on every call — so the cache saved the cheap part and paid
for the expensive part every time. **Profile where the allocations are, not where the
algorithm is.**

### 3.3 Template + clone for objects that are mostly identical

When results are expensive to construct but differ only in a few mutable fields, snapshot a
sanitized template and clone it:

```js
// on the way out: strip everything user-mutable / request-specific
function toTemplate(obj) {
  return { ...obj, data: undefined, error: undefined, context: {}, controller: undefined }
}

// on the way in: preallocated array, spread the template, patch the volatile fields
function cloneTemplate(template) {
  const now = Date.now()
  const out = new Array(template.length)
  for (let i = 0; i < template.length; i++) {
    out[i] = { ...toTemplate(template[i]), updatedAt: now, isPending: false }
  }
  return out
}
```

Gate this hard: the snapshot is only taken (and only used) when no feature that could make
two results differ is active. Spread-cloning also preserves key order, so the clones share a
hidden class with the source.

### 3.4 Returning the *same reference* is itself an optimization

Every transform function should return its input unchanged when there's nothing to do:

```js
function normalize(str) {
  const i = str.indexOf(BAD)
  if (i === -1) return str        // same reference — downstream === checks now hit
  return doTransform(str, i)
}
```

This compounds. Downstream one-slot memos, `Object.is` bailouts, and change-detection all
key on identity. A function that returns a fresh equal string invalidates every cache above
it.

### 3.5 Cache hazards — every one of these was found in the shipped code

- **Identity-keyed memos on mutable inputs.** `if (obj === lastObj) return lastResult` is
  wrong the moment someone mutates `obj` in place. It only works under a documented
  immutability invariant. Write the invariant down.
- **FIFO masquerading as LRU.** A bounded dictionary that evicts the first-inserted key is
  FIFO. A hot key inserted early gets evicted while cold keys survive. Fine at size 32,
  pathological at scale.
- **Object insertion order as a recency list.** Exploiting JS string-key insertion order to
  avoid a linked list works — until a key is integer-like (`"0"`, `"12"`), which JS orders
  *before* all string keys, silently corrupting recency. Also, `delete` + re-insert on every
  `get` pushes the object into dictionary mode.
- **`Object.keys(store)[0]` to find the oldest key.** Allocates the entire key array to read
  element 0. Only on the eviction path, but it's a real allocation at exactly the wrong time.
- **Unbounded caches.** Two of the highest-value caches had no eviction at all. Keyed by
  user-controlled input, that's a memory leak and a DoS vector.
- **Module-global caches shared across instances and across tests.** Fine for pure functions
  of their key. Not fine for anything else.

---

## Tier 4 — Delete the async

An `async` function that never actually suspends still costs: a promise allocation, a
coroutine frame, and a microtask tick per `await`. Across a pipeline that's 15–25 promises
and 25–40 ticks for work that could be zero.

### 4.1 Type your hot functions as "sync or async"

```js
/** @returns {void | Promise<void>} */
function run(input) {
  const result = step1(input)
  if (result instanceof Promise) return result.then(step2)
  return step2(result)                 // returns undefined — no promise at all
}
```

Callers join with an explicit check rather than `await`. Yes, it's two paths. That's the
price.

### 4.2 A shared resolved singleton

```js
export const RESOLVED = Promise.resolve()
```

Return it from every "nothing to do" path. Then callers can identity-check it and skip even
the thenable test:

```js
const out = run(input)
if (out !== RESOLVED && isThenable(out)) return out.then(next)
return next()
```

### 4.3 `instanceof Promise` vs `isThenable` — pick deliberately

```js
// hot internal joins: monomorphic, no property load, no call
if (value instanceof Promise) { ... }

// API boundaries (user callbacks, cross-realm values): correct but costlier
const isThenable = (v) => v != null && typeof v.then === 'function'
```

Use `instanceof` where you control both sides; use duck-typing where you don't.

### 4.4 Continuation-passing instead of `async`/`await`

Rewriting a 4-`await` pipeline as chained continuations with a sync join at each step means
a fully-synchronous request allocates **one** promise (the API's return type) instead of ten:

```js
function handle(request) {
  const afterC = (c) => finish(c)
  const afterB = (b) => {
    const c = stepC(b)
    return isThenable(c) ? c.then(afterC) : afterC(c)
  }
  const afterA = (a) => {
    const b = stepB(a)
    return isThenable(b) ? b.then(afterB) : afterB(b)
  }
  const a = stepA(request)
  return isThenable(a) ? a.then(afterA) : afterA(a)
}
```

Critically: `await maybeUndefined()` suspends for a tick **even when the value is
`undefined`**. Guard it: `if (v != null) return wrap(v).then(next); return next()`.

### 4.5 Resume-at-`i+1` so one async item doesn't infect the rest

When iterating work items where most are synchronous, don't `await` in the loop. Recurse
into the same function at the next index only when you actually hit a promise:

```js
function processFrom(items, i) {
  for (; i < items.length; i++) {
    const result = items[i].run()
    if (result instanceof Promise) {
      return result.then((v) => {
        commit(items[i], v)
        return processFrom(items, i + 1)   // resume the sync loop
      })
    }
    commit(items[i], result)               // sync item: no promise, no tick
  }
}
```

### 4.6 `{ ok, value }` result objects instead of try/catch across await

```js
function callUser(fn, arg) {
  try { return { ok: true, value: fn(arg) } }
  catch (value) { return { ok: false, value } }
}
```

Keeps the try/catch in a tiny leaf function that V8 can handle well, and lets the caller
stay non-async.

### 4.7 Prototype methods, not async arrow properties

```js
class Thing {
  navigate = async (opts) => { ... }   // ✗ closure allocated PER INSTANCE
}
class Thing {
  navigate(opts) { ... }              // ✓ one function object on the prototype
}
```

For a library that constructs many short-lived instances (one per request, say), the arrow
form allocates a fresh closure for every method on every instance. It also makes it harder
for V8 to reuse optimized code across instances. The reimplementation ships a diagnostic
script that asserts `freshInstance.method === Prototype.method` — a structural precondition
for its cold-start numbers.

### 4.8 Don't make things async that don't need to be

The original's blocker system made every mutation `async` so it *could* await blockers, even
though blockers were almost never registered. The fix:

```js
push(value, opts) {
  const blockers = this.blockers
  if (blockers?.length && !opts?.ignore) {
    return this.runBlockersThen(value)   // async only when blockers exist
  }
  // straight-line synchronous commit
}
```

---

## Tier 5 — Delete the allocations

### 5.1 Never create garbage you then have to clean up

```js
// ✗ closure + filtered array + joined string that intentionally creates "//" + regex pass
paths.filter(v => v !== undefined).join('/').replace(/\/{2,}/g, '/')

// ✓ decide the separator at each boundary, produce the right string directly
let out = ''
for (let i = 0; i < paths.length; i++) {
  const v = paths[i]
  if (v === undefined) continue
  const needsSep = out.length && out.charCodeAt(out.length - 1) !== SLASH && v.charCodeAt(0) !== SLASH
  if (needsSep) out += '/'
  out += v
}
```

### 5.2 The `split`/`map`/`join` chain

```js
// ✗ 2 arrays + 1 closure
value.split('/').map(seg => encode(seg)).join('/')

// ✓ 1 array, mutated in place, no closure, no megamorphic callback dispatch
const parts = value.split('/')
for (let i = 0; i < parts.length; i++) parts[i] = encode(parts[i])
return parts.join('/')
```

### 5.3 Preallocate with known length; never `push` in a sized loop

```js
const out = new Array(items.length)
for (let i = 0; i < items.length; i++) out[i] = transform(items[i])
```

`.map()` allocates a closure and goes through a generic callback dispatch. `push` in a loop
means repeated capacity growth.

### 5.4 Mutate in place when the branch is provably impossible

```js
const canBranch = node.dynamicChild || node.optionalChildren?.length || node.wildcard
const chain = canBranch ? frame.chain.slice() : frame.chain   // share when nothing can fork
chain.push(node.value)
```

Copy-on-write, but only actually copy when a write could be observed by another path.

### 5.5 Frozen shared singletons for empty values

```js
const EMPTY_OBJ = Object.freeze(Object.create(null))
const EMPTY_PARAMS = Object.freeze(Object.create(null))
```

Return these instead of a fresh `{}`. Every static result in the system then shares one
object — no per-call allocation. Freeze so an accidental mutation fails loudly instead of
corrupting every other caller.

**But:** one parity test in this codebase specifically asserts that two results do **not**
share an empty-object singleton, because user code writes to that field. Know which of your
"empty" values are read-only.

### 5.6 Noop stand-ins for expensive host objects

```js
const noopController = {
  signal: {
    aborted: false, reason: undefined,
    throwIfAborted() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return false },
  },
  abort() {},
}
// ...
controller: needsCancellation ? new AbortController() : noopController
```

`new AbortController()` per work item, when 90% of items never abort, is pure waste.

### 5.7 Lazy allocation with `??=`

```js
let listeners           // undefined until someone subscribes
subscribe(fn) { (listeners ??= new Set()).add(fn) }
notify() { listeners?.forEach(fn => fn()) }
```

The original eagerly allocated four listener arrays and a buffer object per request, then
called `.slice()` on each empty array on every emit. Lazy + `if (!listeners?.length) return`
removes all of it for the common case.

### 5.8 Don't allocate in the function signature

```js
// ✗ `...rest` builds a fresh object on EVERY call, just to read one field
function f({ a, b, ...rest }) { use(rest.c) }

// ✓ positional args, monomorphic call site
function f(a, b, c) { ... }
function fPublic({ a, b, c }) { return f(a, b, c) }   // thin destructuring wrapper
```

### 5.9 Null-prototype dictionaries instead of `Map` for string keys

```js
const store = Object.create(null)
store[key] = value          // keyed-load IC, no call, no prototype hop
```

Faster than `Map.get`/`Map.set` for string keys, and no `Map` entry overhead. Trade-offs:
no `.size` without bookkeeping, no iteration order guarantee for integer-like keys, and
`delete` pushes the object into dictionary mode. The codebase wraps this in a small
`StringMap` class to keep the `Map`-ish call sites unchanged.

### 5.10 Skip the whole call when the input is trivially handled

```js
// ✗ called unconditionally for every item
const { result, used } = interpolate(item.template, params)

// ✓ 90% of items have no placeholders at all
let result = item.template
if (item.template.indexOf('$') !== -1) {
  ({ result, used } = interpolate(item.template, params))
}
```

---

## Tier 6 — Primitive-level string and scan work

These are 1.2–2.7× each and they compound, but more importantly they make the tier-1 guard
checks cheap enough to always run.

### 6.1 `charCodeAt` instead of regex / `startsWith` / indexing

```js
s.startsWith('/')            →  s.charCodeAt(0) === 47
s[0] === '?'                 →  s.charCodeAt(0) === 63
s.endsWith('/')              →  s.charCodeAt(s.length - 1) === 47
/^\/{1,}/.test(s)            →  charCode loop
```

`s[0]` allocates a one-character string. `startsWith`/`endsWith` are method dispatches.
Regex entry has fixed setup cost per call.

Nearly every regex in the original had a hand-written scanner in the reimplementation:
slash collapsing, trimming, character-class validation, HTML escaping, percent-decoding,
whitespace detection, JSON sniffing.

### 6.2 The scan-first / slice-run-append idiom

The universal shape for "transform a string, cheaply, usually a no-op":

```js
function transform(src) {
  let out = ''
  let last = 0
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) !== TARGET) continue
    out += src.slice(last, i) + REPLACEMENT
    last = i + 1
  }
  return last === 0 ? src : out + src.slice(last)   // ← same reference when unchanged
}
```

Copies runs in bulk (rope concat), never char-by-char, and returns the original reference
when there's nothing to do.

### 6.3 Tiered encoding: no-op / single-pass / full

```js
function encode(str) {
  let needsSoftEscape = false
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (isUnreserved(c)) continue
    if (c === SPACE) { needsSoftEscape = true; continue }
    return fullEncode(str)                       // tier 3: rare
  }
  if (!needsSoftEscape) return str               // tier 1: same reference, zero work
  return replaceCode(str, SPACE, '+')            // tier 2: one pass
}
```

For the dominant input class (already-safe strings) this does N integer compares and returns
the input. `encodeURIComponent` is a C++ call that always builds a new string.

Apply the same idea to decode:

```js
function decode(str) {
  const plus = str.indexOf('+'), pct = str.indexOf('%')
  if (plus === -1 && pct === -1) return str      // no work at all
  if (pct === -1) return replaceCode(str, PLUS, ' ')   // no decodeURIComponent, no try/catch
  try { return decodeURIComponent(prepped) } catch { return prepped }
}
```

### 6.4 First-character dispatch before full string comparison

```js
// ✗ two full string compares + three ToNumber coercions for a plain string
if (s === 'false') return false
if (s === 'true') return true
return +s * 0 === 0 && +s + '' === s ? +s : s

// ✓ one charCodeAt for the dominant case
const c = s.charCodeAt(0)
if (c === 116 && s === 'true') return true
if (c === 102 && s === 'false') return false
if (c === 45 || (c >= 48 && c <= 57)) { const n = +s; return n * 0 === 0 && n + '' === s ? n : s }
return s
```

### 6.5 `| 32` for case-insensitive ASCII compare

```js
const a = s.charCodeAt(i + 1) | 32   // folds A-Z to a-z
const b = s.charCodeAt(i + 2) | 32
if (a === 50 && b === 53) { /* matched "25" case-insensitively */ }
```

Avoids `toLowerCase()` (which allocates) and case-insensitive regex.

### 6.6 Conditional normalization

```js
let needsFold = false
for (let i = 0; i < key.length; i++) {
  const c = key.charCodeAt(i)
  if (c >= 65 && c <= 90) { needsFold = true; break }
}
if (needsFold) key = key.toLowerCase()   // otherwise keep the original reference
```

### 6.7 Avoid host objects on hot paths

`URLSearchParams` for query parsing costs: a C++-side parsed list, an iterator object per
loop, a two-element array per pair, plus destructuring. A hand-rolled `indexOf`/`slice`
scanner beat it 1.2–1.6× on both encode and decode.

Same category: prefer `URL.parse()` (returns `null`) over `new URL()` + `try/catch`. The
exception path for relative inputs was on the hot path of every link construction.

### 6.8 Avoid exceptions as control flow at high frequency

```js
// ✗ throws on every relative input
try { new URL(href); isAbsolute = true } catch {}

// ✓
isAbsolute = URL.canParse(href)
```

And guard even that with a cheap pre-check (`href.charCodeAt(0) === 47` → definitely
relative, skip the call).

### 6.9 Put `try/catch` in leaf functions

A `try` block in a function containing a hot loop is worse than a `try` in a tiny leaf the
loop calls. The original nested a `try/catch` *inside a `replaceAll` callback* — a closure
plus a handler frame per match.

### 6.10 Cheap monotonic IDs

```js
// ✗ RNG + float→string + substring, per call
(Math.random() + 1).toString(36).substring(7)

// ✓
let seq = 0
const nextKey = () => (++seq).toString(36)
```

Only valid if the ID doesn't need to be unguessable or globally unique. Check first.

---

## Tier 7 — Engine-level concerns (V8)

### 7.1 Hidden-class discipline

**Initialize every field in the constructor, in a fixed order.** Adding fields afterwards
creates divergent transition chains and turns every read site polymorphic.

```js
// ✓ one shape, always
function createNode() {
  return { a: null, b: null, c: null, prefix: '', suffix: '', priority: 0 }
}

// ✗ three shapes: base(4), base+prefix+suffix(6), base+parse+priority(6, different chain)
function createNode() { return { a: null, b: null, c: null, d: null } }
// ...later: node.prefix = x; node.suffix = y
```

The original was explicit about this, with a comment on its factory: *"Keys must be declared
in the same order as in the type, to ensure they are represented as the same object class in
the engine."* The reimplementation regressed here and ended up with 3+ node shapes.

**Keep key order identical across all return branches** of a function that produces one
logical type. Two `return { a, b, c }` / `return { b, a, c }` sites produce two hidden
classes for the same nominal type.

### 7.2 Tagged single shape beats a discriminated union of shapes

```js
// ✗ two maps at the load site
type Op = { t: 0, s: string } | { t: 1, k: string }

// ✓ one map; the unused field is a wasted word, which is cheaper than a polymorphic IC
type Op = { t: number, s: string, k: string }
```

### 7.3 Don't put accessors on hot objects

`Object.defineProperty(obj, 'x', { get })` converts a data property into an accessor and
poisons the load site. Lazy computation is worth it for genuinely cold, expensive things —
but install the getter on a *wrapper* object, never on the one in the hot loop.

### 7.4 Sentinels that don't degenerate

```js
const MISS = '\0'      // not '', not undefined
let hotKey = MISS
```

Comment from the source: *"starts as a value no real input can equal, so the compare never
runs against the empty sentinel (that deopts compare ICs)."*

### 7.5 Avoid `delete` on hot objects

`delete` transitions an object to dictionary mode permanently. Acceptable in a cache's
eviction path; not acceptable on a `get`.

### 7.6 Verify, don't assume

The codebase ships diagnostic scripts using `--allow-natives-syntax` to print
`%GetOptimizationStatus` for ~20 named hot functions, run the exact benchmark loops, then
force-optimize (`%PrepareFunctionForOptimization` → run → `%OptimizeFunctionOnNextCall` →
re-status) to distinguish "not hot enough" from "not optimizable". Bit flags on Node 24:

```
1 fn | 2 never-opt | 8 maybe-deopted | 16 optimized | 32 maglev | 64 turbofan
128 interpreted | 32768 baseline
```

If a hot function reports `never-opt`, no amount of micro-optimization will help; find out
why (usually: a deopt loop, `eval`, `with`, or a shape explosion).

---

## Tier 8 — Shrink the graph, not just the code

Bundle size is a *graph reachability* problem, not a minification problem.

### 8.1 Keep leaf modules leaf

The original's path utilities imported a helper from a 1300-line module that itself imported
three more. Every consumer of the small utility dragged in the whole matcher. Extracting the
helper into a 112-line leaf module fixed it.

**Rule:** if module X is imported by many things, X may only import other leaves.

### 8.2 Split cold paths into modules and `import()` them

```js
let cachedImpl
function coldPath(arg) {
  if (cachedImpl) return cachedImpl(arg)                  // memoize: only the FIRST call pays
  return import('./cold-impl').then(({ impl }) => {
    cachedImpl = impl
    return impl(arg)
  })
}
```

Server-only code, HMR code, and rarely-used subsystems each became separate modules reached
only by dynamic import. Guard dev-only code so it strips:

```js
if (process.env.NODE_ENV !== 'production') {
  Impl.prototype._devOnlyThing = async function () {
    const { helper } = await import('./dev-helper')
    ...
  }
}
```

### 8.3 Conditional exports vs runtime `import()` — a real trade-off

Two strategies for keeping server code out of client bundles:

**Conditional exports** (the original): map `"./env"` to `env/client.js` under the `browser`
condition, where `export const isServer = false`. Bundlers fold `if (isServer)` to a
constant and delete the block. Powerful — it makes *every* server branch in the codebase
disappear. Cost: an enormous exports map (that library had ~33 conditional entries with
`browser`/`node`/`worker`/`workerd`/`deno`/`bun`/`development` variants), and it only works
if the bundler honours your conditions.

**Runtime boolean + dynamic import** (the reimplementation): `export const isServer =
typeof document === 'undefined' ? true : undefined`. Simple, one module, works everywhere —
but `if (isServer ?? ...)` is a runtime check and **no server block is ever dropped**. This
is a direct contributor to the reimplementation *losing* on bundle size (1.21× larger gzip)
despite winning everywhere else.

If bundle size matters more than build simplicity, take the conditional-exports route.

### 8.4 A trap worth knowing

The reimplementation's own source comment:

> *"Boolean-only on purpose: re-exporting server loaders from here pulled the SSR graph into
> every `utils` import and blocked dead-code elimination."*

A widely-imported module that re-exports a heavy implementation defeats tree-shaking for
everyone. Environment flags should be **values only**, never re-export hubs.

### 8.5 Types-only subpath exports

Map a public subpath to a `.d.ts`-equivalent module containing only `import type`:

```json
"./serializer/transformer": "./src/serializer/transformer-types.ts"
```

Consumers get the types; the heavy runtime dependency behind it never enters the graph.

### 8.6 Delete dependencies

Each runtime dep is a subgraph you don't control. The reimplementation dropped:
- an external reactive-store library (~50 lines of hand-rolled code replaced it)
- a user-agent classification library (by deleting the feature that needed it — §9.3)
- and inlined a tiny assertion helper

The corresponding package went from 4 runtime deps to 2.

### 8.7 Assert DCE structurally, not numerically

Bundle-size numbers drift. Assert *what must not be reachable*:

```js
const serverMarkers = ['loadServerRoute', 'createRequestHandler', 'crossSerializeStream']

it('drops the server graph when only a leaf util is imported', async () => {
  const { entry } = await bundle(`import { util } from 'lib'; console.log(util({}))`)
  expect(entry).toContain('util')
  expect(entry).not.toContain('CoreClass')
  expect(serverMarkers.filter(m => entry.includes(m))).toEqual([])
})

it('keeps the cold path in an async chunk, not the entry', async () => {
  const { entry, chunks } = await bundle(`import { createThing } from 'lib'; ...`)
  expect(serverMarkers.filter(m => entry.includes(m))).toEqual([])
  const asyncCode = Object.entries(chunks).filter(([n]) => n !== 'entry.js').map(([, c]) => c).join('\n')
  expect(asyncCode).toContain('loadServerRoute')   // it must exist — just not here
})
```

This is a *test*, run in CI, that fails the moment someone adds a static import that
reconnects the graph. It's the single most valuable bundle-size safeguard, because it
catches the regression at the cause rather than at the symptom.

### 8.8 Measure the initial graph, not the entry chunk

Walk `chunk.imports` transitively from every entry chunk and sum min+gzip. Deliberately do
**not** follow `dynamicImports` — that's the point of splitting them out. Disclose that in
your published numbers.

---

## Tier 9 — Narrow the support matrix (this is an optimization)

### 9.1 Modern runtime targets delete compatibility code

Pinning to a recent Node and a single major of the peer framework unlocked, and the
reimplementation actually uses:

| API | Replaces |
|---|---|
| `URL.canParse()` / `URL.parse()` | `new URL()` in `try/catch` |
| `Object.hasOwn()` | `Object.prototype.hasOwnProperty.call()` |
| `Error.isError()` | `instanceof Error` (cross-realm-correct) |
| `String.prototype.toWellFormed()` | manual lone-surrogate handling / `try/catch` around `encodeURIComponent` |

Usage count: 19 call sites across those four APIs in the reimplementation, **zero** in the
original — which still supports older runtimes. The original also maintains a
multi-TypeScript-version type-test matrix (5 TS versions), which the reimplementation drops
entirely.

Config-level consequences: `target: ES2024` / `lib: ES2024` vs `target: ES2020` /
`lib: ES2022`. Higher targets mean the compiler stops downlevelling async/await, classes,
optional chaining, and spread into slower ES5 shims.

### 9.2 Deleting a feature can unlock a better data structure

The original supported per-item case sensitivity, which forced it to maintain **two** lookup
maps and probe both on every step. The reimplementation scoped case sensitivity to the
container instead, which allowed **one** dictionary with pre-folded keys — halving the
lookups and removing a `Map`.

That's not a micro-optimization. That's a feature-scope decision that changed the algorithm.
Look for these: a rarely-used per-item option is often what's blocking your best data
structure.

### 9.3 Deliberately changing behaviour, and documenting it

The original inspected a request header with a third-party classification library and, for
one class of client, buffered the entire output instead of streaming it. The reimplementation
deletes the branch: everything streams, always. That removed a dependency, a header parse,
and a conditional from every request.

This is a **behaviour change**, not an optimization. It's defensible only because it's stated
plainly in the README with the manual workaround. If you take this route, be that explicit.

### 9.4 Lint config as a performance policy

The reimplementation's linter runs 242 rules with a `"perf": "warn"` category, and — more
interestingly — **disables** rules that fight performance:

```jsonc
"unicorn/prefer-string-replace-all": "off",   // manual scan beats replaceAll
"unicorn/no-new-array": "off",                // new Array(n) preallocation is wanted
"unicorn/no-array-for-each": "off",
"typescript/prefer-for-of": "off"             // indexed for loops are faster
```

Your style guide encodes performance decisions whether you intend it to or not. Make the
exemptions explicit and commented.

---

## Tier 10 — The measurement discipline

This is the most transferable section. Without it, tiers 1–4 are not engineering.

### 10.1 Gate the benchmark on equal work

**Before printing a single number**, prove both implementations do the same amount of work.
Instrument the user-facing callback and count invocations across a fixed script:

```js
async function countWork(createSubject) {
  const counter = { calls: 0 }
  const subject = createSubject(counter)

  for (let i = 0; i < 100; i++) await subject.run(destinations[i % 5])
  const warmA = counter.calls

  for (let i = 0; i < 100; i++) await subject.run({ id: String(i % 50) })
  const warmB = counter.calls - warmA                       // warm subject, varied input

  const fresh = { calls: 0 }
  const freshSubject = createSubject(fresh)
  for (let i = 0; i < 100; i++) await freshSubject.run({ id: String(i % 50) })

  return { warmA, warmB, cold: fresh.calls }
}

const mine = await countWork(makeMine)
const theirs = await countWork(makeTheirs)
if (mine.warmA !== theirs.warmA || mine.warmB !== theirs.warmB || mine.cold !== theirs.cold) {
  throw new Error(`Work parity failed: ${JSON.stringify({ mine, theirs })}`)
}
```

Three counters — warm/repeated, warm/varied, and cold — because each catches a different
class of accidental cheating. Run it **in the parent process before spawning any timing
run**, and print the verified counts in the report header so the table carries its own
provenance.

Ship it as a standalone command too (`audit:work`), exiting nonzero on divergence.

### 10.2 Pin the same numbers as an offline unit test

```js
expect({ warmA, warmB, cold }).toEqual({ warmA: 40, warmB: 100, cold: 100 })
// and the contrast case that proves the caching claim isn't vacuous:
expect(callsWithCachingEnabled).toBe(2)
```

The `40/100/100` vs `2` contrast proves the library is neither over-caching (inflating
benchmarks) nor ignoring the caching option (making the feature a lie). This runs in CI with
no network and no competitor installed.

### 10.3 Rotate inputs to defeat *your own* caches

If you ship intern caches, a benchmark that reuses one input measures your `Map.get`. Build
fixture pools and advance a cursor on **both** sides:

```js
const samples = [/* 6 distinct */]
let cursor = 0
measure(() => mine(samples[cursor++ % samples.length]))
measure(() => theirs(samples[cursor++ % samples.length]))
```

For structured inputs, generate a cross-product (e.g. 64 distinct keys) and index with a
power-of-two mask: `needles[cursor++ & 63]`.

**Audit this honestly.** One row in the published table (a 61× win) rotated 100 inputs
against a 256-entry cache — so after the first iteration it was measuring a dictionary hit,
not the algorithm. The rotation must exceed the cache size.

### 10.4 Warm up inside the same closure you'll time

```js
function measure(fn, ms = 1500) {
  const warmupEnd = performance.now() + 200
  while (performance.now() < warmupEnd) fn()      // untimed: let V8 tier up + ICs stabilize

  let ops = 0
  const start = performance.now()
  const end = start + ms
  while (performance.now() < end) { fn(); ops++ }
  return ops / ((performance.now() - start) / 1000)   // re-read elapsed, don't assume `ms`
}
```

Duration-based throughput, not fixed-N latency: slow implementations aren't punished by
wall-clock blowup and fast ones get enough samples.

### 10.5 Isolate sections in separate processes

Re-exec the harness per section, keyed by an env var, and pass results back as one JSON
line on stdout:

```js
function runSection(name) {
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)],
    { env: { ...process.env, BENCH_SECTION: name }, encoding: 'utf8' })
  const line = r.stdout.split('\n').find(l => l.startsWith('BENCH_JSON:'))
  if (!line) { process.stderr.write(r.stdout); throw new Error(`section ${name} produced no JSON`) }
  return JSON.parse(line.slice('BENCH_JSON:'.length))
}
```

Preserving `process.execArgv` keeps your `--expose-gc` etc. Heap state, megamorphic IC
pollution, and code-cache contents from section A can't contaminate section B. Call
`globalThis.gc?.()` at the top of each section.

### 10.6 Compare against the *published artifact*, not local source

Import the competitor from real `node_modules` (pinned versions, printed in the report
header), and deep-import its `dist/` file directly when a symbol isn't in its export map:

```js
import { x as mine } from '../packages/core/src/x.ts'
import { x as theirs } from '../node_modules/competitor/dist/esm/x.js'
```

Run this under plain `node`, **not** your test runner, so your test-time aliases (which
redirect the competitor's package name to your own source) aren't in effect.

Be aware of the asymmetry this creates: if you ship raw TS and they ship built ESM, you're
comparing different compilation pipelines. Disclose it.

### 10.7 Prove all candidates compute the same function *before* timing them

Any shootout between N implementations should assert equivalence at module load:

```js
for (const input of fixtures) {
  expect(decode(encode(input))).toBe(input)
}
// and for a multi-way shootout:
if (implA(x) !== implB(x)) throw new Error('Implementation mismatch!')
```

A bench file that throws is infinitely better than a bench file that reports a fast wrong
answer.

### 10.8 Defeat DCE of the benchmarked expression

```js
let sink = 0
function batch(input) {
  let size = 0
  for (let i = 0; i < N; i++) size += operation(input).length
  sink = size
}
// at module scope:
void sink
```

Consume the result into a module-level binding that is then referenced. Neither the bundler
nor V8 can prove the computation dead.

### 10.9 Publish your losing metric

The reimplementation's README reports its bundle size as **1.21× larger** than the
competitor, with an explanation of why and a pointer to re-run the measurement. It also
segregates rows that aren't strictly equal work into their own table, and **omits entirely**
a row where its implementation is allowed to skip the call.

A benchmark table that only contains wins is marketing. One that contains losses,
methodology, and exclusions is evidence.

### 10.10 Be honest about statistical rigour

The harness reports a single ops/s scalar per side — no stddev, no RME, no median-of-N, no
A/B interleaving, and it always runs "mine first". That's a real weakness. If you're
publishing ratios that people will make decisions on, add interleaving and dispersion.
At minimum, fence the environment in the report ("4-core X, Linux, Node 24, in-memory") and
explicitly forbid cross-environment comparison of your own numbers.

---

## Tier 11 — Testing a fast-path architecture

Once you have two paths, **the parity test is the most valuable test in the repo.**

### 11.1 Why the eligibility gate is not enough

The gate is a *negative* proof: "no exotic feature is present." It says nothing about
whether the fast lane produces the same results, the same call sequence, or the same error
semantics for the plain inputs it *does* accept.

### 11.2 What a fast-path parity suite must assert

From the real suite, generalized. Each of these is a bug class the fast lane invites:

1. **Derived keys recompute.** Navigate with input A, then input B; assert the second result
   reflects B and that the cache key includes the varying dimension.
   → *catches: fast-lane cache key omits a dimension.*
2. **Per-item mutable state is not shared.** `expect(a.ctx).not.toBe(b.ctx)` and
   `expect(Object.isFrozen(a.ctx)).toBe(false)`.
   → *catches: the most tempting fast-path allocation saving.*
3. **Synchronous user-code throw.** Assert: called exactly once, error handler fired exactly
   once with the *identical* error instance, the public promise **resolves** (doesn't
   reject), and the item is committed in an error state.
   → *catches: sync execution double-invoking, or leaking a throw through the public API.*
4. **Async rejection.** Same contract as (3) for the promise path.
5. **Identity fields survive object reuse.** Pin every field user code or devtools reads:
   index, id, parent linkage, static metadata, flags.
   → *catches: pooled/cloned objects losing fields.*
6. **Defaults survive cache reuse.** A→B→A, and the *cached* A must still carry its
   defaulted/validated values.
   → *catches: the template snapshot stripping too much.*
7. **Empty-value singletons are not shared where they're written.**
   `expect(a.field).not.toBe(b.field)` for fields user code mutates.
   → *catches: over-eager `EMPTY_OBJ` reuse (§5.5).*
8. **Mid-sequence abort unwinds correctly.** When item 1 of 3 fails, assert items 2–3 were
   never invoked **and** that item 1's in-flight flags were cleared.
   → *catches: the `resume-at-i+1` pattern (§4.5) leaving `isPending: true` forever. A
   throughput benchmark can never surface this — the UI just hangs.*

### 11.3 Run the upstream suite against your implementation, unmodified

If you're reimplementing a known API, don't write your own compatibility tests — **vendor
theirs and alias the module specifiers**:

```js
resolve: {
  alias: {
    'competitor-core': resolve(root, 'packages/core/src/index.ts'),
    'competitor-ui':   resolve(root, 'packages/ui/src/index.ts'),
  }
}
```

Add a resolver for subpath naming differences (their `camelCase` subpaths → your
`kebab-case` files), so vendored tests import *verbatim*:

```js
function resolveSubpath(baseDir, rest) {
  const kebab = rest.split('/').map(s => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()).join('/')
  for (const c of [`${baseDir}/${kebab}.ts`, `${baseDir}/${kebab}/index.ts`, `${baseDir}/${rest}.ts`]) {
    if (existsSync(c)) return c
  }
}
```

The reimplementation runs **163 vendored runtime specs + 26 vendored type-test files**,
including ~25 regression tests named after upstream issue numbers. It keeps first-party and
vendored suites in **separate configs with mutually exclusive `include`/`exclude`** so the
two classes of evidence never blur.

It also aliases the competitor's own *third-party dependency* to its hand-rolled replacement,
so vendored tests exercise the replacement rather than the original library.

### 11.4 Also vendor their benchmarks

Running the competitor's own micro-benchmarks against your implementation prevents the
failure mode of only inventing self-favourable benchmarks.

### 11.5 Batch heavy suites into isolated processes

```js
spawnSync('vitest', ['run', '--pool=forks', '--maxWorkers=1', ...batch],
  { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } })
```

Full isolation, serial, deterministic; any nonzero status aborts.

### 11.6 CI gates

Format → lint → unused-code detection (with config hints as errors) → unit tests (including
the DCE and parity suites) → type tests → each vendored suite as its own step. Four parallel
jobs, everything on the pinned runtime.

---

## Tier 12 — Risk register: what you actually buy the speed with

Every technique above has a failure mode. These were all found in the shipped code — they
are the price, not hypotheticals.

**Correctness / semantics**
- Hand-rolled encoders diverge from spec-compliant host implementations on edge cases
  (reserved-character sets, malformed input, exponent notation). Round-trips still work;
  produced strings, cache keys, and cross-boundary comparisons differ.
- Fast paths that skip normalization produce different output for malformed-but-accepted
  inputs.
- Identity-keyed memos on mutable objects return stale results under in-place mutation.

**Architecture**
- Replacing a fine-grained dependency-tracking system with a single broadcast channel makes
  each notification cheaper but wakes **every** subscriber, each running its selector. This
  can be a net loss at scale, and it was here: a single-field toggle went from one targeted
  write to a full snapshot copy + O(n) re-map + global broadcast.
- Removing a computed/memoized derivation layer means derived values recompute and reallocate
  on **every** read. The codebase has comments working around exactly this
  (*"prefer the stable snapshot; `.get()` maps a new array on every call"*).
- Precomputation that nothing reads is pure setup cost.
- Fast lanes that allocate more than the general path on their *slow* branch are a bet on the
  fast branch always winning. Verify the bet.

**The one that matters most**

> The headline 16×/14×/30× rows measure a fast lane gated on `subscribers.size === 0`. In the
> real deployment configuration, the library always installs a subscriber — so **the lane
> never engages in production.** The benchmark ran in an environment where it did.

Before publishing a number, assert that the fast lane you're measuring is actually taken
under the configuration your users run. Add a test that fails if the gate closes in the
default setup. This is the single most important lesson in this document.

---

## Appendix — Order of operations

1. **Build the harness first.** Equal-work gate, rotating inputs, process isolation,
   duration-based timing, comparison against the published artifact.
2. **Profile allocations, not just time.** The biggest wins came from removing allocations
   the profiler attributed to functions that "looked cheap."
3. **Find the dominant input class.** What do 90% of calls actually look like? That's your
   fast lane's target.
4. **Add tier-1 fast lanes with blacklist gates and full fallback.** Write the parity suite
   in the same commit.
5. **Move work to setup time.** Compile patterns, precompute tables, hoist capability flags.
6. **Add caches from the cheapest layer up.** One-slot memo → dictionary → LRU. Cache the
   whole downstream result. Bound every cache.
7. **Delete the async** on paths that usually don't suspend.
8. **Delete the allocations.**
9. **Micro-optimize the primitives** — now they're also the guard checks for step 4.
10. **Verify optimization tiers** with `%GetOptimizationStatus`. Fix shape explosions.
11. **Shrink the graph.** Split cold modules, dynamic-import them, assert with DCE tests.
12. **Re-run the equal-work gate.** Then publish, including your losses and exclusions.
