/**
 * Сверка сводок с журналом — поле за полем.
 *
 * Зачем: в `methods.md` было записано «176 полей, 0 расхождений», но скрипта,
 * который это считает, в каталоге не было (`repair-summary.mjs` только печатает
 * «было -> стало», он ничего не сравнивает). Число без скрипта невоспроизводимо,
 * поэтому независимый аудит посчитал иначе (256). Этот файл делает проверку
 * настоящей и повторяемой.
 *
 * Сверяется КАЖДЫЙ ключ каждой записи сводки с соответствующей строкой журнала.
 * Записи сопоставляются по паре (model, cell) — той же идентичности, что
 * использует `summaryIdentity` из `summary-store.mjs`.
 *
 * Журнал НЕ изменяется. Скрипт только читает.
 *
 * Запуск: node verify-summary.mjs
 * Код возврата: 0 — расхождений нет, 1 — есть расхождения или журнал не найден.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { summaryIdentity } from './summary-store.mjs'

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

const journal = new Map(rows.map(row => [summaryIdentity(row), row]))

let comparisons = 0
let mismatches = 0
let entries = 0

for (const model of [...new Set(rows.map(r => r.model))].sort()) {
  const path = join(STUDY, 'artifacts', model, `summary-${model.replaceAll('/', '_')}.json`)
  if (!existsSync(path)) {
    console.log(`  ПРОПУСК ${model}: нет файла сводки`)
    continue
  }
  const summary = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(summary)) {
    console.error(`  ОШИБКА ${model}: сводка не массив`)
    mismatches += 1
    continue
  }
  for (const entry of summary) {
    entries += 1
    const key = summaryIdentity(entry)
    const source = journal.get(key)
    if (!source) {
      console.error(`  РАСХОЖДЕНИЕ ${key}: записи нет в журнале`)
      mismatches += 1
      continue
    }
    for (const field of Object.keys(source)) {
      comparisons += 1
      const a = JSON.stringify(source[field])
      const b = JSON.stringify(entry[field])
      if (a !== b) {
        mismatches += 1
        console.error(`  РАСХОЖДЕНИЕ ${key}.${field}: журнал ${a} != сводка ${b}`)
      }
    }
  }
}

console.log(`записей сверено: ${entries}, сравнений полей: ${comparisons}, расхождений: ${mismatches}`)
process.exit(mismatches === 0 ? 0 : 1)
