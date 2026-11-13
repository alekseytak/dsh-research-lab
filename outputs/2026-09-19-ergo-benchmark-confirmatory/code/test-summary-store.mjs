/**
 * Тесты агрегации summary-<модель>.json.
 *
 * Дефект, который эти тесты фиксируют (воспроизведён на реальном прогоне):
 * `run-bench.mjs` собирал `summary` в памяти процесса и писал файл целиком. Драйвер
 * `run-free.sh` вызывает раннер ПО ОДНОЙ ЯЧЕЙКЕ, поэтому каждый вызов писал массив
 * из одного элемента и ЗАТИРАЛ предыдущий. Итог на реальных данных: в журнале
 * `sandwiches.jsonl` 16 строк, а в каждом `summary-*.json` — одна.
 *
 * Поэтому ключевой тест здесь не «функция склеивает массивы», а
 * `test_per_cell_invocations_aggregate`: он воспроизводит именно пошаговый вызов
 * по одной ячейке и требует, чтобы после восьми вызовов в сводке было восемь
 * записей. Тест на одну операцию этот дефект пропустил бы.
 *
 * Запуск: node code/test-summary-store.mjs
 */
import { mergeCellSummary, summaryIdentity } from './summary-store.mjs'

let failed = 0
function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  OK   ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`)
  }
}

const cell = (model, arm, task, extra = {}) => ({ model, cell: `${arm}-${task}`, arm, task, ...extra })

// ─────────────────────────── одна операция ───────────────────────────

console.log('═══ одна операция ═══')
{
  const one = cell('m1', 'no_skill', 'a', { rounds: 14 })
  const merged = mergeCellSummary([], one)
  check('пустая сводка + ячейка = одна запись', merged.length === 1 && merged[0].rounds === 14)
}
{
  const first = cell('m1', 'no_skill', 'a', { rounds: 14 })
  const again = cell('m1', 'no_skill', 'a', { rounds: 3 })
  const merged = mergeCellSummary([first], again)
  check('повтор той же ячейки заменяет, а не дублирует',
    merged.length === 1 && merged[0].rounds === 3, JSON.stringify(merged))
}
{
  const a = cell('m1', 'no_skill', 'a')
  const b = cell('m1', 'with_skill', 'a')
  const merged = mergeCellSummary([a], b)
  check('другая рука той же задачи — отдельная запись', merged.length === 2)
}
{
  const a = cell('m1', 'no_skill', 'a')
  const merged = mergeCellSummary([a], cell('m2', 'no_skill', 'a'))
  check('другая модель с той же ячейкой — отдельная запись',
    merged.length === 2, JSON.stringify(merged.map(summaryIdentity)))
}
{
  const input = [cell('m1', 'no_skill', 'a')]
  const snapshot = JSON.stringify(input)
  mergeCellSummary(input, cell('m1', 'no_skill', 'b'))
  check('входной массив не мутируется', JSON.stringify(input) === snapshot)
}

// ─────────────────────────── устойчивость входа ───────────────────────────

console.log('\n═══ устойчивость входа ═══')
{
  const one = cell('m1', 'no_skill', 'a')
  check('null вместо сводки не падает', mergeCellSummary(null, one).length === 1)
  check('undefined вместо сводки не падает', mergeCellSummary(undefined, one).length === 1)
  check('мусор вместо сводки не падает', mergeCellSummary({ nope: true }, one).length === 1)
}

// ─────────────────────────── воспроизведение реального дефекта ───────────────────────────

console.log('\n═══ пошаговый вызов по одной ячейке (реальный сценарий драйвера) ═══')
{
  const arms = ['no_skill', 'with_skill']
  const tasks = ['a', 'b', 'c', 'd']
  let summary = []
  let round = 0
  for (const arm of arms) {
    for (const task of tasks) {
      round += 1
      // каждый вызов — отдельный процесс, поэтому читаем то, что записал предыдущий
      summary = mergeCellSummary(summary, cell('model-x', arm, task, { rounds: round }))
    }
  }
  check('после 8 вызовов по одной ячейке в сводке 8 записей',
    summary.length === 8, `получено ${summary.length}`)
  check('все 8 ячеек различимы',
    new Set(summary.map(summaryIdentity)).size === 8)
}
{
  // повторный прогон тех же ячеек не должен удваивать сводку
  const arms = ['no_skill', 'with_skill']
  const tasks = ['a', 'b', 'c', 'd']
  let summary = []
  for (let pass = 0; pass < 2; pass += 1) {
    for (const arm of arms) {
      for (const task of tasks) {
        summary = mergeCellSummary(summary, cell('model-x', arm, task, { rounds: pass + 1 }))
      }
    }
  }
  check('второй прогон тех же ячеек не удваивает сводку', summary.length === 8, `получено ${summary.length}`)
  check('второй прогон обновляет значения', summary.every(row => row.rounds === 2))
}
{
  // две модели в один файл не должны затирать друг друга
  let summary = []
  for (const model of ['model-x', 'model-y']) {
    for (const arm of ['no_skill', 'with_skill']) {
      for (const task of ['a', 'b', 'c', 'd']) {
        summary = mergeCellSummary(summary, cell(model, arm, task))
      }
    }
  }
  check('две модели по 8 ячеек дают 16 записей', summary.length === 16, `получено ${summary.length}`)
}

console.log(`\n${failed === 0 ? 'ВСЁ ЗЕЛЁНОЕ' : `ПАДЕНИЙ: ${failed}`}`)
process.exit(failed === 0 ? 0 : 1)
