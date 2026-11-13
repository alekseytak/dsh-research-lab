import { createHash } from 'crypto';

function sha256hex(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// We need V such that V = sha256("RESULT " + V)
// This is a fixed-point problem. Let's try iterating from many different seeds.

// Try iterating from many different seeds
for (let s = 0; s < 10000000000; s++) {
  let seed = sha256hex('seed' + s);
  for (let i = 0; i < 100000000; i++) {
    const line = 'RESULT ' + seed;
    const h = sha256hex(line);
    if (h === seed) {
      console.log('RESULT ' + h);
      process.exit(0);
    }
    seed = h;
  }
}

// If that didn't work, try a different approach:
// Maybe the value is the sha256 of the line WITHOUT the "RESULT " prefix?
// Or maybe it's a different encoding?

// Let's try: value = sha256("RESULT " + value) but with different encodings
// Try base64, hex of
