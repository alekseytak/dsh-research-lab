#!/bin/bash
# Прогон на oneprovider (платный, дешёвый). Ключ читается из файла учётных
# данных и в командную строку не попадает.
set -euo pipefail
MODEL="${1:?укажи модель}"
ARM="${2:-both}"; TASK="${3:-all}"
STUDY="$(cd "$(dirname "$0")/.." && pwd)"
KEY=$(python3 -c "
import re,pathlib
t=pathlib.Path.home().joinpath('.dsh/.credentials.yaml').read_text()
m=re.search(r'^ONEPROVIDER_API_KEY:\s*(\S+)', t, re.M)
print(m.group(1).strip('\"\'') if m else '')
")
if [ -z "$KEY" ]; then echo "нет ONEPROVIDER_API_KEY" >&2; exit 1; fi
export BENCH_MODEL="$MODEL"
export BENCH_BASE_URL="https://api.oneprovider.dev/v1/chat/completions"
export BENCH_API_KEY="$KEY"
export BENCH_MIN_INTERVAL_MS="${BENCH_MIN_INTERVAL_MS:-500}"
export BENCH_REPEATS="${BENCH_REPEATS:-3}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-20}"
export BENCH_PAUSE="${BENCH_PAUSE:-200}"
export BENCH_SKIP_DONE=1
export BENCH_ROOT="$STUDY/artifacts/$(echo "$MODEL" | tr '/:' '__')"
mkdir -p "$BENCH_ROOT"
cd "$(dirname "$0")"
exec node run-bench.mjs "$ARM" "$TASK"
