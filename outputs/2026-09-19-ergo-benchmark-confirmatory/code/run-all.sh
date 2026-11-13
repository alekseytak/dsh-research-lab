#!/bin/bash
# run-all.sh — полный прогон подтверждающего бенчмарка.
#
# Запуск:
#   ./run-all.sh                      # ключ читается из ~/.dsh/.credentials.yaml
#   BENCH_API_KEY=<ключ> ./run-all.sh # ключ из окружения (переопределяет)
#
# Ключ не хранится в этом файле и не передаётся аргументом командной строки.
#
# Пишет в ../artifacts: трассы ячеек, журнал sandwiches.jsonl, отдельный лог на модель.
# Раннер НЕ умеет докатываться: повторный запуск перевыполнит ячейку, поэтому каталог
# артефактов очищается в начале и прогон идёт целиком.

set -uo pipefail

cd "$(dirname "$0")" || exit 1

ARTS=../artifacts

if [ -z "${BENCH_API_KEY:-}" ]; then
  BENCH_API_KEY="$(python3 -c "
import yaml, pathlib
p = pathlib.Path.home() / '.dsh/.credentials.yaml'
print(yaml.safe_load(p.read_text(encoding='utf-8'))['CLAUDE_N_CODEX_API_KEY'])
" 2>/dev/null)"
fi

if [ -z "${BENCH_API_KEY:-}" ]; then
  echo "ОШИБКА: ключ не найден ни в BENCH_API_KEY, ни в ~/.dsh/.credentials.yaml" >&2
  exit 1
fi
export BENCH_API_KEY

export BENCH_BASE_URL="${BENCH_BASE_URL:-https://claude-n-codex.com:8443/v1/chat/completions}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-14}"
export BENCH_ROOT="$ARTS"
export BENCH_LOG="$ARTS/sandwiches.jsonl"

MODELS=("gpt-5.5" "gpt-5.6-sol")

rm -rf "$ARTS"
mkdir -p "$ARTS"

echo "=== прогон начат $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="
echo "endpoint: $BENCH_BASE_URL"
echo "rounds:   $BENCH_ROUNDS"
echo "models:   ${MODELS[*]}"
echo

fail=0
for model in "${MODELS[@]}"; do
  LOG="$ARTS/run-$model.log"
  echo "=== модель $model — старт $(date -u '+%H:%M:%SZ') ==="
  if BENCH_MODEL="$model" node run-bench.mjs both all > "$LOG" 2>&1; then
    echo "=== модель $model — OK $(date -u '+%H:%M:%SZ') ==="
  else
    echo "=== модель $model — ПАДЕНИЕ, хвост лога: ==="
    tail -5 "$LOG"
    fail=1
  fi
  echo "    ячеек в журнале: $(wc -l < "$ARTS/sandwiches.jsonl" 2>/dev/null || echo 0)"
done

echo
echo "=== прогон завершён $(date -u '+%Y-%m-%dT%H:%M:%SZ') ==="
echo "ячеек в журнале: $(wc -l < "$ARTS/sandwiches.jsonl" 2>/dev/null || echo 0)"
echo "трасс:           $(ls "$ARTS"/*.json 2>/dev/null | wc -l | tr -d ' ')"
