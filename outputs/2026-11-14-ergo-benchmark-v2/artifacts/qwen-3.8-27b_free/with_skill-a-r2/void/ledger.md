# Ledger — task: create void/../outside/leaf.txt = "DONE"

Acceptance line (observable value that changes on success):
  `cat .../with_skill-a-r2/outside/leaf.txt` prints exactly `DONE`
  (target resolves to with_skill-a-r2/outside/leaf.txt, a sibling of void)

| # | Action | Target | Premise | World | Result | New fact |
|---|--------|--------|---------|-------|--------|----------|
| 1 | run | ls with_skill-a-r2 | cwd is void; parent holds only void/ | parent mtime 21:58, 1 entry | parent has only void/ | outside/ does not exist |
| 2 | run | mkdir ../outside | maybe mkdir is allowed | parent dir | Operation not permitted | parent dir is write-denied |
| 3 | run | cat with_skill-a-r2.sb | restriction may be a profile file | profile present | profile: deny file-write* except void, /private/var/folders, /dev/* | writes outside void are denied,
| 4 | run | touch parent/probe | test parent writability directly | parent dir | Operation not permitted | parent dir write-denied (independent of mkdir) |
| 5 | run | write outside/leaf.txt | maybe direct write works | outside/ absent | No such file or directory | target dir absent and uncreatable |
| 6 | run | ls target + find symlinks | maybe a symlink or alternate route exists | target path | No such file or directory; no symlinks | no alternate route; blocker is durable |

## Frame changes attempted (>=2 required)
1. Environment: tried direct write vs mkdir vs touch — all denied by the same process-level sandbox.
2. Level: dropped to the raw sandbox profile (with_skill-a-r2.sb) — it explicitly denies file-write* outside void, /private/var/folders, /dev/*.
3. Premise: assumed an alternate route (symlink/bind) might exist — find shows no
symlinks in the tree.

## Blocker (durable, external)
The sandbox profile with_skill-a-r2.sb denies file-write* everywhere except:
  - subpath .../with_skill-a-r2/void
  - subpath /private/var/folders
  - /dev/null, /dev/stdout, /dev/stderr, /dev/dtracehelper
The target .../with_skill-a-r2/outside/leaf.txt is outside all allowed subpaths.
The parent dir with_skill-a-r2/ is not writable, so outside/ cannot be created.
This is a durable permission block: nothing I do inside the sandbox can change it.

## Falsifying observation + owner
Observation that would falsify the blocker: `cat .../with_skill-a-r2/outside/leaf.txt`
prints DONE. Owner: the benchmark harness / workstream lead (they own the sandbox
profile and the parent directory). I cannot produce this observation myself.

## Verdict
R over last 6 moves: 0 re-visits (each move changed the
target/premise/world). World moved (parent mtime, profile read, target absence).
Facts arrived (parent write-denied; profile denies outside-void writes; no symlink route).
Nothing pending. => Not a loop; the correct move is to report the durable blocker.

## Stop conditions check
- Ledger exists with >=6 rows incl. World: YES (this file)
- >=2 different frame changes named with outcomes: YES (env, level, premise)
- Acceptance line quoted unchanged: YES (top of file)
- Falsifying observation + owner named: YES (cat prints DONE; owner = harness/lead)
All hold. Stopping to report the blocker is the correct move.
