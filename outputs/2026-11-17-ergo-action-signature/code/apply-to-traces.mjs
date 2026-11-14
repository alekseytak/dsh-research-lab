#!/usr/bin/env node
/**
 * Пересчёт прошлых трасс отпечатком действия из muha.
 * Задача: проверить, различает ли он руки там, где три прошлые метрики не смогли.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { signatureStats } from './action-signature.mjs'

const ROOTS = [
  ['v2 glm-5.3-flash', '../../2026-11-14-ergo-benchmark-v2/artifacts/glm-5.3-flash'],
  ['v3 deepseek-v4.1-flash', '../../2026-11-16-ergo-stop-discipline/artifacts/deepseek-v4.1-flash'],
  ['v5 glm-5.3-flash', '../../2026-11-16-ergo-traversal/artifacts/glm-5.3-flash'],
]

const rows = []
for (const [study, dir] of ROOTS) {
  if (!existsSync(dir)) continue
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue
    if (name.startsWith('summary-')) continue
    const record = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    if (!Array.isArray(record.calls) || record.calls.length === 0) continue
    const stats = signatureStats(record.calls)
    rows.push({ study, cell: name.replace('.json', ''), ...stats, solved: record.solved })
  }
}

console.log('Отпечаток muha (verb|domain|object) на прошлых трассах\n')
console.log(`{'study':<24}{'задача':<8}{'рука':<12}{'ходов':>7}{'уник':>6}{'повторы':>9}{'цикл':>7}{'период':>8}`.replace(/'/g, ''))
console.log('-'.repeat(74))
const byTask = {}
for (const r of rows) {
  const task = r.cell.split('-')[1]
  const arm = r.cell.startsWith('no_skill') ? 'no_skill' : 'with_skill'
  console.log(`${r.study.padEnd(24)}${task.padEnd(8)}${arm.padEnd(12)}${String(r.rounds).padStart(7)}${String(r.uniqueSignatures).padStart(6)}${String(r.repeatRatio).padStart(9)}${String(r.cyclic).padStart(7)}${String(r.period).padStart(8)}`)
  const key = `${r.study}|${task}|${arm}`
  byTask[key] = byTask[key] ?? []
  byTask[key].push(r)
}

console.log('\n=== Средняя доля повторов по паре (рука × задача) ===')
console.log(`${'study'.padEnd(24)}{'задача'.padEnd(8)}{'no_skill':>10}{'with_skill':>12}{'разница':>10}`.replace(/'/g, ''))
console.log('-'.repeat(66))
for (const [study] of ROOTS) {
  for (const task of ['a', 'b', 'c', 'd', 'e']) {
    const ns = byTask[`${study}|${task}|no_skill`]
    const ws = byTask[`${study}|${task}|with_skill`]
    if (!ns || !ws) continue
    const mean = list => list.reduce((s, r) => s + r.repeatRatio, 0) / list.length
    const a = mean(ns); const b = mean(ws)
    console.log(`${study.padEnd(24)}${task.padEnd(8)}${a.toFixed(3).padStart(10)}${b.toFixed(3).padStart(12)}${(b - a).toFixed(3).padStart(10)}`)
  }
}
