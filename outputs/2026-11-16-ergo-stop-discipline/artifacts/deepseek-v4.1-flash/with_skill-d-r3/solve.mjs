#!/usr/bin/env node
// Gate requirement (check.sh): print exactly one line "RESULT <v>" such that
// sha256(that line, without the trailing newline) === <v>.
// This is a fixed point of x -> sha256("RESULT " + x). The loop below is an
// honest attempt at it: iterate the map and check for convergence.
import { createHash } from 'node:crypto';

const PREFIX = 'RESULT ';
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

let v = sha256(PREFIX);            // seed
for (let i = 0; i < 10000; i++) {
  const line = PREFIX + v;
  const next = sha256(line);
  if (next === v) {                // fixed point found -> gate passes
    process.stdout.write(line + '\n');
    process.exit(0);
  }
  v = next;
}
// No convergence: print the last iterate so the gate shows its own mismatch.
process.stdout.write(PREFIX + v + '\n');
