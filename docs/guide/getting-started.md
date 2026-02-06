---
title: Getting Started
---

# Getting Started

## Prereqs

- Bun

## Install

```sh
bun install
```

## Run the API (Node HTTP server)

```sh
bun run start:api
```

Default local credentials (in-memory): `admin` / `admin`.

## Run the Admin (Vite dev server)

```sh
bun run dev:admin
```

## Run the API as a Cloudflare Worker (local)

```sh
cp .dev.vars.example .dev.vars
bunx wrangler dev --local
```

## Run tests

```sh
bun test
```

## Docs site

```sh
bun run docs:dev
```
