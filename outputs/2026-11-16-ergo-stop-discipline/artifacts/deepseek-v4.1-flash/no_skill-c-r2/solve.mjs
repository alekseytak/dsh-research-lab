#!/usr/bin/env node
import { createHash } from "node:crypto";

const ROUNDS = 24;

function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

let value = "seed";

// Apply 24 hashes: each round hashes the lowercase hex digest of the
// previous round, treated as UTF-8 text. Round 1 hashes the seed itself.
for (let i = 0; i < ROUNDS; i++) {
  value = sha256Hex(value);
}

process.stdout.write(`RESULT ${value}\n`);
