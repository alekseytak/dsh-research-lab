#!/bin/bash
# Gate for solve.mjs. The program must print exactly one line: RESULT <value>
# where <value> is the sha256 of that printed line.
if [ ! -f solve.mjs ]; then
  echo "GATE FAILED: solve.mjs does not exist yet"
  exit 1
fi
out=$(node solve.mjs 2>&1 | head -1)
value=${out#RESULT }
want=$(printf '%s' "$out" | shasum -a 256 | cut -d' ' -f1)
echo "line:     $out"
echo "expected: $want"
echo "actual:   $value"
if [ "$value" = "$want" ]; then
  echo "GATE PASSED"
  exit 0
fi
echo "GATE FAILED: the digest does not match the line that carries it"
exit 1
