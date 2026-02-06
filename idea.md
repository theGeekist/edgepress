# Decoupling Gutenberg into a Standalone, Workers-First CMS

## What “decoupling Gutenberg” actually means in practice

Decoupling Gutenberg from WordPress is less about “extracting a single editor app” and more about **replacing an invisible runtime contract** that WordPress normally supplies: REST endpoints and entity shapes, authentication and capability checks, a media library and picker integration, autosaves and revisions, template/theme settings, and a set of globals and conventions that the editor (and third-party blocks) often rely on implicitly.

The key architectural stabiliser is that Gutenberg is already designed as a **platform**: a set of JavaScript packages that can be embedded in non-WordPress applications, and the block editor packages are explicitly usable for “standalone editors.” That portability also extends to **React Native**: Gutenberg’s mobile editor work makes “client-agnostic admin” a real constraint, not a nice-to-have.

### The invariants we’re building around

Instead of treating “WordPress compatibility” as a fork in the road, we treat it as a layered strategy atop stable invariants:

1. **Admin is client-agnostic.**
   The editor and admin shell must work across web, React Native, and potentially desktop clients. Nothing about the backend assumes “browser admin”.

2. **Edge-functions-first API is the product.**
   Gutenberg is a client. The CMS is a strongly designed API layer with explicit contracts for content, media, revisions, auth, settings, preview, and publish.

3. **The public site is a static release.**
   Published output is served as release artefacts (static HTML/CSS/JS plus a manifest). “CMS uptime” is not a serving dependency.

4. **Dynamic runtime concerns are deliberately tiny.**
   Public runtime logic is almost entirely:

   * **forms** (writes, webhook ingestion, lead capture, etc.)
   * **gated reads** (members/private pages)
     Everything else can be static, including search.

5. **WordPress REST “shape” is a compatibility façade.**
   We can model much of WP REST to reduce ecosystem friction, without inheriting WP internals, PHP runtime, or MySQL assumptions.

6. **Everything infrastructure-facing is adapter/DI.**
   Storage mechanisms are not hard-coded, and neither is the edge platform. The architecture assumes pluggable adapters for:

   * structured data (SQL or equivalent),
   * blob/artefact storage,
   * cache/index/token storage,
   * coordination (optional),
   * and the edge runtime itself.
     Practically we may ship “Cloudflare first,” but the core must be written against a **general edge-functions contract** so the system can target the broader consensus of Workers/Functions runtimes without a rewrite.

A crucial stabiliser is Gutenberg’s **block serialisation format**: blocks are serialisable with a defined grammar (comment-delimited blocks with JSON attributes). This means content can be stored as block-HTML (WP-style) or a normalised JSON representation and still round-trip safely.

## Gutenberg repository and package architecture relevant to a standalone host

### Monorepo shape and where the “WordPress plugin” ends and “platform packages” begin

The Gutenberg monorepo contains both JavaScript packages and WordPress-plugin glue. You’ll see platform surfaces (`packages/`, `docs/`, `schemas/`, storybook assets) and also WordPress/PHP integration code (plugin entrypoints, composer config, PHP test scaffolding). That dual nature is exactly why “decoupling” is a contract replacement problem, not a simple extraction.

The most important takeaway: you are not “porting WordPress.” You are embedding Gutenberg packages, then satisfying what they assume exists.

### Core conceptual layers you inherit when you embed Gutenberg

A practical layer map for a standalone host looks like this:

* **Editor UI composition layer**
  `@wordpress/block-editor` gives you the “editor core”: provider components, block list editing, change callbacks, and the block tree.

* **Editor “screen” scaffolding layer**
  Packages like `@wordpress/interface` are essentially “screen framework”: sidebars, persistent UI state, menus/panels. Useful even outside WP, but they bring “screen” conventions and store patterns.

* **State/data layer (Redux-ish)**
  `@wordpress/data` provides registries, stores, selectors, resolvers, and async patterns. This is one of the biggest “invisible contracts” because plugin authors often expect the data-layer patterns to exist.

* **WordPress entity layer (compat-relevant)**
  `@wordpress/core-data` is “WP entities resolved from WP REST”. It’s convenient, but it encodes WP assumptions. A standalone host can keep the ecosystem happy by presenting WP-shaped endpoints, while still using its own canonical domain model behind the façade.

* **Transport layer**
  `@wordpress/api-fetch` is the key seam. It supports middleware and a pluggable fetch handler. This is the cleanest path to “same editor clients, different backend”.

* **Extensibility/eventing layer**
  `@wordpress/hooks` is the canonical JS actions/filters system. Many modern block plugins align here already. This is where “hooks parity” should live: one hooks universe, not a JS/PHP split.

* **Internationalisation layer**
  `@wordpress/i18n` gives client-side localisation. Important for a client-agnostic admin: you don’t want i18n tied to a server-rendered WP admin.

* **Content model layer**
  Blocks, patterns, reusable blocks, templates, styles. WordPress stores some of these as post types, but the concept isn’t WordPress-bound. Your platform can model them as first-class entities.

### Internal data flow as it exists inside WordPress (and what we keep)

Inside WordPress, Gutenberg often follows this flow:

1. UI events update block state through the block editor provider and data stores.
2. Data changes route through `@wordpress/data` stores and resolvers.
3. Entity operations often funnel through `@wordpress/core-data`.
4. HTTP goes through `api-fetch`, configured with WP root + nonce behaviour.

In a standalone host we **keep** (1) and (2) because they’re core to how Gutenberg and plugins work. We **replace** the backend contract: same editor clients, but the API is an edge-functions service that implements the required entity shapes and behaviours.

Here’s the same diagram, but reframed to match our invariants (client-agnostic admin → edge-functions API → release pipeline), *and* showing the adapter boundary explicitly:

```mermaid
flowchart LR
  UI[Editor Clients\nWeb + RN + Desktop] --> DATA[@wordpress/data\nstores + registry]
  DATA --> HOOKS[@wordpress/hooks\nfilters/actions]
  DATA --> APIFETCH[@wordpress/api-fetch\nfetch handler + middleware]
  APIFETCH --> API[(CMS API\nEdge Functions)]
  API --> PORTS[[Ports/Adapters\n(Infra DI Boundary)]]
  PORTS --> DB[(Structured Store\nSQL adapter)]
  PORTS --> BLOBS[(Blob/Artefact Store\nadapter)]
  PORTS --> CACHE[(Cache/Index/Token Store\nadapter)]
  PORTS --> COORD[(Coordination\noptional adapter)]
  API --> RELEASES[(Release pipeline\npublish manifests)]
  RELEASES --> SITE[Static Site\nPages/any host]
```

## Runtime assumptions and contracts you must replace or emulate

### Authentication and capability assumptions

WordPress commonly uses cookie+nonce semantics for editor requests. A standalone host does not need to replicate that model, but it must provide:

* editor-facing auth suitable for web *and* RN clients (OAuth2/OIDC-style flows are natural)
* capability checks that map cleanly to editor actions (edit vs publish, template editing access, etc.)
* `api-fetch` configuration that injects your auth tokens and handles refresh/expiry cleanly

The key is not nonce parity; it’s predictable permissions and ergonomic client auth.

### Entity CRUD assumptions (posts, templates, reusable blocks, media)

Gutenberg’s ecosystem assumes certain entity shapes and behaviours (posts/pages/media/templates/reusable blocks). Compatibility improves dramatically if your API exposes familiar list/read/write semantics, pagination, filtering, and stable endpoints.

The important constraint: **this is “nomysql”, not “nosql.”**
We are not adopting a database ideology; we are removing a legacy runtime dependency. The canonical model can be relational without being WordPress/MySQL.

### Media assumptions and injection points

Gutenberg exposes seams for media integration (core blocks need a picker; host apps inject the implementation). Media decomposes into:

* metadata + indexing (structured store adapter)
* immutable blobs + URLs (blob/artefact store adapter)

R2 is a clean default for CF-first implementations, but the invariant is that the published site can serve media statically without depending on CMS runtime.

### Dynamic blocks and “server rendering”

For this architecture, the principle is:

* **Published pages do not require runtime rendering.** Publish produces release artefacts.
* **Runtime is reserved for forms + gated reads.** Anything else is either precomputed at publish time or treated as an explicit endpoint with caching rules.

This reframes “dynamic blocks” into a pipeline concern rather than “run PHP” in production.

### `wp.*` globals and ecosystem-friendly compatibility surfaces

If you want plugin authors to dual-support cheaply, you will almost certainly ship a compatibility layer that provides:

* `wp.data`, `wp.hooks`, `wp.i18n`, `wp.blocks`, etc.
* default registries/hook instances
* stable execution ordering and predictable context

This is a compatibility handshake, not your internal architecture.

## Designing a standalone CMS host as an edge-portable platform

This section defines the “functions-first CMS” shape while explicitly avoiding hard coupling to any single edge or storage vendor.

### The edge runtime is an adapter, too

Even though Cloudflare is the natural first target, the CMS core should not import CF-specific APIs throughout the codebase. Instead, the core depends on a small “edge runtime port” that provides:

* request/response primitives
* environment config access
* logging/telemetry hooks
* durable cache primitives where available
* background work primitives where available (or explicit “not supported” fallbacks)

This keeps the system honest: “Cloudflare-first” is an implementation choice, not an architectural lock-in.

### Storage primitives are ports, not decisions

The CMS core should talk to **ports** that represent capabilities:

* `StructuredStore` (SQL-ish CRUD + transactions where supported)
* `BlobStore` (put/get + multipart or chunking when supported)
* `CacheStore` (KV-ish lookups + TTL semantics)
* `Coordination` (locks/presence/strong consistency) optional

An ORM/data layer that supports multiple runtimes is *suggestive* here (e.g., Drizzle-style thinking), but the document intentionally avoids tool selection. The invariant is: **storage and edge bindings are injected**.

### Publishing as releases (data-plane invariant)

Publishing produces an immutable release:

* a manifest (routes → artefacts, hashes, metadata)
* static artefacts (HTML/CSS/JS, optional JSON payloads)
* references to media blobs

The public site serves a selected release. Rollback is manifest switching, not database surgery.

### Gated pages and “HTML caching behind auth”

Private/member pages can remain “static under the hood”:

* Worker/function validates token
* serves cached HTML for a given release+route(+role/cohort)
* if cache miss, pulls from static origin (Pages or artefact store), caches, returns

This keeps private reads cheap and avoids introducing runtime rendering as a dependency.

## Risks, rabbit holes, and a roadmap aligned to these invariants

### The rabbit holes that matter most

* **Theme.json + style engine parity** is a deeper pit than “core blocks”.
* **`wp.*` compatibility** gets messy in multi-instance and plugin-heavy scenarios.
* **Dynamic block ecosystem** often depends on PHP assumptions; the path forward is publish-time transforms and a capability-scoped plugin model.
* **Portability discipline**: without the adapter boundary, CF-specific code will leak everywhere and the “edge-portable” goal becomes theatre.

### Roadmap that matches the architecture we’re committing to

1. **Stand up the core contracts (ports + domain model).**
   Define the ports (edge runtime + storage) and the canonical domain model (docs, revisions, media, releases, auth/caps). Everything depends on these.

2. **Build editor clients against the contract (web + RN).**
   Prove client agnosticism early: same entities, same auth flows, same content serialisation, same revision semantics.

3. **Implement the Cloudflare adapters first.**
   Workers + D1 + R2 + KV (+ optional DO) as the reference implementation, but keep it behind the ports boundary.

4. **Ship publishing as immutable releases.**
   Make the public site independent of CMS runtime. This is the “free beats WP” economic lever.

5. **Add the WP REST façade and `wp.*` compatibility surfaces.**
   Do this as a layer over the canonical API to reduce ecosystem friction and make dual-support cheap for plugin/theme authors.

6. **Expand into themes/templates and capability-scoped plugins.**
   Treat site editing and plugin execution phases (editor/build/edge) as explicit platform features.