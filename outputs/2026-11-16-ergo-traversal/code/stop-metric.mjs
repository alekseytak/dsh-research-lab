/**
 * Метрика дисциплины остановки.
 *
 * Почему отдельно от loop-metric: бенчмарк показал, что доля точных повторов не
 * различает ячейки (два значения на 16 ячеек, ноль при 20 ходах в недостижимую
 * цель). Застревание проявляется не в совпадении команд, а в том, что агент
 * продолжает действовать после того, как вывод уже сделан.
 *
 * Единица наблюдения: ячейка. Ячейка «остановилась до потолка», если последний
 * ход не содержал вызова инструмента (модель ответила текстом) и ходов меньше
 * потолка. Если ячейка упёрлась в потолок, она НЕ остановилась, даже когда
 * принудительный финальный ответ потом получен: остановкой считается отказ от
 * действия, а не текст, выпрошенный после исчерпания бюджета.
 *
 * Это бинарная величина без цензурирования, поэтому она пригодна для прямого
 * сравнения долей. Число ходов до остановки цензурировано потолком и годится
 * только как exploratory.
 */

/**
 * @param {Array<{call: object|null}>} calls - вызовы ячейки по порядку.
 * @param {number} maxRounds - потолок ходов в прогоне.
 * @returns {{stoppedBeforeCap: boolean, rounds: number, toolCalls: number, capped: boolean}}
 */
export function stopDiscipline(calls, maxRounds) {
  const rounds = calls.length
  const toolCalls = calls.filter(c => c?.call !== null && c?.call !== undefined).length
  const last = rounds === 0 ? null : calls[rounds - 1]
  const endedWithText = last !== null && (last.call === null || last.call === undefined)
  const capped = rounds >= maxRounds
  return { stoppedBeforeCap: endedWithText && !capped, rounds, toolCalls, capped }
}
