"""K_erg temporal-regime metric. Simulation/offline research only.

АКТУАЛИЗАЦИЯ ПО РЕШЕНИЮ АЛЕКСЕЯ: D3/D7 ниже описывают историю,
а не текущее поведение. Теперь analyze использует парный estimate_kerg:
локальный отказ, отдельный neutralPrior, hybrid relative/numeric/device floor.
См. ADR-KERG-RESOLUTION.md и RESOLUTION-VERIFICATION.md. Старое имя
frozen_std_floor принимается только для именованного отказа миграции.
Низкоуровневая kerg() сохраняет формулу; измеренный контракт — estimate_kerg.

ИСПРАВЛЕННАЯ РЕАЛИЗАЦИЯ (производная от пакета chronon_synthesis_consolidation).

Оригинал не изменялся: он лежит в
`data/processed/chronon_synthesis_consolidation/code/kerg_temporal.py`
и рядом, для diff, скопирован как `kerg_temporal.original.py`.
Что именно изменено и почему — `DERIVATION.md` в этом же каталоге.

Отклонения от оригинала. ВНИМАНИЕ: формулировка D1 исправлена после
независимого аудита (2026-09-21) — первая версия была неверной, и первая
попытка правки дала регрессию. Подробности: `DERIVATION.md`,
`audit-report-independent.md`.

D1. ЧАСТИЧНО ОТОЗВАНО. Первая формулировка утверждала, что тип
    `FIXED_POINT_HOLD` «нельзя получить ни на одном входе». Это НЕВЕРНО:
    `classify(0.5, 0.9, 0.9, 1)` в оригинале возвращал именно этот тип.
    Недостижим он был только через `analyze()`, потому что `analyze()` вызывал
    `recurrence()` без `min_lag`, а тот по умолчанию `min_lag=2`, из-за чего
    `dominant_lag == 1` не встречался.
    Первая правка (`analyze(..., min_lag=1)`) ОТКАЧЕНА как регрессия: на ней
    гладкий синус с периодом 40 классифицировался как `FIXED_POINT_HOLD`, то
    есть «состояние не меняется вообще». Причина — на лаге 1 соседние отсчёты
    близки, score равен 1.0, а `max()` берёт первый максимум, поэтому лаг 1
    выигрывал у истинного периода. Замерено: `min_lag=1` → `FIXED_POINT_HOLD`,
    `min_lag=2` → `PERIODIC_LOOP` (лаг 39 при периоде 40).
    Теперь `FIXED_POINT_HOLD` эмитится ВЕТКОЙ ЗАМЕРШЕГО СОСТОЯНИЯ (см. D3), а
    не критерием спеки «высокая coherence и recurrence при lag=1».
    ЭТО ОБЪЯВЛЕННОЕ ОТКЛОНЕНИЕ ОТ §5 СПЕКИ, и оно не устранено: сам критерий
    спеки ошибается на гладких сигналах, где непрерывность неотличима от
    возврата в ту же точку.
    Закрыто тестом `test_long_period_sine_is_periodic_not_fixed_point`, который
    убивает мутант `min_lag=1`.

D2. `classify()` не имел ветки `METASTABLE_TRAP`, хотя тип объявлен в
    `docs/02_KERG_AND_TRANSITIONS.md` §5. Добавлено измерение удержания
    (`dwell_fraction` / `reentry_count`) и ветка типа.

D3. Замороженный и почти замороженный сигнал (`v_ref == 0`, шум порядка 1e-6)
    проходили через формулу с ε-защитой и получали `value = 0.5` — артефакт
    `0/(0+ε)`, а не измерение. В `analyze()` добавлен объявленный порог
    `frozen_std_floor`: ниже него отклонение возвращается как `None` с
    причиной, а тип — `FIXED_POINT_HOLD` (состояние не меняется вообще).
    ИСПРАВЛЕНИЕ НЕПОЛНОЕ (найдено аудитом, подтверждено): порог закрывает
    случай, когда тихо ВСЁ эталонное окно, но не случай, когда константно лишь
    ЛОКАЛЬНОЕ окно. Тогда `raw = |0/(v_ref+ε) − 1| = 1` и `kerg = 0.5` под
    статусом `SIMULATED` — тот же артефакт, достигнутый другим путём. Минимум:
    `analyze(list(np.tile([1.,2,3,4,5],20)) + [9.0]*5, 1.0, 5, 100)` → `kerg=0.5`,
    `status="SIMULATED"`. Не исправлено, потому что требует решения: это
    измерение «локальное окно постоянно» или отсутствие измерения.

D4. Короткие ряды (наш бенчмарк: 3-14 точек) не имели объявленного режима:
    отказ был следствием дефолта `reference_window=100`, а не решением.
    Теперь отказ по умолчанию явный (`UNAVAILABLE` + `INSUFFICIENT_DATA`),
    а короткий режим включается явным уменьшением `reference_window`.

Дефекты, найденные НЕЗАВИСИМЫМ АУДИТОМ и исправленные в коде:

D5. Нечисловой вход давал `ValueError` из недр numpy, нулевая частота
    дискретизации — `ZeroDivisionError`. Оба отказа теперь НАЗВАННЫЕ:
    `NON_NUMERIC_INPUT`, `INVALID_SAMPLING_RATE`.
D6. Переполнение `np.var` давало `kerg = nan` при `status="SIMULATED"`, то есть
    отсутствие измерения выдавалось под видом посчитанного результата. Теперь
    `UNAVAILABLE` + `NON_FINITE_RESULT`.

Дефекты, найденные аудитом и ЗАФИКСИРОВАННЫЕ тестом, но НЕ исправленные
(нужно решение по канону, а не правка реализации):

D7. `frozen_std_floor` абсолютный, поэтому осцилляция ниже порога объявляется
    удержанием точки: `1e-5·sin` с 50 сменами знака на 100 отсчётов даёт
    `FIXED_POINT_HOLD` со статусом `OK`. Граница — `v_ref <= 1e-8` (СКО ≤ 1e-4).
    Корректный ответ зависит от того, считать ли порог реальным разрешением
    прибора; порог объявлен `UNCALIBRATED_UI_ONLY`. Закреплено тестом
    `test_frozen_floor_verdict_is_resolution_limited`.
D8. Детектор периода ненадёжен на больших периодах: чистый синус с периодом 40
    даёт `dominant_lag = 39`, период 64 — тоже сбивается. Для периода 4 верно.
    Причина та же, что в D1: `max()` берёт первый максимум.

НЕИЗМЕННЫЕ ГРАНИЦЫ КАНОНА (нарушать нельзя):
`K_erg` НЕ является доказательством эргодичности, спектральной щелью `1-λ`,
долей покрытого пространства состояний, `P_transition`, TDA `beta_1` или
разрешением на действие. `policy_eligible`/`clinical_eligible`/
`intervention_eligible` всегда `False`.

Пороги `low`/`high` = 0.33/0.66 и новые пороги удержания —
`UNCALIBRATED_UI_ONLY`, они объявлены, а не откалиброваны.

Известное ограничение (ОПРОВЕРГНУТО аудитом в первой формулировке): раньше здесь
было написано, что «тип по рампе не канонизируется». Это неверно — рампа
канонизируется и получает `PERIODIC_LOOP` с `dominant_lag = 2`, хотя рампа не
периодична. Ограничение существует как ФАКТ (тип по рампе неверен), но код его
НЕ соблюдает, и оговорка в прозе этого не меняла.
"""
from __future__ import annotations

import numpy as np
from resolution_policy import estimate_kerg

DEFINITION_ID = "kem.temporal-regime-deviation.kerg.v1"

# Объявленные, НЕ откалиброванные пороги. Единицы: безразмерные доли.
LOW_DEFAULT = 0.33
HIGH_DEFAULT = 0.66
TRAP_DWELL_DEFAULT = 0.66
TRAP_MIN_REENTRIES_DEFAULT = 2
FROZEN_STD_FLOOR_DEFAULT = 1e-4


def kerg(values, local_window=5, reference_window=100, epsilon=1e-12):
    """`K_erg_raw = |V_local/(V_ref + ε) - 1|`, `K_erg = raw/(1 + raw)`.

    Низкоуровневая формула. При `v_ref == 0` результат конечен, но это артефакт
    ε-защиты (`raw = 1.0`, `value = 0.5`), а не измерение. Интерпретировать
    такое значение нельзя — это делает `analyze()` через `frozen_std_floor`.
    """
    x = np.asarray(values, dtype=float)
    if local_window < 2 or reference_window <= local_window or x.size < reference_window:
        return {"status": "INSUFFICIENT_DATA", "raw": None, "value": None,
                "v_local": None, "v_ref": None}
    local = x[-local_window:]
    reference = x[-reference_window:]
    v_local = float(np.var(local, ddof=1))
    v_ref = float(np.var(reference, ddof=1))
    raw = abs(v_local / (v_ref + epsilon) - 1.0)
    return {
        "status": "OK", "raw": raw, "value": raw / (1.0 + raw),
        "v_local": v_local, "v_ref": v_ref,
        "v_ref_exactly_zero": v_ref == 0.0,
    }


def temporal_coherence(values, max_lag=5):
    """Средняя автокорреляция на лагах 1..max_lag, зажатая в [0, 1], иначе None."""
    x = np.asarray(values, dtype=float)
    if x.size < max_lag + 3 or not np.isfinite(x).all() or np.std(x) == 0:
        return None
    y = x - x.mean()
    ac = []
    for lag in range(1, max_lag + 1):
        denom = np.std(y[:-lag]) * np.std(y[lag:])
        if denom == 0:
            ac.append(np.nan)
            continue
        ac.append(float(np.corrcoef(y[:-lag], y[lag:])[0, 1]))
    mean_ac = float(np.nanmean(ac))
    if not np.isfinite(mean_ac):
        return None
    return float(np.clip(mean_ac, 0.0, 1.0))


def recurrence(values, epsilon=None, min_lag=2, max_lag=None):
    """Доля пар на лаге, отличающихся не более чем на ε; берётся пик по лагам.

    Возвращает словарь с `score`, `dominant_lag`, `epsilon`; при коротком ряде
    поля равны None (не исключение).
    """
    x = np.asarray(values, dtype=float)
    n = x.size
    if n < min_lag + 3:
        return {"score": None, "dominant_lag": None, "epsilon": None}
    if epsilon is None:
        epsilon = max(float(np.std(x)) * 0.25, 1e-12)
    max_lag = max_lag or n // 2
    matches = []
    for lag in range(min_lag, min(max_lag, n - 1) + 1):
        score = float(np.mean(np.abs(x[lag:] - x[:-lag]) <= epsilon))
        matches.append((lag, score))
    if not matches:
        return {"score": None, "dominant_lag": None, "epsilon": float(epsilon)}
    # max() возвращает первый максимум: при точном периоде выигрывает
    # наименьший лаг, то есть период, а не его кратные.
    lag, peak = max(matches, key=lambda z: z[1])
    return {"score": peak, "dominant_lag": lag, "epsilon": float(epsilon)}


def dwell(values, radius=None):
    """Удержание в самом густом кластере и число возвратов в него.

    Кластер задаётся шаром радиуса `radius` (по умолчанию 0.25·σ) вокруг точки
    с наибольшим числом соседей. `dwell_fraction` — доля точек внутри шара,
    `reentry_count` — сколько раз ряд вошёл в шар после выхода из него.

    Это мера топологии траектории, а не метрика риска и не доля покрытого
    пространства состояний.
    """
    x = np.asarray(values, dtype=float)
    n = x.size
    if n < 3:
        return {"dwell_fraction": None, "reentry_count": None,
                "radius": None, "centre_value": None}
    if radius is None:
        radius = max(float(np.std(x)) * 0.25, 1e-12)
    inside = np.abs(x[:, None] - x[None, :]) <= radius
    centre = int(inside.sum(axis=1).argmax())
    labels = inside[centre]
    dwell_fraction = float(labels.mean())
    reentry_count = int(np.sum((labels[1:] == 1) & (labels[:-1] == 0)))
    return {
        "dwell_fraction": dwell_fraction,
        "reentry_count": reentry_count,
        "radius": float(radius),
        "centre_value": float(x[centre]),
    }


def classify(kerg_value, coherence, recurrence_score, dominant_lag,
             low=LOW_DEFAULT, high=HIGH_DEFAULT, coherence_high=0.70,
             coherence_low=0.40, recurrence_high=0.70, recurrence_low=0.30,
             dwell_fraction=None, reentry_count=None,
             trap_dwell=TRAP_DWELL_DEFAULT,
             trap_min_reentries=TRAP_MIN_REENTRIES_DEFAULT):
    """Тип перехода по таблице `docs/02_KERG_AND_TRANSITIONS.md` §5.

    Все семь объявленных типов достижимы. Порядок веток важен и обоснован:

    * `METASTABLE_TRAP` проверяется ПЕРВЫМ, потому что он определяется
      топологией траектории (вернулся в кластер и остался), а не отклонением
      режима: `K_erg` у ловушки может быть мал, если локальное окно попало в
      тот же кластер, что и эталонное. При сильном удержании тип принадлежит
      ловушке.
    * При `dwell_fraction is None` (вызов из четырёх аргументов) используется
      объявленный запасной критерий, и он тоже требует `kerg_value >= low`,
      чтобы не перехватывать `REFERENCE_COMPATIBLE`.
    """
    if any(v is None for v in (kerg_value, coherence, recurrence_score, dominant_lag)):
        return "INSUFFICIENT_DATA"

    if dwell_fraction is None:
        trap = (kerg_value >= low
                and recurrence_score >= recurrence_high
                and coherence < coherence_high
                and dominant_lag != 1)
    else:
        trap = (dwell_fraction >= trap_dwell
                and reentry_count is not None
                and reentry_count >= trap_min_reentries)
    if trap:
        return "METASTABLE_TRAP"

    if kerg_value < low:
        return "REFERENCE_COMPATIBLE"
    if coherence >= coherence_high and recurrence_score >= recurrence_high:
        return "FIXED_POINT_HOLD" if dominant_lag == 1 else "PERIODIC_LOOP"
    if kerg_value >= high and coherence < coherence_low and recurrence_score < recurrence_low:
        return "CHAOTIC_DISPERSION"
    return "TRANSIENT_REGIME_SHIFT"


def analyze(values, sampling_rate_hz, local_window=5, reference_window=100,
            frozen_std_floor=None, min_lag=2,
            trap_dwell=TRAP_DWELL_DEFAULT,
            trap_min_reentries=TRAP_MIN_REENTRIES_DEFAULT, *,
            relative_frozen_floor=.01, numeric_zero_floor=1e-12,
            instrument_resolution_floor=None):
    """Полный разбор ряда. Никогда не даёт права на действие.

    Возвращает разбор с явными полями состояния:
    `status`, `status_reason`, `transition_type`, `kerg`, `kerg_raw`,
    `temporal_coherence`, `recurrence_score`, `dominant_lag_samples`,
    `dwell_fraction`, `reentry_count` и три флага допустимости (всегда False).
    """
    # 0. Вход и параметры проверяются ДО вычислений. Отказ обязан быть НАЗВАННЫМ,
    #    а не исключением из недр numpy: `ValueError` на нечисловом входе и
    #    `ZeroDivisionError` на нулевой частоте — это падение вместо ответа.
    #    Найдено независимым аудитом 2026-09-21, подтверждено вручную.
    refusal = {
        "definition_id": DEFINITION_ID,
        "source_signal": "declared_scalar_series",
        "policy_eligible": False,
        "clinical_eligible": False,
        "intervention_eligible": False,
        "resolution_profile": "kerg.resolution-policy.v1",
        "kerg_estimate": estimate_kerg([], []),
        "thresholds_calibration": "UNCALIBRATED_UI_ONLY",
        "transition_type": "INSUFFICIENT_DATA", "kerg": None, "kerg_raw": None,
        "temporal_coherence": None, "recurrence_score": None,
        "dominant_lag_samples": None, "dominant_period_seconds": None,
        "dwell_fraction": None, "reentry_count": None,
    }
    if frozen_std_floor is not None:
        return {**refusal, "status": "UNAVAILABLE",
                "status_reason": "LEGACY_ABSOLUTE_FLOOR_REQUIRES_MIGRATION"}
    try:
        sampling = float(sampling_rate_hz)
    except (TypeError, ValueError):
        return {**refusal, "sampling_rate_hz": None,
                "status": "UNAVAILABLE", "status_reason": "INVALID_SAMPLING_RATE"}
    if not np.isfinite(sampling) or sampling <= 0:
        return {**refusal, "sampling_rate_hz": sampling,
                "status": "UNAVAILABLE", "status_reason": "INVALID_SAMPLING_RATE"}
    try:
        x = np.asarray(values, dtype=float)
    except (TypeError, ValueError):
        return {**refusal, "sampling_rate_hz": sampling,
                "status": "UNAVAILABLE", "status_reason": "NON_NUMERIC_INPUT"}

    base = {
        "definition_id": DEFINITION_ID,
        "sampling_rate_hz": sampling,
        "source_signal": "declared_scalar_series",
        "policy_eligible": False,
        "clinical_eligible": False,
        "intervention_eligible": False,
        "resolution_profile": "kerg.resolution-policy.v1",
        "kerg_estimate": estimate_kerg([], []),
        "thresholds_calibration": "UNCALIBRATED_UI_ONLY",
    }

    if x.ndim != 1:
        return {**refusal, "status": "UNAVAILABLE", "status_reason": "INVALID_WINDOW_SHAPE"}
    base["kerg_estimate"] = estimate_kerg(
        x[-local_window:], x[-reference_window:],
        relative_frozen_floor=relative_frozen_floor,
        numeric_zero_floor=numeric_zero_floor,
        instrument_resolution_floor=instrument_resolution_floor)
    # 1. Длины не хватает на объявленное окно — отказ именованный и явный.
    if x.size < reference_window:
        base["kerg_estimate"] = {**base["kerg_estimate"],
            "status": "INSUFFICIENT_SAMPLES", "reason": "WINDOW_TOO_SHORT",
            "value": None, "raw": None, "neutralPrior": None,
            "valueMeaning": "NOT_MEASURED", "confidence": 0}
        return {**base, "status": "UNAVAILABLE",
                "status_reason": "SERIES_SHORTER_THAN_REFERENCE_WINDOW",
                "transition_type": "INSUFFICIENT_DATA", "kerg": None,
                "kerg_raw": None, "temporal_coherence": None,
                "recurrence_score": None, "dominant_lag_samples": None,
                "dominant_period_seconds": None, "dwell_fraction": None,
                "reentry_count": None}

    reference = x[-reference_window:]
    if not np.isfinite(x).all():
        return {**base, "status": "UNAVAILABLE",
                "status_reason": "NON_FINITE_INPUT",
                "transition_type": "INSUFFICIENT_DATA", "kerg": None,
                "kerg_raw": None, "temporal_coherence": None,
                "recurrence_score": None, "dominant_lag_samples": None,
                "dominant_period_seconds": None, "dwell_fraction": None,
                "reentry_count": None}

    # 2. Разрешимость обоих окон; neutralPrior никогда не попадает в kerg.
    estimate = base["kerg_estimate"]
    if estimate["status"] != "AVAILABLE":
        hold = estimate["status"] == "FIXED_POINT_HOLD"
        return {**base, "status": "OK" if hold else "UNAVAILABLE",
                "status_reason": estimate["reason"],
                "transition_type": "FIXED_POINT_HOLD" if hold else "INSUFFICIENT_DATA",
                "kerg": None, "kerg_raw": None,
                "v_ref": None, "v_local": None,
                "temporal_coherence": None, "recurrence_score": None,
                "dominant_lag_samples": None, "dominant_period_seconds": None,
                "dwell_fraction": None, "reentry_count": None}

    kr = kerg(values, local_window, reference_window)
    # Переполнение `np.var` на огромных числах даёт `nan`. `nan` — это ОТСУТСТВИЕ
    # измерения, и его нельзя выдавать под статусом «посчитано»: читатель примет
    # его за результат. Дефект унаследован из оригинала (найден аудитом).
    if kr["status"] == "OK" and not (np.isfinite(kr["value"]) and np.isfinite(kr["raw"])):
        return {**base, "status": "UNAVAILABLE",
                "status_reason": "NON_FINITE_RESULT",
                "transition_type": "INSUFFICIENT_DATA", "kerg": None,
                "kerg_raw": None, "temporal_coherence": None,
                "recurrence_score": None, "dominant_lag_samples": None,
                "dominant_period_seconds": None, "dwell_fraction": None,
                "reentry_count": None}
    if kr["status"] != "OK":
        return {**base, "status": "UNAVAILABLE",
                "status_reason": "LOCAL_OR_REFERENCE_WINDOW_UNUSABLE",
                "transition_type": "INSUFFICIENT_DATA", "kerg": None,
                "kerg_raw": None, "temporal_coherence": None,
                "recurrence_score": None, "dominant_lag_samples": None,
                "dominant_period_seconds": None, "dwell_fraction": None,
                "reentry_count": None}

    coh = temporal_coherence(reference)
    rec = recurrence(reference, min_lag=min_lag)
    dw = dwell(reference)
    kind = classify(kr["value"], coh, rec["score"], rec["dominant_lag"],
                    dwell_fraction=dw["dwell_fraction"],
                    reentry_count=dw["reentry_count"],
                    trap_dwell=trap_dwell,
                    trap_min_reentries=trap_min_reentries)
    lag = rec["dominant_lag"]
    return {
        **base, "status": "SIMULATED", "status_reason": "COMPUTED",
        "kerg_raw": kr["raw"], "kerg": kr["value"],
        "v_local": kr["v_local"], "v_ref": kr["v_ref"],
        "temporal_coherence": coh, "recurrence_score": rec["score"],
        "dominant_lag_samples": lag,
        "dominant_period_seconds": (None if lag is None
                                    else lag / float(sampling_rate_hz)),
        "dwell_fraction": dw["dwell_fraction"],
        "reentry_count": dw["reentry_count"],
        "transition_type": kind,
    }
