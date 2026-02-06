import { readFileSync, existsSync } from 'node:fs';

const lcovPath = 'coverage/lcov.info';
if (!existsSync(lcovPath)) {
  console.error(`Coverage file not found: ${lcovPath}`);
  process.exit(1);
}

const minLines = Number(process.env.COVERAGE_MIN_LINES || '90');
const minFuncs = Number(process.env.COVERAGE_MIN_FUNCS || '85');

const text = readFileSync(lcovPath, 'utf8');
const records = text.split('end_of_record');

let totalLf = 0;
let totalLh = 0;
let totalFnf = 0;
let totalFnh = 0;

for (const record of records) {
  const lines = record.trim().split('\n').filter(Boolean);
  if (!lines.length) continue;

  const sfLine = lines.find((line) => line.startsWith('SF:'));
  const sf = sfLine ? sfLine.slice(3) : '';
  if (sf.includes('/packages/testing/test/helpers/')) {
    continue;
  }

  const lf = Number((lines.find((line) => line.startsWith('LF:')) || 'LF:0').slice(3));
  const lh = Number((lines.find((line) => line.startsWith('LH:')) || 'LH:0').slice(3));
  const fnf = Number((lines.find((line) => line.startsWith('FNF:')) || 'FNF:0').slice(4));
  const fnh = Number((lines.find((line) => line.startsWith('FNH:')) || 'FNH:0').slice(4));

  totalLf += lf;
  totalLh += lh;
  totalFnf += fnf;
  totalFnh += fnh;
}

const linePct = totalLf > 0 ? (totalLh / totalLf) * 100 : 100;
const funcPct = totalFnf > 0 ? (totalFnh / totalFnf) * 100 : 100;

const lineText = linePct.toFixed(2);
const funcText = funcPct.toFixed(2);

console.log(`Coverage (filtered): lines=${lineText}% funcs=${funcText}%`);
console.log(`Thresholds: lines>=${minLines}% funcs>=${minFuncs}%`);

if (linePct < minLines || funcPct < minFuncs) {
  console.error('Coverage thresholds not met.');
  process.exit(1);
}
