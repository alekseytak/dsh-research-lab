import { createHash } from 'crypto';

function sha256hex(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// We need V such that V = sha256("RESULT " + V)
// This is a fixed-point problem. Let's try iterating from different seeds.

// Try iterating from many different seeds
for (let start = 0; start < 100000; start++) {
  let seed = start.toString(16).padStart(64, '0');
  for (let i = 0; i < 1000; i++) {
    const h = sha256hex('RESULT ' + seed);
    if (h === seed) {
      console.log('RESULT ' + h);
      process.exit(0);
    }
    seed = h;
  }
}

// If that didn't work, try a different approach:
// Maybe the line format is different. Let's try "RESULT\n" + value
// or the value is the sha256 of just the value itself (without "RESULT ")
for (let start = 0; start < 100000; start++) {
  let seed = start.toString(16).
