---
title: Docs Integrity
---

# Docs Integrity

## Drift prevention

Prefer importing examples from real files using VitePress' snippet import:

```md
<<< @/snippets/example.ts
```

## Typechecking examples

All `docs/snippets/**/*.ts` are typechecked in CI and locally:

```sh
bun run docs:check
```

## Twoslash

For some docs pages, use Twoslash blocks to surface types and errors:

```md
```ts twoslash
const x: string = "ok"
//      ^?
```
```
