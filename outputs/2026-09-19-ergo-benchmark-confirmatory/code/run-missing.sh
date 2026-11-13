#!/bin/bash
# run-missing.sh — ИДЕМПОТЕНТНЫЙ прогон: выполняет только те ячейки, чьих трасс ещё нет.
#
# Запуск:
#   ./run-missing.sh            # все модели из MODELS
#   ./run-missing.sh gpt-5.5    # только указанная модель
#
# Зачем: раннер не умеет докатываться и перевыполняет ячейку целиком. Здесь готовность
# определяется по наличию артефакта <рука>-<задача>.json, поэтому повторный запуск
# безопасен и не создаёт дубликатов в журнале.

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
[ -z "${BENCH_API_KEY:-}" ] && { echo "ОШИБКА: ключ не найден" >&2; exit 1; }
export BENCH_API_KEY
export BENCH_BASE_URL="${BENCH_BASE_URL:-https://claude-n-codex.com:8443/v1/chat/completions}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-14}"
# BENCH_ROOT задаётся пер-модель внутри цикла ниже
export BENCH_LOG="$ARTS/sandwiches.jsonl"

mkdir -p "$ARTS"
MODELS=("${@:-gpt-5.5}")
[ $# -eq 0 ] && MODELS=("gpt-5.5" "gpt-5.6-sol")

ARMS=(no_skill with_skill)
TASKS=(a b c d)

ran=0; skipped=0; failed=0
for model in "${MODELS[@]}"; do
  # Трассы именуются <рука>-<задача>.json БЕЗ модели, поэтому у каждой модели
  # собственный ROOT — иначе вторая модель перезапишет первую.
  export BENCH_ROOT="$ARTS/$model"
  mkdir -p "$BENCH_ROOT"
  LOG="$ARTS/run-$model.log"
  for arm in "${ARMS[@]}"; do
    for task in "${TASKS[@]}"; do
      trace="$BENCH_ROOT/$arm-$task.json"
      # трасса должна быть от ТЕКУЩЕЙ модели: проверяем поле model внутри
      if [ -f "$trace" ] && python3 -c "
import json,sys
d=json.load(open('$trace',encoding='utf-8'))
sys.exit(0 if d.get('model')=='$model' and d.get('rounds',1)!=0 else 1)
" 2>/dev/null; then
        skipped=$((skipped+1)); continue
      fi
      echo "--- $model / $arm / $task ---"
      if BENCH_MODEL="$model" node run-bench.mjs "$arm" "$task" >> "$LOG" 2>&1; then
        ran=$((ran+1))
        tail -3 "$LOG"
      else
        echo "    ПАДЕНИЕ ($model/$arm/$task)"; failed=$((failed+1))
      fi
    done
  done
done
echo
echo "выполнено: $ran | пропущено (уже есть): $skipped | падений: $failed"
