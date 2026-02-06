---
title: Admin Web
---

# Admin Web

Admin web is a web-first host for Gutenberg that uses the canonical SDK client for CRUD.

## What exists today

- An `editor-shell` that manages auth session + refresh + logout.
- A canonical SDK-backed store (no `@wordpress/core-data` for CRUD in phase 1).
- `@wordpress/api-fetch` middleware configuration for auth + trace + refresh.

Key files:

- `apps/admin-web/src/editor-shell.js`
- `apps/admin-web/src/gutenberg-integration.js`

## Raw design notes

- [/appendix/admin-web-readme](/appendix/admin-web-readme)
