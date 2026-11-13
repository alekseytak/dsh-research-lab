import { createHash } from 'crypto';
function sha256(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
let v = '';
let seen = new Set();
for (let i = 0; i < 1000000; i++) {
  const line = 'RESULT ' + v;
  const digest = sha256(line);
  if (digest === v) {
    console.log('Fixed point found:', line);
    process.exit(0);
  }
  if (seen.has(v)) {
    console.log('Cycle detected at iteration', i, 'value:', v);
    break;
  }
  seen.add(v);
  v = digest;
}
console.log('No fixed point found');
process.exit(1);
