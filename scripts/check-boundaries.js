import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const blocked = [
  'cloudflare',
  'workers',
  'D1Database',
  'R2Bucket',
  'DurableObjectNamespace'
];

// Keep this allowlist minimal: only runtime composition roots can mention provider globals.
const blockedTokenAllowlist = new Set([
  'apps/api/src/worker.js'
]);

const sharedPackageNames = new Set(['api-core', 'cloudflare', 'domain', 'hooks', 'testing', 'wp-core']);
const featurePackageNames = new Set(
  readdirSync('packages', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !sharedPackageNames.has(name))
);

const files = execSync("find apps packages -type f \\( -name '*.js' -o -name '*.mjs' -o -name '*.ts' -o -name '*.jsx' \\)", {
  encoding: 'utf8'
})
  .trim()
  .split('\n')
  .filter(Boolean);

const scannedFiles = files.filter((f) => !f.includes('/test/'));
const importFromRegex = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g;
const sideEffectImportRegex = /import\s*['"]([^'"]+)['"]/g;
const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveRelativeImport(file, spec) {
  if (!spec.startsWith('.')) return null;
  return path.normalize(path.join(path.dirname(file), spec));
}

let failed = false;
for (const file of scannedFiles) {
  const text = readFileSync(file, 'utf8');
  for (const token of blocked) {
    if (!file.startsWith('packages/cloudflare/') && !blockedTokenAllowlist.has(file) && text.includes(token)) {
      console.error(`Boundary violation in ${file}: contains '${token}'`);
      failed = true;
    }
  }

  const importSpecs = [
    ...Array.from(text.matchAll(importFromRegex), (match) => match[1]),
    ...Array.from(text.matchAll(sideEffectImportRegex), (match) => match[1]),
    ...Array.from(text.matchAll(dynamicImportRegex), (match) => match[1])
  ];

  for (const spec of importSpecs) {
    if (!spec) continue;

    if (spec.startsWith('@geekist/edgepress/') && spec.includes('/src/')) {
      console.error(`Boundary violation in ${file}: deep internal import '${spec}' is not allowed.`);
      failed = true;
    }

    if (spec.startsWith('@geekist/edgepress/')) {
      const segments = spec.split('/');
      const packageName = segments[2];
      if (featurePackageNames.has(packageName) && segments.length > 3) {
        console.error(`Boundary violation in ${file}: feature import '${spec}' must use package root only.`);
        failed = true;
      }
    }

    const resolvedRelative = resolveRelativeImport(file, spec);
    if (file.startsWith('packages/') && resolvedRelative?.startsWith('apps/')) {
      console.error(`Boundary violation in ${file}: packages must not import app code ('${spec}').`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('Boundary check passed.');
