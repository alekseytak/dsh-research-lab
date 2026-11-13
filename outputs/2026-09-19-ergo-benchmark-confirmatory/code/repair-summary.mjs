/**
 * Пересборка сводок из журнала.
 *
 * Зачем: из-за дефекта перезаписи в каждом `summary-<модель>.json` осталась одна
 * запись вместо восьми. Первоисточник — `sandwiches.jsonl`, он append-only и
 * содержит все 16 строк, поэтому сводку можно честно пересобрать из него.
 *
 * Журнал НЕ изменяется. Пересобираются только производные файлы сводок.
 * Слияние идёт через `mergeCellSummary` — ту же проверенную функцию, что
 * использует раннер, поэтому пересборка и будущие прогоны дают один и тот же
 * результат.
 *
 * Запуск: node repair-summary.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeCellSummary } from './summary-store.mjs'

const STUDY = join(dirname(fileURLToPath(import.meta.url)), '..')
const JOURNAL = join(STUDY, 'artifacts', 'sandwiches.jsonl')

if (!existsSync(JOURNAL)) {
  console.error(`нет журнала: ${JOURNAL}`)
  process.exit(1)
}

/** Валидной считается ячейка с моделью и именем ячейки: остальное — не результат. */
const rows = readFileSync(JOURNAL, 'utf8')
  .split('\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line))
  .filter(row => row.model && row.cell)

const byModel = new Map()
for (const row of rows) {
  const merged = mergeCellSummary(byModel.get(row.model) ?? [], row)
  byModel.set(row.model, merged)
}

console.log(`журнал: ${rows.length} строк, моделей: ${byModel.size}`)
for (const [model, summary] of [...byModel].sort()) {
  const path = join(STUDY, 'artifacts', model, `summary-${model.replaceAll('/', '_')}.json`)
  if (!existsSync(dirname(path))) {
    console.log(`  ПРОПУСК ${model}: нет каталога артефактов`)
    continue
  }
  const before = (() => {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'))
      return Array.isArray(parsed) ? parsed.length : 'не массив'
    } catch {
      return 'нет файла'
    }
  })()
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`  ${model}: было ${before} -> стало ${summary.length}`)
}
