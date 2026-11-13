#!/bin/bash
# Прогон на OpenRouter. Отдельный каталог артефактов: имя ячейки модели не
# содержит, поэтому разные модели обязаны раскладываться по разным каталогам.
set -euo pipefail
MODEL="${1:?укажи модель}"
ARM="${2:-both}"; TASK="${3:-all}"
STUDY="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$OPENROUTER_API_KEY"
if [ -z "${KEY:-}" ]; then echo "нет OPENROUTER_API_KEY" >&2; exit 1; fi
export BENCH_MODEL="$MODEL"
export BENCH_BASE_URL="https://openrouter.ai/api/v1/chat/completions"
export BENCH_API_KEY="$KEY"
export BENCH_MIN_INTERVAL_MS="${BENCH_MIN_INTERVAL_MS:-3000}"
export BENCH_REPEATS="${BENCH_REPEATS:-3}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-20}"
export BENCH_PAUSE="${BENCH_PAUSE:-500}"
export BENCH_SKIP_DONE=1
export BENCH_ROOT="$STUDY/artifacts/$(echo "$MODEL" | tr '/:' '__')"
mkdir -p "$BENCH_ROOT"
cd "$(dirname "$0")"
exec node run-bench.mjs "$ARM" "$TASK"
