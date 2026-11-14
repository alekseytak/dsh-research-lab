#!/usr/bin/env node
/** Контроли метрики остановки. Без сети. */
import { stopDiscipline } from './stop-metric.mjs'

const results = []
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${JSON.stringify(actual)}, ожидали ${JSON.stringify(expected)}`)
}

const call = n => ({ call: { tool: 'bash', command: `echo ${n}` } })
const text = { call: null }

// Остановилась: три действия и текстовый ответ до потолка.
check('остановилась до потолка', stopDiscipline([call(1), call(2), call(3), text], 20).stoppedBeforeCap, true)
// Упёрлась в потолок: последний ход с действием.
check('упёрлась в потолок', stopDiscipline(Array.from({ length: 20 }, (_, i) => call(i)), 20).stoppedBeforeCap, false)
// Упёрлась в потолок, но текстовый ответ выпрошен позже: всё равно не остановка.
check('потолок + выпрошенный текст', stopDiscipline([...Array.from({ length: 19 }, (_, i) => call(i)), text], 20).stoppedBeforeCap, false)
// Пустая ячейка: не остановка, а отсутствие измерения.
check('пустая ячейка', stopDiscipline([], 20).stoppedBeforeCap, false)
// Все ходы текстовые с самого начала.
check('сразу текст', stopDiscipline([text], 20).stoppedBeforeCap, true)
// Граница: ровно на потолке с текстом — это потолок.
check('граница потолка', stopDiscipline([...Array.from({ length: 19 }, (_, i) => call(i)), text], 20).capped, true)

// МУТАНТ: метрика, которая считает остановкой упор в потолок (перевёрнутый знак).
// Проверять надо на входе, где мутант ОБЯЗАН разойтись с настоящей метрикой:
// ячейка, упёршаяся в потолок, для мутанта «остановилась», а на деле нет.
const mutant = calls => ({ stoppedBeforeCap: true })
const cappedCell = Array.from({ length: 20 }, (_, i) => call(i))
check('мутант пойман: расходится на потолке', mutant(cappedCell).stoppedBeforeCap !== stopDiscipline(cappedCell, 20).stoppedBeforeCap, true)
check('мутант пойман: настоящая метрика говорит нет', stopDiscipline(cappedCell, 20).stoppedBeforeCap, false)

const failed = results.filter(r => !r).length
console.log(`\nКонтроли остановки: ${results.length - failed}/${results.length} прошли`)
if (failed) { console.error('Метрика остановки не прошла контроль.'); process.exitCode = 1 }
