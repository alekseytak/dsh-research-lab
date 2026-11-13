# Проверка нового контракта разрешимости

Это дополнение после исторического независимого аудита, НЕ новый независимый аудит.

- RED: `python3 -m pytest test_resolution_policy.py -q` → 34 failed, 1 passed, exit 1. Ошибки — assertions, не collection errors.
- GREEN: `python3 -m pytest test_resolution_policy.py test_kerg_temporal.py -q` → 52 passed.
- Два legacy-теста изменены по принятому канону: малая осцилляция больше не hold; near-constant noise считается hold только при явно указанном instrument floor.
- `python3 check_resolution_mutants.py` → 6/6 применённых мутантов убиты assertion failures (exit 1); рабочий исходник не изменяется.
- Мутанты: утечка local scalar, neutralPrior как measured value, скрытый абсолютный floor, offset-sensitive scale, игнорирование device floor, неверный reference status.

## Уточнения

Строка «live local / frozen reference» достижима даже при local ⊂ reference: 95 нулей и хвост `[0,1,-1,1,-1]`, instrument floor=0.3. Локальное std больше 0.3, опорное меньше. Ранее высказанное сомнение в достижимости снято.

Сохранён epsilon=1e-12 в исходной variance-ratio формуле. Поэтому масштабная инвариантность доказана тестами для разрешимости, а НЕ для численного Kerg: epsilon в дисперсионном знаменателе нарушает точную инвариантность значения на малых масштабах. Исправление формулы требует отдельного решения и differential benchmark.

Профиль .01 не калиброван. confidence для AVAILABLE = null; для отсутствующего измерения = 0. Не выдумываем calibrated confidence. Nullable дисперсии при invalid/short — честное отсутствие, не нули.

Core в этой работе не изменялся. Правило не использовать не-AVAILABLE как measured scalar зафиксировано в ADR; downstream integration остаётся отдельной задачей.

Исторические PREREGISTRATION, JSONL, original implementation и independent audit не переписывались этим изменением.
