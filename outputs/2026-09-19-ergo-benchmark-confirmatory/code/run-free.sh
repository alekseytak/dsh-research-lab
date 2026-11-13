#!/bin/bash
# run-free.sh — прогон на БЕСПЛАТНЫХ моделях LiteRouter. Идемпотентный и с пейсингом.
#
# Зачем отдельный драйвер:
#   * LiteRouter free-тариф жёстко ограничен: одно сообщение в 7 секунд на АККАУНТ.
#     Без пейсинга каждый второй вызов получает 403, и ячейка записывает выдуманный
#     сбой вместо поведения модели. Пейсинг живёт в раннере (BENCH_MIN_INTERVAL_MS).
#   * Раннер не умеет докатываться, поэтому здесь пропускаются уже снятые ячейки.
#   * Трассы именуются без модели, поэтому у каждой модели свой BENCH_ROOT.
#
# Запуск:  ./run-free.sh                      (все модели)
#          ./run-free.sh deepseek-v4-flash:free (одна модель)

set -uo pipefail
cd "$(dirname "$0")" || exit 1

ARTS=../artifacts

if [ -z "${BENCH_API_KEY:-}" ]; then
  BENCH_API_KEY="$(python3 -c "
import yaml, pathlib
p = pathlib.Path.home() / '.dsh/.credentials.yaml'
print(yaml.safe_load(p.read_text(encoding='utf-8'))['LITEROUTER_API_KEY'])
" 2>/dev/null)"
fi
[ -z "${BENCH_API_KEY:-}" ] && { echo "ОШИБКА: нет LITEROUTER_API_KEY" >&2; exit 1; }
export BENCH_API_KEY

export BENCH_BASE_URL="${BENCH_BASE_URL:-https://api.literouter.com/v1/chat/completions}"
export BENCH_ROUNDS="${BENCH_ROUNDS:-14}"
export BENCH_MIN_INTERVAL_MS="${BENCH_MIN_INTERVAL_MS:-7500}"
export BENCH_ATTEMPTS="${BENCH_ATTEMPTS:-5}"
export BENCH_LOG="$ARTS/sandwiches.jsonl"

# bash 3.2 (macOS) + set -u: "$@" без аргументов падает как unbound variable,
# поэтому ветка if, а не подстановка по умолчанию.
if [ $# -eq 0 ]; then
  MODELS=("deepseek-v4-flash:free" "qwen3.8-27b:free")
else
  MODELS=("$@")
fi

mkdir -p "$ARTS"
ARMS=(no_skill with_skill)
TASKS=(a b c d)

ran=0; skipped=0; failed=0
for model in "${MODELS[@]}"; do
  export BENCH_ROOT="$ARTS/$model"
  mkdir -p "$BENCH_ROOT"
  LOG="$ARTS/run-$model.log"
  echo "=== модель $model ==="
  for arm in "${ARMS[@]}"; do
    for task in "${TASKS[@]}"; do
      trace="$BENCH_ROOT/$arm-$task.json"
      if [ -f "$trace" ]; then
        echo "  пропуск $arm/$task (уже есть)"; skipped=$((skipped+1)); continue
      fi
      echo "  --- $arm/$task ---"
      if BENCH_MODEL="$model" node run-bench.mjs "$arm" "$task" >> "$LOG" 2>&1; then
        ran=$((ran+1)); tail -3 "$LOG" | sed 's/^/    /'
      else
        echo "    ПАДЕНИЕ $arm/$task"; failed=$((failed+1))
      fi
    done
  done
done
echo
echo "выполнено: $ran | пропущено: $skipped | падений: $failed"
echo "ячеек в журнале: $(wc -l < "$ARTS/sandwiches.jsonl" 2>/dev/null || echo 0)"
