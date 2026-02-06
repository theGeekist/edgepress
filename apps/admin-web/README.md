# admin-web

RN-web-first admin host for GCMS with Gutenberg canvas embedding.

Architecture:
- `src/app`: app shell + theme state
- `src/components/ui`: reusable UI primitives
- `src/features/*`: per-feature state and composition
- `src/editor-shell.js`: canonical SDK session transport (shared auth refresh path)

MVP rules:
- Use canonical SDK-backed stores.
- Do not use `@wordpress/core-data` for CRUD in phase 1.
- Configure `@wordpress/api-fetch` middleware for auth refresh + trace propagation.
- Keep app-level styles in RN-web `StyleSheet` and theme tokens.
- Gutenberg package CSS is the allowed global CSS exception for editor rendering fidelity.

## Run

1. Start API: `bun run start:api`
2. Start web app: `bun run dev:admin`
3. Open the URL printed by Vite (default `http://localhost:5173`)

Local dev uses Vite proxy by default (same-origin mode). Set `VITE_API_BASE_URL=http://localhost:8787` only when you explicitly want cross-origin mode.

Default credentials in local in-memory mode: `admin` / `admin`.
