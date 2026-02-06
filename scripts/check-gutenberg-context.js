import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const linkPath = path.join(root, 'gutenberg');

const requiredFiles = [
  'packages/block-editor/README.md',
  'packages/api-fetch/README.md',
  'packages/core-data/README.md',
  'packages/data/README.md',
  'docs/how-to-guides/platform/custom-block-editor.md'
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(linkPath)) {
  fail('gutenberg context: missing ./gutenberg link/path');
}

const stat = lstatSync(linkPath);
if (!stat.isSymbolicLink()) {
  fail('gutenberg context: ./gutenberg exists but is not a symlink');
}

const target = realpathSync(linkPath);
if (!existsSync(target)) {
  fail(`gutenberg context: symlink target does not exist: ${target}`);
}

const commit = execSync('git rev-parse --short HEAD', {
  encoding: 'utf8',
  cwd: target
}).trim();

const branch = execSync('git rev-parse --abbrev-ref HEAD', {
  encoding: 'utf8',
  cwd: target
}).trim();

const dirty = execSync('git status --short', {
  encoding: 'utf8',
  cwd: target
}).trim();

const headRef = readFileSync(path.join(target, '.git', 'HEAD'), 'utf8').trim();

for (const rel of requiredFiles) {
  const filePath = path.join(target, rel);
  if (!existsSync(filePath)) {
    fail(`gutenberg context: missing required file ${rel}`);
  }
}

console.log('gutenberg context: ok');
console.log(`- link: ${linkPath} -> ${target}`);
console.log(`- branch: ${branch}`);
console.log(`- commit: ${commit}`);
console.log(`- head-ref: ${headRef}`);
console.log(`- dirty: ${dirty ? 'yes' : 'no'}`);
console.log(`- required-files: ${requiredFiles.length} present`);
