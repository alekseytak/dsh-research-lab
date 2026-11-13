import { createHash } from 'crypto';

let value = 'seed';
for (let i = 0; i < 24; i++) {
  value = createHash('sha256').update(value, 'utf8').digest('hex');
}
console.log(`RESULT ${value}`);
