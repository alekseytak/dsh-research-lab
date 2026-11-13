#!/bin/bash
# Прогон на LiteRouter. Ключ читается из файла учётных данных и в командной
# строке не появляется, чтобы не попасть в журнал заданий и в трассы.
set -euo pipefail
MODEL="${1:-qwen-3.8-27b:free}"
STUDY="$(cd "$(dirname "$0")/.." && pwd)"
KEY=$(python3 -c "
import re,pathlib
t=pathlib.Path.home().joinpath('.dsh/.credentials.yaml').read_text()
m=re.search(r'^LITEROUTER_API_KEY:\s*(\S+)', t, re.M)
print(m.group(1).strip('\"\'') if m else '')
")
if [ -z "$KEY" ]; then echo "нет ключа LITEROUTER_API_KEY" >&2; exit 1; fi
export BENCH_MODEL="$MODEL"
export BENCH_BASE_URL="https://api.literouter.com/v1/chat/completions"
export BENCH_API_KEY="$KEY"
export BENCH_MIN_INTERVAL_MS="${BENCH_MIN_INTERVAL_MS:-7000}"
export BENCH_REPEATS="${BENCH_REPEATS:-3}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-20}"
export BENCH_PAUSE="${BENCH_PAUSE:-500}"
export BENCH_ROOT="$STUDY/artifacts/$(echo "$MODEL" | tr '/:' '__')"
mkdir -p "$BENCH_ROOT"
cd "$(dirname "$0")"
exec node run-bench.mjs both all
