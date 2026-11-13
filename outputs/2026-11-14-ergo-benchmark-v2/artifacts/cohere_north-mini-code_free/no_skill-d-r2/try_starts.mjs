import { createHash } from 'crypto';
function sha256(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
function findFixed(start) {
  let v = start;
  let seen = new Set();
  for (let i = 0; i < 1000000; i++) {
    const line = 'RESULT ' + v;
    const digest = sha256(line);
    if (digest === v) {
      return line;
    }
    if (seen.has(v)) {
      break;
    }
    seen.add(v);
    v = digest;
  }
  return null;
}
const candidates = ['', '0', '1', 'a', 'deadbeef'.padEnd(64, '0'), '00000000000000000000000000000000', 'ffffffffffffffffffffffffffffffff'];
for (const start of candidates) {
  const result = findFixed(start);
  if (result) {
    console.log('Found with start', start, ':', result);
    process.exit(0);
  }
}
console.log('No fixed point found with those starts');
process.exit(1);
