import { createHash } from 'node:crypto';

let current = 'seed';
for (let i = 0; i < 24; i++) {
  current = createHash('sha256').update(current, 'utf8').digest('hex');
}

console.log(`RESULT ${current}`);
