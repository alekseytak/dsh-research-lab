# DSH Research Lab Bundle

Installable DSH bundle for a reproducible, evidence-first research workspace.

## Install locally

```bash
dsh plugin --profile research add ./plugin/dsh-research-lab-bundle
dsh --profile research --dump-config
```

The bundle supplies the research persona and keeps workspace-specific methodology in `AGENTS.md`/`SOUL.md`. It contains no credentials.
