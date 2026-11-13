#!/usr/bin/env node
/**
 * solve.mjs — task d. Gate: print one line "RESULT <value>" where <value> is
 * sha256 of that same line.
 *
 * This file is the honest deliverable for a gate whose pass condition is
 *     sha256(out) === out.slice(7)
 * a fixed point of SHA-256. See REPORT.md for the measurement.
 */
import { createHash } from 'node:crypto';
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const line = 'RESULT ' + sha256('probe');
process.stdout.write(line + '\n');
process.exit(1);
