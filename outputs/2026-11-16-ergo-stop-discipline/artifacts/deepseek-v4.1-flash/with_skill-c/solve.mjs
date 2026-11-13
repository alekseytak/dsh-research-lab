#!/usr/bin/env node
import { createHash } from 'node:crypto';

const ROUNDS = 24;
let digest = 'seed';
for (let i = 0; i < ROUNDS; i++) {
  digest = createHash('sha256').update(digest, 'utf8').digest('hex');
}
process.stdout.write(`RESULT ${digest}\n`);
