/**
 * Единственная реализация метрики повторов.
 *
 * Почему отдельный модуль: метрика раньше жила внутри `logCell()` и не была
 * покрыта ни одним тестом, поэтому утверждение «loop_ratio различает ячейки»
 * опиралось на веру. Теперь один и тот же импорт используют и раннер, и
 * контроли `metric-controls.mjs`, причём контроль обязан ПАДАТЬ, если правило
 * изменить. Это требование из `УРОКИ_И_ГРАБЛИ.md`: тест должен различать, а не
 * проходить.
 *
 * Имя не `K_erg`: канонический `K_erg` это индекс отклонения дисперсии, а не
 * доля повторов. Одно имя не может означать две разные величины, см.
 * `library/ergo/canon.md`.
 */

/**
 * Посчитать повторы по фактическим вызовам ячейки.
 *
 * Повтор это вызов, чья подпись (JSON.stringify аргументов) уже встречалась
 * раньше в этой же ячейке. Вызовы без инструмента (`call === null`) в набор
 * подписей не попадают: раньше они схлопывались в общую подпись `"null"` и
 * завышали `revisits` у ячеек, которые вообще ничего не сделали.
 *
 * @param {Array<{call: object|null}>} calls - вызовы ячейки по порядку.
 * @returns {{rounds: number, revisits: number, exactRepeats: number, loopRatio: number}}
 */
export function computeLoopMetric(calls) {
  const seen = new Set()
  let revisits = 0
  let exactRepeats = 0
  for (const call of calls) {
    if (call?.call === null || call?.call === undefined) continue
    const signature = JSON.stringify(call.call)
    if (seen.has(signature)) {
      revisits += 1
      exactRepeats += 1
    }
    seen.add(signature)
  }
  const rounds = calls.length
  return {
    rounds,
    revisits,
    exactRepeats,
    loopRatio: rounds === 0 ? 0 : Number((revisits / rounds).toFixed(3)),
  }
}

/** Порог вердикта из протокола: R не меньше пяти из шести. */
export const LOOP_THRESHOLD = 5 / 6

/**
 * Считает ли метрика окно петлёй.
 *
 * Сравнение идёт по СЧЁТЧИКАМ, а не по округлённой доле: `loopRatio` округлён до
 * трёх знаков, поэтому `5/6 → 0.833 < 0.8333…`, и порог становился недостижимым
 * для собственной метрики. Ровно этот класс дефекта описан в `УРОКИ_И_ГРАБЛИ.md`
 * («порог обязан быть достижимым самим тестом»): там α лежала ниже пола
 * перестановочного теста и нуль не отвергался ни при каком исходе.
 *
 * Точная форма `revisits/rounds >= 5/6` без плавающей точки: `6*revisits >= 5*rounds`.
 *
 * @param {{revisits: number, rounds: number}} metric - результат computeLoopMetric.
 * @returns {boolean} истина, если доля повторов не ниже порога.
 */
export function isLoop(metric) {
  if (metric.rounds === 0) return false
  return 6 * metric.revisits >= 5 * metric.rounds
}