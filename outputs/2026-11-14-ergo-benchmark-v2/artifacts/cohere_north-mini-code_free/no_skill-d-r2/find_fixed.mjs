import { createHash } from 'crypto';
function sha256(data) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}
let v = '';
for (let i = 0; i < 10000; i++) {
  const line = 'RESULT ' + v;
  const digest = sha256(line);
  if (digest === v) {
    console.log(line);
    process.exit(0);
  }
  v = digest;
}
console.log('Not found');
process.exit(1);
