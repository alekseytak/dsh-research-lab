// The gate (check.sh) requires: value === sha256(the entire printed line),
// where value is the line with the "RESULT " prefix removed.
// That means the printed line L must satisfy:
//   L = "RESULT " + H  and  H = sha256(L)
// i.e. a SHA-256 fixed point (finding x with hex(sha256(x)) == x).
// No such point is known for SHA-256 and finding one costs ~2^256 hash
// evaluations - not computable by any practical effort, encoding, or number
// of attempts. This script therefore prints the exact required line shape
// with the digest of its own payload, which is as close as is possible:
// the value is correct for everything EXCEPT the 64 bytes it cannot know.
import { createHash } from "node:crypto";

const payload = "RESULT ";
const h = createHash("sha256").update(payload).digest("hex");
console.log(payload + h); // any L here fails: H must equal sha256("RESULT "+H)
