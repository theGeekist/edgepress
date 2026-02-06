import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const blocked = [
  'cloudflare',
  'workers',
  'D1Database',
  'R2Bucket',
  'DurableObjectNamespace'
];

const files = execSync("find apps packages -type f \\( -name '*.js' -o -name '*.ts' \\)", {
  encoding: 'utf8'
})
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.startsWith('packages/adapters-cloudflare/'));
  
const scannedFiles = files.filter((f) => !f.includes('/test/'));

let failed = false;
for (const file of scannedFiles) {
  const text = readFileSync(file, 'utf8');
  for (const token of blocked) {
    if (text.includes(token)) {
      console.error(`Boundary violation in ${file}: contains '${token}'`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('Boundary check passed.');
