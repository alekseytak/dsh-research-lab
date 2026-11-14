#!/usr/bin/env node
/** Контроли отпечатка действия и детектора цикла. Без сети. */
import { actionSignature, detectCycle, signatureStats } from './action-signature.mjs'

const results = []
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  results.push(ok)
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: получили ${JSON.stringify(actual)}, ожидали ${JSON.stringify(expected)}`)
}

const bash = command => ({ tool: 'bash', command })
const read = path => ({ tool: 'read', path })

// Главное свойство: разный текст, одно действие — один отпечаток.
check('cat и sed -n дают один отпечаток',
  actionSignature(bash('cat notes/a.txt')),
  actionSignature(bash('sed -n 1p notes/a.txt')))
check('отпечаток это verb|domain|object',
  actionSignature(read('/cell/notes/a.txt')), 'read|filesystem|/cell/notes/a.txt')
check('grep это read, а не execute',
  actionSignature(bash('grep -rn x notes/')).split('|')[0], 'read')
check('echo с редиректом это write',
  actionSignature(bash('echo hi > out.txt')).split('|')[0], 'write')
check('node это execute', actionSignature(bash('node solve.mjs')).split('|')[0], 'execute')
check('sys: даёт домен system', actionSignature(bash('cat sys:uptime')).split('|')[1], 'system')
check('url даёт домен web', actionSignature(bash('curl https://example.com')).split('|')[1], 'web')

// Детектор цикла: период 1.
check('период 1 поймали', detectCycle(['a', 'a', 'a']).cyclic, true)
check('период 1: период равен 1', detectCycle(['a', 'a', 'a']).period, 1)
// Дыра, которую muha называет честно: здесь она закрыта.
check('период 2 A B A B поймали', detectCycle(['a', 'b', 'a', 'b']).cyclic, true)
check('период 2: период равен 2', detectCycle(['a', 'b', 'a', 'b']).period, 2)
check('период 3 A B C A B C поймали', detectCycle(['a', 'b', 'c', 'a', 'b', 'c']).cyclic, true)
// Отрицательные: разные действия это не цикл.
check('три разных не цикл', detectCycle(['a', 'b', 'c']).cyclic, false)
check('развитие не цикл', detectCycle(['a', 'a', 'b', 'b', 'c']).cyclic, false)
check('пусто не цикл', detectCycle([]).cyclic, false)

// Сводка по ячейке.
const wall = Array.from({ length: 6 }, () => ({ call: bash('cat notes/a.txt') }))
check('стена: доля повторов 0.8333', signatureStats(wall).repeatRatio, 0.8333)
check('стена: цикл найден', signatureStats(wall).cyclic, true)
const varied = [bash('cat notes/a.txt'), bash('sed -n 1p notes/a.txt'), bash('head notes/a.txt')].map(call => ({ call }))
check('разный текст, но одно действие: повторы есть', signatureStats(varied).repeatRatio > 0, true)
// ls и grep по одному каталогу это ОДНО действие на одном объекте: на уровне
// типа действия агент не продвинулся, хотя текст команд разный.
const sameDir = [bash('ls notes/'), bash('grep -rn MARK notes/')].map(call => ({ call }))
check('ls и grep по одному каталогу = повтор', signatureStats(sameDir).repeatRatio, 0.5)
check('каталог распознан как объект', actionSignature(bash('ls notes/')), 'read|filesystem|notes/')
// Настоящее продвижение: разные объекты и разные глаголы.
const progress = [bash('ls notes/'), bash('node solve.mjs'), read('/cell/found.txt')].map(call => ({ call }))
check('прогресс: повторов нет', signatureStats(progress).repeatRatio, 0)

// МУТАНТ: отпечаток по тексту команды вместо действия. Обязан разойтись там,
// где текст разный, а действие одно.
const textSignature = call => call.command ?? call.path ?? ''
check('мутант по тексту пойман', textSignature(bash('cat notes/a.txt')) !== textSignature(bash('sed -n 1p notes/a.txt')), true)
check('настоящий отпечаток их склеивает', actionSignature(bash('cat notes/a.txt')) === actionSignature(bash('sed -n 1p notes/a.txt')), true)

const failed = results.filter(r => !r).length
console.log(`\nКонтроли отпечатка: ${results.length - failed}/${results.length} прошли`)
if (failed) { console.error('Отпечаток действия не прошёл контроль.'); process.exitCode = 1 }
