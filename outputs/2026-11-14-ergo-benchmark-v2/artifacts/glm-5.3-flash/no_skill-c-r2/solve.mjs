import { createHash } from 'node:crypto';

let text = 'seed';
for (let i = 0; i < 24; i++) {
  text = createHash('sha256').update(text, 'utf8').digest('hex');
}
process.stdout.write('RESULT ' + text + '\n');
