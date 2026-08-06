# API Route Instructions

Scope: `src/app/api/**` (50+ Next.js Route Handlers).

## Authority

API routes are a **thin transport layer** over engine services. They are
**not** business logic.

- Routes call into `src/engine/**` services and return JSON.
- Routes do **not** mutate authoritative state directly. They dispatch
  commands or queries through the engine's runtime path.
- Routes do **not** shell out to git, prisma, or other CLIs at request time
  (with the exception of explicitly cached build-info routes that read
  generated manifests).

## Inventory

Every API route must have an inventory entry in
`.ai/project.manifest.json` → `entrypoints` (id `api`). The
`bun run ai:check` command fails when an API route exists without an
inventory entry, or vice versa.

Current route groups (all under `src/app/api/`):

| Group | Path | Purpose |
|-------|------|---------|
| root | `/api` | Health check (`{ message: "Hello, world!" }`) |
| build-info | `/api/build-info` | Returns `BUILD_MANIFEST` from `src/generated/build-manifest.ts` |
| editor | `/api/editor/*` | Editor capabilities, crash-report, step, world |
| frontier | `/api/frontier/*` | Frontier tech matrix, collision-tests, gaps, terrain, world-store, visual-evidence |
| architect | `/api/architect/*` | Architect control plane: verify, claims, workspace, rlm, z3-check, cedar-check, planetary-test, complexity, constraints, etc. |
| architect/authorial | `/api/architect/authorial/*` | Authorial vertical slice: run, status, verify, undo, transactions, persistence-check, prose-compile, behavioral-proof |
| assets | `/api/assets/*` | Asset forge, validate |
| world | `/api/world/*` | World destruct, fabric, destruction-milestone |
| engine | `/api/engine/*` | Engine run-tests, runtime |
| studio | `/api/studio/*` | Studio, animation, material |
| studio-ui | `/api/studio-ui/*` | Studio UI, inventory |
| fiberlab | `/api/fiberlab` | FiberLab scene capsule manager |
| production | `/api/production` | Production gauntlet |

## Do not

- Do **not** add a new route without an owning engine service.
- Do **not** put business logic in a route handler. Move it to
  `src/engine/**` and call it from the route.
- Do **not** return raw error stacks in production responses.
- Do **not** use absolute URLs in fetch calls from the client. Use relative
  paths only. For cross-service requests, use the `XTransformPort` query
  parameter (see `Caddyfile`).
- Do **not** use `z-ai-web-dev-sdk` on the client side. Backend only.

## Required validation

Changes under `src/app/api/` require:

1. `bun run lint` (clean).
2. `bun run typecheck` (no new errors in your files).
3. If you added a route, update `.ai/project.manifest.json` entrypoints.
4. Run `bun run ai:check` to verify inventory matches the filesystem.
5. If the route mutates state, verify the audit log captures the dispatch.

## Response shape

- Success: `NextResponse.json({ ...payload })` with HTTP 200.
- Client error: 400 with `{ error: string, detail?: string }`.
- Not found: 404 with `{ error: "not_found" }`.
- Server error: 500 with `{ error: "internal" }` (log the stack server-side,
  do not return it).

## Caddy gateway

The repository has a built-in gateway (see `Caddyfile`). Only one port
(3000) is exposed externally. For cross-service requests (e.g. to a
mini-service on port 3003), the client must use:

```
fetch('/api/example?XTransformPort=3003')
```

Never write `fetch('http://localhost:3003/api/example')` — that bypasses
the gateway.
