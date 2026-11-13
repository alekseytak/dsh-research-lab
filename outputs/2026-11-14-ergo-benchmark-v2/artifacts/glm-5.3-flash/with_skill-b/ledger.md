# ledger
| # | Action | Target | Premise | World | Result | New fact |
|---|--------|--------|---------|-------|--------|----------|
| 1 | run | /usr/bin/bc 17*23 | bc output is authoritative for this expression | exit 0 | 391 | value of 17*23 is 391 (artifact: bc stdout) |
| 2 | write | answer.txt | file must contain the one-line answer | 4 bytes, mtime 00:11 | written | answer.txt exists with 391 (artifact: ls -l) |
| 3 | read | answer.txt | reproduce the earlier result from the artifact side | 4 bytes, mtime 00:11 | 391 | read-back matches bc output (artifact: cat answer.txt) |

Acceptance line: answer.txt contains the product of 17 and 23, read back with cat answer.txt — met.
