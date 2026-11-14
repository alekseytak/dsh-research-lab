/**
 * Отпечаток действия и детектор цикла. Механизм взят из проекта muha
 * (`03-terminal-agent/core/autonomous.py:56`), где signature = verb|domain|object.
 *
 * Почему это лучше того, что я делал раньше. Три прошлых метрики не различали
 * руки, потому что считали текст команды: модели варьируют формулировки, и
 * доля точных совпадений выходила нулевой при 20 ходах в одну стену.
 * Отпечаток muha описывает не текст, а действие: что делаем, где, над чем.
 * Команда `cat notes/a.txt` и `sed -n 1p notes/a.txt` это разный текст, но
 * одно действие read|filesystem|notes/a.txt.
 *
 * Дыра, которую muha называет честно: три подряд одинаковых отпечатка ловят
 * только период 1. Цикл A → B → A → B не поймается. Здесь она закрыта
 * детекцией любого периода до MAX_PERIOD.
 */

/** Глаголы взяты из грамматики muha: это тип действия, а не слово команды. */
const VERB_BY_COMMAND = [
  [/^\s*(cat|head|tail|less|sed\s+-n|awk)\b/, 'read'],
  [/^\s*(grep|rg|ag)\b/, 'read'],
  [/^\s*(ls|find|stat|wc|du)\b/, 'read'],
  [/^\s*(echo|printf|tee)\b.*>/, 'write'],
  [/^\s*(touch|mkdir|cp|mv|rm|chmod)\b/, 'write'],
  [/^\s*(node|python3?|bash|sh|npm|git|make)\b/, 'execute'],
  [/^\s*(curl|wget)\b/, 'execute'],
]

/** Домен по префиксу объекта, как `core/verb_act.py:198`. */
function domainOf(object) {
  if (!object) return 'ui'
  if (object.startsWith('sys:')) return 'system'
  if (object.startsWith('reg:')) return 'registry'
  if (/^https?:\/\//.test(object) || object.startsWith('web:')) return 'web'
  if (/^\.{0,2}\//.test(object)) return 'filesystem'
  // ОТКЛОНЕНИЕ ОТ muha. Там домен выводится только из префикса, поэтому
  // относительный путь без `./` (`notes/`, `solve.mjs`) попадает в `ui`.
  // Для наших трасс это потеря: такой объект всё равно файловый. Правило
  // расширено, чтобы отпечаток не склеивал файловые действия с UI.
  if (/^[\w.-]+(\/[\w.-]+)*\/?$/.test(object) && /[\/.]/.test(object)) return 'filesystem'
  return 'ui'
}

/**
 * Объект действия: путь, URL или sys:-цель. Для команды это последний
 * выглядящий как путь или адрес токен, для чтения — сам путь.
 * @param {{tool?: string, path?: string, command?: string}} call - вызов инструмента.
 * @returns {string} объект или пустая строка.
 */
export function objectOf(call) {
  if (!call) return ''
  if (typeof call.path === 'string' && call.path) return call.path
  const command = typeof call.command === 'string' ? call.command : ''
  if (!command) return ''
  const words = command.split(/\s+/).filter(Boolean)
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const word = words[i].replace(/^['"]|['"]$/g, '')
    if (/^(https?:\/\/|sys:|reg:|\/|\.{1,2}\/)/.test(word)) return word
    // Относительный путь с подкаталогами: `notes/a.txt`. Без этого объект
    // терялся и все команды чтения склеивались в `read|ui|`, то есть метрика
    // снова считала бы текст, а не действие.
    if (/^[\w.-]+(\/[\w.-]+)*\.[A-Za-z0-9]+$/.test(word)) return word
    // Каталог: `notes/`. Для отпечатка это такой же объект, как файл.
    if (/^[\w.-]+(\/[\w.-]+)*\/$/.test(word)) return word
  }
  return ''
}

/**
 * Отпечаток действия по образцу muha: verb|domain|object.
 * @param {{tool?: string, path?: string, command?: string}} call - вызов инструмента.
 * @returns {string} отпечаток.
 */
export function actionSignature(call) {
  if (!call) return ''
  if (call.tool === 'read') {
    const object = objectOf(call)
    return `read|${domainOf(object)}|${object}`
  }
  const command = typeof call.command === 'string' ? call.command : ''
  let verb = 'execute'
  for (const [pattern, name] of VERB_BY_COMMAND) {
    if (pattern.test(command)) { verb = name; break }
  }
  const object = objectOf(call)
  return `${verb}|${domainOf(object)}|${object}`
}

export const MAX_PERIOD = 4

/**
 * Цикл: последние k действий повторяют предыдущие k при k = 1..MAX_PERIOD.
 * В отличие от muha, где сравниваются только подряд идущие одинаковые
 * отпечатки (период 1), здесь ловится и A → B → A → B.
 * @param {string[]} signatures - отпечатки по порядку.
 * @returns {{cyclic: boolean, period: number, repeats: number}}
 */
export function detectCycle(signatures) {
  const n = signatures.length
  for (let period = 1; period <= MAX_PERIOD; period += 1) {
    if (n < period * 2) continue
    let repeats = 0
    for (let i = n - 1; i - period >= 0; i -= 1) {
      if (signatures[i] !== signatures[i - period]) break
      repeats += 1
    }
    if (repeats >= period) return { cyclic: true, period, repeats }
  }
  return { cyclic: false, period: 0, repeats: 0 }
}

/**
 * Сводка по ячейке: сколько отпечатков, сколько повторов, есть ли цикл.
 * @param {Array<{call: object|null}>} calls - вызовы ячейки.
 * @returns {{rounds: number, uniqueSignatures: number, repeatRatio: number, cyclic: boolean, period: number}}
 */
export function signatureStats(calls) {
  const signatures = calls.map(entry => actionSignature(entry?.call)).filter(Boolean)
  const unique = new Set(signatures)
  const cycle = detectCycle(signatures)
  return {
    rounds: signatures.length,
    uniqueSignatures: unique.size,
    repeatRatio: signatures.length === 0 ? 0 : Number((1 - unique.size / signatures.length).toFixed(4)),
    cyclic: cycle.cyclic,
    period: cycle.period,
  }
}
