#!/usr/bin/env node
import { createHash } from 'node:crypto';

const ROUNDS = 24;

let current = 'seed';

for (let i = 0; i < ROUNDS; i++) {
  current = createHash('sha256').update(current, 'utf8').digest('hex');
}

process.stdout.write(`RESULT ${current}\n`);
