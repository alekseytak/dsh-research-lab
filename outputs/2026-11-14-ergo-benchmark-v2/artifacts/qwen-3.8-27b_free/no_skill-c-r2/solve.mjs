import { createHash } from "node:crypto";

let h = "seed";
for (let i = 0; i < 24; i++) {
  h = createHash("sha256").update(h, "utf8").digest("hex");
}
console.log("RESULT " + h);
