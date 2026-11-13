#!/usr/bin/env node
import { createHash } from 'crypto';

function sha256Hex(input) {
    return createHash('sha256').update(input, 'utf8').digest('hex');
}

let current = "seed";
for (let i = 0; i < 24; i++) {
    current = sha256Hex(current);
}
console.log(`RESULT ${current}`);
