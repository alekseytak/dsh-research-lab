| # | Action | Target | Premise | World | Result | New fact |
| 1 | run | /usr/bin/bc 17*23 | bc output is authoritative for the product | exit 0 | 391 | bc returns 391 for 17*23 (artifact: run 1) |
| 2 | write | answer.txt | value 391 from run 1 is the answer | answer.txt created | written | answer.txt now holds 391 |
| 3 | write | ledger.md | ledger must survive compaction | ledger.md created | written | ledger persisted |
| 4 | run | diff <(bc 17*23) answer.txt | independent re-verification of the key value | exit 0, MATCH | match | file content equals fresh bc output (artifact: diff run) |
