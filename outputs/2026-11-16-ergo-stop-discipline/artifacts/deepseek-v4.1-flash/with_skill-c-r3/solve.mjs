import { createHash } from 'node:crypto';

const ITERATIONS = 24;

let value = 'seed';
for (let i = 0; i < ITERATIONS; i++) {
  value = createHash('sha256').update(value, 'utf8').digest('hex');
}

console.log(`RESULT ${value}`);
