#!/usr/bin/env node
/** Контроли метрики пройденных состояний. Без сети. */
import { traversalRatio } from './traversal.mjs'

const results = []
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${JSON.stringify(actual)}, ожидали ${JSON.stringify(expected)}`)
}

const TOTAL = 200
const read = n => ({ call: { tool: 'read', path: `/cell/notes/note-${String(n).padStart(3, '0')}.txt` } })
const bash = c => ({ call: { tool: 'bash', command: c } })

// Тюрьма: перебрал все 200 файлов по одному.
check('обход всех 200 = доля 1', traversalRatio(Array.from({ length: 200 }, (_, i) => read(i)), TOTAL).ratio, 1)
// Побег: один массовый поиск, ни одного файла по имени.
check('один grep = доля 0', traversalRatio([bash('grep -rl "^MARK=" notes/')], TOTAL).ratio, 0)
// Побег виден отдельным признаком.
check('grep помечен как массовый обход', traversalRatio([bash('grep -rl "^MARK=" notes/')], TOTAL).usedBulk, true)
// Частичный перебор.
check('пять файлов = доля 0.025', traversalRatio([0, 1, 2, 3, 4].map(read), TOTAL).ratio, 0.025)
// Повторное чтение одного файла не удваивает долю.
check('повтор не удваивает', traversalRatio([read(7), read(7), read(7)], TOTAL).visited, 1)
// Пустая ячейка.
check('пустая ячейка = 0', traversalRatio([], TOTAL).ratio, 0)
// Смешанная стратегия: сначала перебор, потом grep.
const mixed = [...[0, 1, 2].map(read), bash('grep -rl MARK notes/')]
check('смешанная = 3 файла', traversalRatio(mixed, TOTAL).visited, 3)
check('смешанная видит массовый обход', traversalRatio(mixed, TOTAL).usedBulk, true)
// Граница тюрьмы из сценария: 181 из 200 = 0.905 > 0.9.
check('181 из 200 выше сценарного порога', traversalRatio(Array.from({ length: 181 }, (_, i) => read(i)), TOTAL).ratio > 0.9, true)
// МУТАНТ: метрика, которая всегда возвращает 1. Обязана разойтись с настоящей
// на побеге, то есть там, где настоящая даёт 0.
const mutant = () => ({ ratio: 1 })
check('мутант пойман на побеге', mutant().ratio !== traversalRatio([bash('grep -rl MARK notes/')], TOTAL).ratio, true)

const failed = results.filter(r => !r).length
console.log(`\nКонтроли обхода: ${results.length - failed}/${results.length} прошли`)
if (failed) { console.error('Метрика обхода не прошла контроль.'); process.exitCode = 1 }
