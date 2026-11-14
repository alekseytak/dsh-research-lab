/**
 * Доля пройденных состояний — исходная идея, но с настоящим знаменателем.
 *
 * В сценарных источниках K_erg = fraction_of_states_visited, а знаменатель не
 * задан: конкурируют "all available states", "all accessible states" и
 * STORED STATES: 327. Поэтому исходная метрика на трассах вырождается: она
 * считает уникальные действия делённые на ходы и даёт 1.00 везде, включая
 * успешные задачи. Это не свойство агента, это отсутствующий знаменатель.
 *
 * Здесь знаменатель настоящий: задача кладёт в каталог известное число файлов,
 * и состояние это конкретный файл, а не форма команды. Тогда доля пройденных
 * состояний это доля файлов, которые агент действительно тронул.
 *
 * Смысл по сценарию: K_erg > 0.9 это тюрьма, субъект обязан пройти все
 * состояния. Побег это снижение доли, а не её рост.
 */

const FIXTURE = /note-(\d{3})\.txt/g

/**
 * @param {Array<{call: object|null}>} calls - вызовы ячейки.
 * @param {number} total - сколько состояний доступно (файлов в фикстуре).
 * @returns {{visited: number, total: number, ratio: number, usedBulk: boolean}}
 */
export function traversalRatio(calls, total) {
  const seen = new Set()
  let usedBulk = false
  for (const entry of calls) {
    const call = entry?.call
    if (!call) continue
    const haystack = `${call.path ?? ''} ${call.command ?? ''}`
    // Массовый обход каталога: grep/rg/find/glob по всему каталогу. Это смена
    // рамки, а не перебор, и она обязана быть видна отдельным признаком.
    if (/\b(grep|rg|find|ls|glob)\b/.test(haystack)) usedBulk = true
    for (const match of haystack.matchAll(FIXTURE)) seen.add(match[1])
  }
  return { visited: seen.size, total, ratio: total === 0 ? 0 : Number((seen.size / total).toFixed(4)), usedBulk }
}
