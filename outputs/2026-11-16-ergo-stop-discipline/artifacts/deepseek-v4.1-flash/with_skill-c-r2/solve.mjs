#!/usr/bin/env node
import { createHash } from 'node:crypto';

// Iterated SHA-256 hash chain:
// round 0 input is the UTF-8 string "seed";
// each round hashes the previous lowercase hex digest as UTF-8 text.
let value = 'seed';
for (let i = 0; i < 24; i++) {
  value = createHash('sha256').update(value, 'utf8').digest('hex');
}

process.stdout.write(`RESULT ${value}\n`);
