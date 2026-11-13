import { createHash } from 'crypto';

function sha256hex(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// We need: value = sha256("RESULT " + value)
// This is a fixed-point of f(v) = sha256("RESULT " + v)
//
// Strategy: iterate f from many seeds. If the orbit revisits a value
// at the next step (cycle length 1), we found a fixed point.

function findFixedPoint(seed, maxIter = 200000) {
  let v = seed;
  const seen = new Map();
  for (let i = 0; i < maxIter; i++) {
    if (seen.has(v)) {
      const firstIdx = seen.get(v);
      const cycleLen = i - firstIdx;
      if (cycleLen === 1) return v;
      return null;
    }
    seen.set(v, i);
    v = sha256hex("RESULT " + v);
  }
  return null;
}

// Try many seeds
const seeds = [];
for (let i = 0; i < 100000; i++) {
  seeds.push(sha256hex(String(i)));
}
// Also add some
