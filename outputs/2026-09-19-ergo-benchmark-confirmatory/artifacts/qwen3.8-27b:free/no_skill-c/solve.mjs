import { createHash } from "node:crypto";

let digest = "seed";
for (let i = 0; i < 24; i++) {
  digest = createHash("sha256").update(digest, "utf8").digest("hex");
}

console.log(`RESULT ${digest}`);
