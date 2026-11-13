#!/usr/bin/env node
/**
 * Контроли различающей способности метрики. Запускаются БЕЗ сети и без ключа.
 *
 * Зачем: в подтверждающем прогоне `K_erg_loop` принял всего два значения на 16
 * ячеек (0 и 0.214), то есть различить ячейки не мог. Прежде чем применять
 * метрику к живой модели, надо показать, что она вообще отделяет петлю от
 * не-петли. Если положительный и отрицательный контроли дают одинаковый
 * результат, метрика не годится, и прогон бессмысленен.
 *
 * Вторая часть проверки важнее первой: метрика обязана иметь МУТАНТА, на
 * котором она падает. Контроль, который не умеет падать, ничего не доказывает
 * (`УРОКИ_И_ГРАБЛИ.md`, раздел «Тесты и проверки»).
 *
 * Запуск: node metric-controls.mjs
 * Код выхода: 0 если все проверки прошли, 1 если хоть одна провалилась.
 */

import { computeLoopMetric, isLoop } from './loop-metric.mjs'

const results = []
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push({ name, ok, actual, expected })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${JSON.stringify(actual)}, ожидали ${JSON.stringify(expected)}`)
}

const repeat = { name: 'read', arguments: { path: 'same/file.txt' } }
const distinct = n => ({ name: 'read', arguments: { path: `file-${n}.txt` } })
const cell = calls => calls.map(call => ({ call }))

// Положительный контроль: шесть одинаковых ходов подряд. Это по определению петля.
const loopCell = cell([repeat, repeat, repeat, repeat, repeat, repeat])
const loop = computeLoopMetric(loopCell)
check('positive control: revisits', loop.revisits, 5)
check('positive control: loopRatio', loop.loopRatio, 0.833)
check('positive control: isLoop', isLoop(loop), true)

// Отрицательный контроль: шесть разных ходов. Петли нет ни в каком смысле.
const distinctCell = cell([0, 1, 2, 3, 4, 5].map(distinct))
const notLoop = computeLoopMetric(distinctCell)
check('negative control: revisits', notLoop.revisits, 0)
check('negative control: loopRatio', notLoop.loopRatio, 0)
check('negative control: isLoop', isLoop(notLoop), false)

// Граница: ровно пять повторов из шести это порог, четыре уже нет.
const fourOfSix = cell([repeat, repeat, repeat, repeat, repeat, distinct(9)])
const boundary = computeLoopMetric(fourOfSix)
check('boundary 4/6: isLoop', isLoop(boundary), false)
const fiveOfSix = cell([repeat, repeat, repeat, repeat, repeat, repeat])
check('boundary 5/6: isLoop', isLoop(computeLoopMetric(fiveOfSix)), true)

// Вызовы без инструмента не должны считаться повторами друг друга.
const noToolCalls = [{ call: null }, { call: null }, { call: null }]
check('null calls: revisits', computeLoopMetric(noToolCalls).revisits, 0)

// Пустая ячейка: ноль, а не деление на ноль.
check('empty cell: loopRatio', computeLoopMetric([]).loopRatio, 0)

// МУТАНТ: правило, которое считает повтором ЛЮБОЙ ход. Метрика с таким правилом
// не различает входы, поэтому отрицательный контроль обязан её поймать.
function mutatedMetric(calls) {
  const rounds = calls.length
  return { rounds, revisits: rounds, exactRepeats: rounds, loopRatio: rounds === 0 ? 0 : 1 }
}
const mutantOnNegative = mutatedMetric(distinctCell)
check('mutant caught: negative control under mutated rule', isLoop(mutantOnNegative), true)
check('mutant is distinguishable from real metric', mutantOnNegative.revisits !== notLoop.revisits, true)

const failed = results.filter(r => !r.ok)
console.log(`\nКонтроли: ${results.length - failed.length}/${results.length} прошли`)
if (failed.length > 0) {
  console.error('Метрика не прошла контроль: применять её к живому прогону нельзя.')
  process.exitCode = 1
} else {
  console.log('Метрика различает петлю и не-петлю на контролях; мутант ловится.')
}