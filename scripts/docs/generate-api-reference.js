import { routes } from "../../packages/contracts/src/index.js";

function asList(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return "-";
  return keys.map((k) => `\`${k}\``).join(", ");
}

function normalizeRouteName(routeName) {
  if (typeof routeName !== "string") {
    throw new Error(`Invalid route key type: ${typeof routeName}`);
  }

  const parts = routeName.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error(`Invalid route key: '${routeName}' (expected 'METHOD /path')`);
  }

  const method = parts[0];
  const path = parts.slice(1).join(" ");
  return { method, path };
}

const rows = Object.entries(routes)
  .map(([routeName, def]) => {
    if (!def || typeof def !== "object") {
      throw new Error(`Invalid route definition for '${routeName}'`);
    }
    const { method, path } = normalizeRouteName(routeName);
    return {
      routeName,
      method,
      path,
      body: asList(def.body),
      response: asList(def.response)
    };
  })
  .sort((a, b) => {
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });

const out = [
  "---",
  "title: Routes (generated)",
  "---",
  "",
  "# Routes (generated)",
  "",
  "This page is generated from `packages/contracts/src/index.js`.",
  "",
  "It documents required request/response keys (not full schemas).",
  "",
  "| Method | Path | Body keys | Response keys |",
  "| --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.method} | \`${r.path}\` | ${r.body} | ${r.response} |`),
  ""
].join("\n");

await Bun.write("docs/reference/api/routes.generated.md", out);
