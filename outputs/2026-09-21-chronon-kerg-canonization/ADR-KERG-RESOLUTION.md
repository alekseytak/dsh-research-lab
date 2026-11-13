# ADR: Kerg Resolution and Scale-Invariance

## Решение

Принято по прямому решению Алексея в этой сессии. Формула Kerg и веса Core не меняются. Исторические результаты и независимый аудит сохраняются.

A local window below resolution while its reference window is resolvable shall return `status = UNAVAILABLE`, `reason = LOCAL_WINDOW_BELOW_RESOLUTION`, `value = null`.

`FIXED_POINT_HOLD` applies only when both windows are below resolution. Its optional `neutralPrior = 0.5` is a policy-level prior, not a measured Kerg value.

Freeze detection shall use `max(numericZeroFloor, relativeFrozenFloor * robustScale, instrumentFloor?)`. A global absolute `frozen_std_floor` shall not decide the verdict for uncalibrated scale-varying signals.

## Контракт

| Local | Reference | status | reason | value |
|---|---|---|---|---|
| live | live | AVAILABLE | OK | measured |
| below resolution | live | UNAVAILABLE | LOCAL_WINDOW_BELOW_RESOLUTION | null |
| live | below resolution | REFERENCE_BELOW_RESOLUTION | REFERENCE_WINDOW_BELOW_RESOLUTION | null |
| below resolution | below resolution | FIXED_POINT_HOLD | BOTH_WINDOWS_BELOW_RESOLUTION | null |
| invalid | any | INVALID_INPUT | NON_FINITE_INPUT | null |
| short | any | INSUFFICIENT_SAMPLES | WINDOW_TOO_SHORT | null |

При `status != AVAILABLE` Core не должен использовать значение как измеренную метрику. Повышение U и REQUIRE_HUMAN/DEFER зависят от policy. Здесь это требование к потребителю, а не утверждение, что Core уже изменён.

## Выбор измеряемой величины

Текущая формула использует `var(x, ddof=1)`, не `var(diff(x))`. Проверка разрешимости поэтому использует `std(x, ddof=1)`; переход к приращениям — отдельное решение и отдельный benchmark.

Общий масштаб пары окон: `S = max(MAD(concat(local, reference)), IQR(concat(local, reference))/1.349)`. MAD здесь без коэффициента нормализации. Общий масштаб делает пороги сопоставимыми. Он центрирован: `median(abs(x))` исключён, поскольку синус со сдвигом +1000 иначе получает floor=10 при std≈0.707 и ошибочно считается frozen. Сдвиг не меняет дисперсию.

`relativeFrozenFloor = 0.01` — версия экспериментального профиля, НЕ калиброванный физический канон. `numericZeroFloor = 1e-12` — явный числовой guard. Гарантия масштабной инвариантности ограничена этим guard и необязательным instrument floor. Приборный floor задаётся явно, без него калибровка прибора не подразумевается.

## Совместимость

Новый парный оценщик возвращает самостоятельный `KergEstimate`. `analyze()` сохраняет исторический envelope (`SIMULATED`/`UNAVAILABLE`) и добавляет `kerg_estimate`, где живёт канонический статус. Это не смешивает происхождение симуляции с разрешимостью измерения. Низкоуровневая `kerg()` сохраняет прежнюю формулу как математический helper; использовать её напрямую для policy запрещено.

`confidence = 0` означает отсутствие измерения; для AVAILABLE confidence остаётся null: калиброванная модель уверенности отсутствует. Число уверенности не выдумывается. Неизвестные дисперсии и пороги при invalid/short также null.

## Проверки

Тесты до реализации: все статусы, null вместо измерения, neutralPrior отдельно, масштаб и сдвиг, явный instrument floor, интеграция analyze. После GREEN — planted mutants. Результаты проверки записываются отдельно, не приписываются историческому аудиту.

## Переименование петлевой метрики

`loop_repetition_ratio` — будущее основное имя отношения `revisits / rounds`. `kErgLoop` и `K_erg_loop` — legacy aliases только для чтения исторических артефактов. Замороженные preregistration, JSONL и сводки не переписываются; temporal Kerg и loop ratio — разные величины.
Дополнительная симметричная нормализация отношения, смена epsilon и весов Core здесь не проводятся.
