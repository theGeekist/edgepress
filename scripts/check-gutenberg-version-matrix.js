import { readFileSync } from 'node:fs';

const EXPECTED = {
  '@wordpress/api-fetch': '7.39.0',
  '@wordpress/block-editor': '15.12.0',
  '@wordpress/block-library': '9.39.0',
  '@wordpress/blocks': '15.12.0',
  '@wordpress/components': '32.1.0',
  '@wordpress/core-data': '7.39.0',
  '@wordpress/data': '10.39.0',
  '@wordpress/dom-ready': '4.39.0',
  '@wordpress/edit-post': '8.39.0',
  '@wordpress/editor': '14.39.0',
  '@wordpress/element': '6.39.0',
  '@wordpress/hooks': '4.39.0',
  '@wordpress/interface': '9.24.0',
  '@wordpress/preferences': '4.39.0'
};

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const deps = packageJson.dependencies || {};

const failures = [];
for (const [name, expected] of Object.entries(EXPECTED)) {
  const actual = deps[name];
  if (!actual) {
    failures.push(`${name}: missing (expected ${expected})`);
    continue;
  }
  if (actual !== expected) {
    failures.push(`${name}: found ${actual}, expected ${expected}`);
  }
  if (actual.startsWith('^') || actual.startsWith('~')) {
    failures.push(`${name}: floating range ${actual} is not allowed`);
  }
}

if (failures.length > 0) {
  console.error('Gutenberg version matrix check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Gutenberg version matrix check passed.');
