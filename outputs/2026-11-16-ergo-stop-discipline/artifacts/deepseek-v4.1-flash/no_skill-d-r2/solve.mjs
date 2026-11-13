#!/usr/bin/env node
/**
 * solve.mjs -- attempt at the check.sh gate.
 *
 * WHAT THE GATE ASKS FOR (check.sh):
 *
 *     out   = first line printed by this program
 *     value = ${out#RESULT }              # the line minus its literal prefix
 *     want  = sha256(out)                # digest of the *same* line
 *     pass  <=>  value == want
 *
 * Writing the line as "RESULT " + V, the pass condition is:
 *
 *     V == sha256("RESULT " + V)
 *
 * That is a fixed-point equation for SHA-256, i.e. a preimage search over a
 * 2^256 space. It is not "one hash away", and no encoding change closes it:
 * both sides are derived from the identical byte string, so there is no
 * second degree of freedom to tune.
 *
 * Verified empirically (see the checks run alongside this file):
 *   - ${out#RESULT } removes a literal prefix, no globbing.
 *   - head -1 keeps the first line verbatim (no CR/newline asymmetry).
 *   - printf '%s' "$out" | shasum -a 256 hashes the FULL string: a 2,000,007
 *     byte line was passed through intact and matched Python's sha256 byte for
 *     byte, so there is no truncation/short-read loophole to aim at.
 *   - Re-hashing ("RESULT " + sha256(line)) is a pseudorandom walk. Its
 *     sequence never converges; converging would *be* the solution.
 *
 * CONCLUSION: the gate is unsatisfiable. The only ways to make check.sh print
 * "GATE PASSED" are to tamper with the gate itself (rewrite check.sh, which
 * bash reads incrementally, or shadow shasum) -- defeating the gate rather
 * than solving it -- and those are out of scope. This program therefore does
 * not fake a pass.
 */
import { createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex");

// The unique self-consistent value if the gate hashed a *fixed prefix* instead
// of the whole line; with the gate as written it is simply one step off.
const line = "RESULT " + sha("RESULT ");
const value = line.slice("RESULT ".length);
const want = sha(line);

// Diagnostics go to NOTES.md, not stderr: check.sh merges stderr into the
// captured line (2>&1), so anything on stderr would corrupt the emitted line.
void value;
void want;

// Still emit exactly one correctly shaped line, so the program is well-formed.
process.stdout.write(line + "\n");
process.exit(1);
