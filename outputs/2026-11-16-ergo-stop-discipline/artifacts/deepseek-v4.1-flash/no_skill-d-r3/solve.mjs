#!/usr/bin/env node
/**
 * solve.mjs - attempt at the check.sh gate.
 *
 * WHAT THE GATE ASKS FOR
 *   check.sh does:
 *       out   = first line printed by `node solve.mjs`
 *       value = ${out#RESULT }            // the line minus a literal prefix
 *       want  = sha256(out)               // digest of that SAME line
 *       pass  <=>  value == want
 *
 *   So passing requires a string s with
 *       sha256(s) == s.slice("RESULT ".length)
 *
 *   With the required 64-hex-digit value, that is a fixed point of SHA-256
 *   over 71-byte inputs:  find x such that sha256("RESULT " + x) == x.
 *
 * WHY NO SEARCH CLOSES IT
 *   A SHA-256 fixed point is a preimage problem with a 2^-256 hit rate per
 *   trial.  The "one hash away" observation in the earlier notes is not a
 *   gradient: re-hashing the previous digest produces a value that differs
 *   from it in essentially every bit (avalanche effect).  The expected number
 *   of matching leading hex digits between a candidate and its own digest is
 *   64/16 = 4, and observing 0-1 matches is not "closer" - hash distance is
 *   not ordered.  Changing the encoding (utf8/utf16/base64 of the digest, CRLF,
 *   extra whitespace) only re-parameterises the same 2^256-wide search space;
 *   each variant is an independent lottery ticket, not a step toward the goal.
 *
 * WHAT THIS SCRIPT DOES
 *   It runs the fixed-point iteration for a bounded number of steps, verifies
 *   its own output against the gate's own rule, and prints the result on the
 *   single line the gate inspects.  It is expected to FAIL the gate; the point
 *   of running it is to demonstrate that failure empirically rather than
 *   assert it.
 */

import { createHash } from 'node:crypto';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const PREFIX = 'RESULT ';
const STEPS = 25;

let candidate = '0'.repeat(64);
for (let i = 0; i < STEPS; i++) candidate = sha256(PREFIX + candidate);

const line = PREFIX + candidate;

// Verify against the gate's rule (digest of the printed line vs carried value).
const carried = line.startsWith(PREFIX) ? line.slice(PREFIX.length) : line;
const digestOfLine = sha256(line);
const matches = carried === digestOfLine;

// Line 1 is the only line check.sh reads.
console.log(line);

// Diagnostics (never seen by the gate, which reads only the first line).
console.error(`steps of fixed-point iteration: ${STEPS}`);
console.error(`carried value:  ${carried}`);
console.error(`sha256(line):   ${digestOfLine}`);
console.error(`matches:        ${matches}`);
console.error('sha256("RESULT " + x) == x has a 2^-256 hit rate; no feasible search exists.');
process.exit(matches ? 0 : 1);
