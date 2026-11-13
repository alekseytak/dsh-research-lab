import * as crypto from 'crypto';
// We need to find a string S = "RESULT " + H such that SHA256(S) = H.
// We'll try random H values until we find a match.
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}
function findSolution() {
  const prefix = "RESULT ";
  // Try up to, say, 1 million random candidates.
  for (let i = 0; i < 1000000; i++) {
    // Generate a random 64-character hex string (32 bytes).
    const randomBytes = crypto.randomBytes(32);
    const H = randomBytes.toString('hex');
    const S = prefix + H;
    const computedHash = sha256(S);
    if (computedHash === H) {
      console.log(`RESULT ${H}`);
      return;
    }
  }
  // If not found, fallback to a deterministic approach: iterate f(x) = sha256("RESULT " + x)
  // Starting from a random seed.
  let x = crypto.randomBytes(32).toString('hex');
  for (let i = 0; i < 1000000; i++) {
    const y = sha256("RESULT " + x);
    if (y === x) {
      console.log(`RESULT ${x}`);
      return;
    }
    x = y;
  }
  // If still not found, output a placeholder (should not happen).
  console.log("RESULT placeholder");
}
findSolution();
