import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { defaultLightTheme, toWpThemeJson } from '../../../apps/admin-web/src/features/theme/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadWpThemeSchema() {
  const schemaPath = path.resolve(__dirname, '../../../gutenberg/schemas/json/theme.json');
  return JSON.parse(readFileSync(schemaPath, 'utf8'));
}

test('toWpThemeJson output validates against Gutenberg theme.json schema', () => {
  const schema = loadWpThemeSchema();
  const ajv = new Ajv({
    allErrors: true,
    strict: false
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const wpThemeJson = toWpThemeJson(defaultLightTheme);
  const valid = validate(wpThemeJson);
  if (!valid) {
    assert.fail(JSON.stringify(validate.errors, null, 2));
  }
});
