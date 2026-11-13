/**
 * Derive the loop metric from the per-cell traces and cross-check it against
 * the journal, then write the derived fields INTO the traces so that the audit
 * path and the viewer stop seeing a silent zero.
 *
 * Why this exists: `revisits`/`kErgLoop` were computed in `logCell()` and stored
 * only in `artifacts/sandwiches.jsonl`. The traces carry `calls` but not the
 * derived metric, so every consumer that reads traces (the Kanban board, the
 * evidence auditor) showed `kErgLoop = 0` — indistinguishable from a real zero.
 *
 * This script adds NO new data. It recomputes the same field by the same rule
 * from the same calls and compares it with the journal; a mismatch is reported
 * as a failure rather than silently overwritten.
 *
 * Usage: node derive-loop-metric.mjs [artifactsDir]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ARTS = process.argv[2] ?? join(HERE, '..', 'artifacts')
const JOURNAL = join(ARTS, 'sandwiches.jsonl')
const SKIP_DIRS = new Set(['_invalid-relative-root', '_smoke'])

/** Recompute revisits and exactRepeats from a trace's calls. */
function derive(calls) {
  const seen = new Set()
  let revisits = 0
  for (const call of calls) {
    const signature = JSON.stringify(call.call)
    if (seen.has(signature)) revisits += 1
    seen.add(signature)
  }
  const commands = calls.map(call => call.call?.command).filter(value => typeof value === 'string')
  const exactRepeats = commands.length - new Set(commands).size
  const rounds = calls.length
  const kErgLoop = rounds === 0 ? 0 : Number((revisits / rounds).toFixed(3))
  return { revisits, exactRepeats, kErgLoop, rounds }
}

/** Read the journal keyed by model+cell, keeping every duplicate row. */
function readJournal() {
  if (!existsSync(JOURNAL)) return { rows: [] }
  const rows = readFileSync(JOURNAL, 'utf8').split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
  return { rows }
}

const journal = readJournal()
const agree = []
const disagree = []
const written = []

for (const modelDir of readdirSync(ARTS)) {
  const dir = join(ARTS, modelDir)
  if (!statSync(dir).isDirectory() || SKIP_DIRS.has(modelDir)) continue
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json') || file.startsWith('summary-')) continue
    const path = join(dir, file)
    const trace = JSON.parse(readFileSync(path, 'utf8'))
    const calls = trace.calls ?? []
    const got = derive(calls)

    // The journal row for this cell is looked up by model and cell, not by
    // position: the journal interleaves two models and must never be matched
    // by array index.
    const cellName = `${trace.arm}-${trace.task}`
    const row = journal.rows.find(r => r.cell === cellName && r.model === trace.model)
    const check = row
      ? { revisits: row.revisits === got.revisits, exactRepeats: row.exactRepeats === got.exactRepeats, kErgLoop: row.kErgLoop === got.kErgLoop }
      : null
    const ok = check === null ? null : Object.values(check).every(Boolean)

    if (ok === true) agree.push({ cellName, model: trace.model, ...got })
    else if (ok === false) disagree.push({ cellName, model: trace.model, got, journal: { revisits: row.revisits, exactRepeats: row.exactRepeats, kErgLoop: row.kErgLoop }, check })
    else agree.push({ cellName, model: trace.model, ...got, note: 'нет строки в журнале — сверка невозможна' })

    // Write the derived fields into the trace, labelled as derived so no reader
    // mistakes them for directly observed data.
    const merged = {
      ...trace,
      revisits: got.revisits,
      exactRepeats: got.exactRepeats,
      kErgLoop: got.kErgLoop,
      derivedFields: {
        by: 'code/derive-loop-metric.mjs',
        fields: ['revisits', 'exactRepeats', 'kErgLoop'],
        rule: 'revisits = повтор подписи JSON.stringify(call.call); kErgLoop = revisits/rounds',
        crossCheckedAgainstJournal: ok === true,
      },
    }
    const before = JSON.stringify(trace)
    const after = JSON.stringify(merged)
    if (before !== after) {
      writeFileSync(path, JSON.stringify(merged, null, 2) + '\n')
      written.push(`${modelDir}/${file}`)
    }
  }
}

console.log('═══ сверка производной метрики с журналом ═══')
for (const row of agree) {
  console.log(`  OK   ${row.model.padEnd(22)} ${row.cellName.padEnd(14)} rounds=${row.rounds} revisits=${row.revisits} kErgLoop=${row.kErgLoop} exactRepeats=${row.exactRepeats}${row.note ? '  (' + row.note + ')' : ''}`)
}
for (const row of disagree) {
  console.log(`  РАСХОЖДЕНИЕ ${row.model} ${row.cellName}: трасса=${JSON.stringify(row.got)} журнал=${JSON.stringify(row.journal)}`)
}
console.log(`\nсовпало: ${agree.length}   расхождений: ${disagree.length}`)
console.log(`трасс обновлено: ${written.length}`)
const nonzero = agree.filter(r => r.kErgLoop > 0)
console.log(`\nK_erg_loop > 0 в ${nonzero.length} из ${agree.length} ячеек:`)
for (const row of nonzero) console.log(`  ${row.model} ${row.cellName} -> ${row.kErgLoop}`)
process.exit(disagree.length === 0 ? 0 : 1)
