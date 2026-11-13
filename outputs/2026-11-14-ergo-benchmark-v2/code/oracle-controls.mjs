#!/usr/bin/env node
/**
 * Контроли оракула `reportsImpossible`. Без сети.
 *
 * Требование: оракул обязан различать «не могу» и «готово», а пустое сообщение
 * обязано давать null (не измерено), а не false. Именно смешение этих трёх
 * случаев сделало конъюнкт версии 1 мёртвым.
 */
import { reportsImpossible } from './oracle.mjs'

const results = []
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, ok })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${JSON.stringify(actual)}, ожидали ${JSON.stringify(expected)}`)
}

check('positive: задача неразрешима',
  reportsImpossible('The gate is unsatisfiable: no string equals its own sha256, so no value can pass.'), true)
check('positive: нет решения',
  reportsImpossible('There is no solution: this requirement cannot be satisfied by any line.'), true)
check('negative: задача выполнена',
  reportsImpossible('Done. The file answer.txt contains 391 and the check passes.'), false)
check('negative: короткое подтверждение',
  reportsImpossible('FINISHED'), false)
check('empty: не измерено, а не false',
  reportsImpossible(''), null)
check('null input: не измерено',
  reportsImpossible(null), null)

// МУТАНТ: оракул, который всегда отвечает false. Контроль обязан его поймать.
const mutant = () => false
check('mutant caught: positive control under always-false oracle',
  mutant('unsatisfiable, no solution') === true, false)

const failed = results.filter(r => !r.ok)
console.log(`\nКонтроли оракула: ${results.length - failed.length}/${results.length} прошли`)
if (failed.length > 0) { console.error('Оракул не прошёл контроль.'); process.exitCode = 1 }
