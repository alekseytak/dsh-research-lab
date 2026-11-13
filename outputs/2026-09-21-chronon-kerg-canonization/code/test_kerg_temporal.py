"""Тесты канонической реализации K_erg и типов переходов.

Написаны в стиле test-first: эти тесты ОБЯЗАНЫ падать на исходной реализации
из пакета chronon_synthesis_consolidation. Падение — это и есть баг-репорт;
код правится только после того, как красное увидено своими глазами.

Что проверяем и почему именно так:

* Достижимость типов. Спека `docs/02_KERG_AND_TRANSITIONS.md` объявляет 7 типов
  перехода, включая `FIXED_POINT_HOLD` (lag=1) и `METASTABLE_TRAP`. Если тип
  объявлен, но недостижим, спека и код расходятся, и потребитель молча получает
  неверную категорию.

* Направление метрики. Смена режима обязана ПОВЫШАТЬ отклонение. Проверять
  «значение изменилось» бесполезно: перевёрнутая метрика такой тест проходит.

* Нормализация. `K_erg = raw/(1+raw)` должна насыщаться к 1. Тест на конкретное
  большое `raw` убивает подмену нормализации, которую тест на `[0,1)` пропускает.

* Короткие ряды. Наш бенчмарк даёт 3-14 точек, а не 100+. Поведение на коротком
  ряде должно быть явным и названным, а не случайным следствием дефолтов.
"""
import numpy as np
import pytest

from kerg_temporal import analyze, classify, kerg, recurrence, temporal_coherence


# ─────────────────────────── достижимость типов ───────────────────────────

def test_frozen_signal_is_fixed_point_hold():
    """Идеально замороженный сигнал — это FIXED_POINT_HOLD, а не INSUFFICIENT_DATA.

    Состояние не меняется вообще: это предельный случай lag=1 из спеки.
    Отвечать «недостаточно данных» на самый однозначный вход нельзя.
    """
    r = analyze([5.0] * 150, 1.0, 5, 100)
    assert r["transition_type"] == "FIXED_POINT_HOLD", (
        f"замороженный сигнал распознан как {r['transition_type']}")


def test_near_constant_signal_is_fixed_point_hold():
    """Шум 1e-6 является hold при явно объявленном приборном floor.

    Без калибровки малую амплитуду нельзя выдавать за отсутствие динамики.
    """
    rng = np.random.default_rng(11)
    x = 3.0 + rng.normal(0, 1e-6, 150)
    r = analyze(x, 1.0, 5, 100, instrument_resolution_floor=1e-4)
    assert r["transition_type"] == "FIXED_POINT_HOLD", (
        f"почти константа распознана как {r['transition_type']}")


def test_metastable_trap_is_reachable():
    """METASTABLE_TRAP объявлен в спеке и должен быть достижим.

    Конструируем ровно то, что спека описывает: длительное удержание в кластере
    с периодическими возвратами в него.
    """
    rng = np.random.default_rng(12)
    segments = []
    for _ in range(10):
        segments.append(rng.normal(0.0, 0.05, 12))   # dwell в кластере
        segments.append(rng.normal(3.0, 0.05, 3))    # короткий выход
    x = np.concatenate(segments)
    r = analyze(x, 1.0, 5, min(100, x.size))
    assert r["transition_type"] == "METASTABLE_TRAP", (
        f"удержание с возвратами распознано как {r['transition_type']}")


def test_every_spec_type_is_emittable():
    """Каждый тип из таблицы спеки должен быть достижим хотя бы на одном входе.

    Таблица в docs/02_KERG_AND_TRANSITIONS.md, §5. Если тип нельзя получить,
    он не должен числиться каноническим.
    """
    spec_types = {
        "REFERENCE_COMPATIBLE", "TRANSIENT_REGIME_SHIFT", "FIXED_POINT_HOLD",
        "PERIODIC_LOOP", "METASTABLE_TRAP", "CHAOTIC_DISPERSION",
        "INSUFFICIENT_DATA",
    }
    reachable = set()
    for k in (0.1, 0.2, 0.5, 0.8, 0.95):
        for coh in (0.0, 0.3, 0.6, 0.9, 1.0):
            for rec in (0.0, 0.2, 0.5, 0.8, 1.0):
                for lag in (1, 2, 7):
                    reachable.add(classify(k, coh, rec, lag))
    reachable.add(classify(None, None, None, None))
    missing = spec_types - reachable
    assert not missing, f"объявлены в спеке, но недостижимы в коде: {sorted(missing)}"


# ─────────────────────────── направление и форма ───────────────────────────

def test_regime_shift_increases_deviation():
    """Смена режима обязана УВЕЛИЧИТЬ отклонение, а не просто изменить его.

    Мутация, переворачивающая отношение V_ref/V_local, обязана этот тест уронить.
    """
    rng = np.random.default_rng(13)
    stationary = rng.normal(0, 1, 200)
    shifted = np.concatenate([rng.normal(0, 1, 100), rng.normal(0, 8, 100)])

    base = kerg(stationary, 5, 100)["raw"]
    after = kerg(shifted, 5, 100)["raw"]
    assert after > base, (
        f"отклонение не выросло при смене режима: stationary={base:.4f}, shifted={after:.4f}")


def test_normalization_saturates_toward_one():
    """`K_erg = raw/(1+raw)` обязана насыщаться к 1 при большом raw.

    Ловит подмену нормализации: и `raw/2`, и `raw/(1+raw)` лежат в [0,1),
    но ведут себя по-разному на большом отклонении.
    """
    # Почти нулевая reference-дисперсия и заметная локальная дают большой raw.
    rng = np.random.default_rng(14)
    x = np.concatenate([np.full(100, 1e-9), rng.normal(0, 5, 5)])
    r = kerg(x, 5, 100)
    assert r["status"] == "OK"
    raw = r["raw"]
    assert raw > 3.0, f"ожидался большой raw, получено {raw}"
    expected = raw / (1.0 + raw)
    assert r["value"] == pytest.approx(expected, rel=1e-9)
    assert r["value"] > 0.75, f"нормализация не насыщается: {r['value']}"


def test_known_period_is_recovered():
    """Период синусоиды должен быть найден как соответствующий лаг.

    Первая версия этого теста была неверной: sin(2*pi*t/2) на целых t даёт
    тождественный ноль (алиасинг на границу Найквиста), то есть константу,
    а не период 2. Ошибка нашлась именно потому, что тест был прогнан до кода
    и упал. Период задаётся 4 отсчётами.
    """
    t = np.arange(300)
    x = np.sin(2 * np.pi * t / 4.0)
    r = recurrence(x, min_lag=1)
    assert r["dominant_lag"] == 4, f"найден лаг {r['dominant_lag']} вместо 4"


def test_no_nan_or_inf_anywhere():
    """Ни одно поле не должно быть nan/inf — включая константный ряд."""
    for series in ([1.0] * 150, [0.0] * 150, list(np.linspace(-1, 1, 200))):
        r = analyze(series, 1.0, 5, 100)
        for key in ("kerg", "kerg_raw", "temporal_coherence", "recurrence_score"):
            v = r.get(key)
            assert v is None or np.isfinite(v), f"{key} = {v} на ряде {series[:3]}…"


# ─────────────────────────── короткие ряды ───────────────────────────

def test_short_series_is_explicit_not_crashy():
    """Короткий ряд не должен падать и должен честно называть причину отказа.

    Наши трассы — 3-14 точек против reference_window=100 по умолчанию, поэтому
    отказ обязан быть именованным статусом, а не исключением или тишиной.
    """
    for n in (3, 6, 14):
        r = analyze(list(np.arange(n, dtype=float)), 1.0, 5, 100)
        assert r["status"] in {"UNAVAILABLE", "OK"}
        assert r["transition_type"] == "INSUFFICIENT_DATA"
        assert r["policy_eligible"] is False


def test_short_series_mode_computes_when_declared():
    """Явно объявленный короткий режим обязан считать, а не отказывать.

    Отказ по умолчанию правомерен, но для ряда из 14 точек нужен объявленный
    режим с уменьшенным reference-окном, иначе канон к нашим данным неприменим.
    """
    rng = np.random.default_rng(15)
    x = rng.normal(0, 1, 14)
    r = analyze(x, 1.0, 3, 10)
    assert r["status"] in {"OK", "SIMULATED"}, f"короткий режим отказал: {r['status']}"
    assert r["kerg"] is not None
    assert 0.0 <= r["kerg"] < 1.0
    # Даже посчитавшись, метрика не даёт права на действие.
    assert r["policy_eligible"] is False


# ─────────────────────────── защита от деления ───────────────────────────

def test_epsilon_prevents_zero_division():
    """Нулевая reference-дисперсия не должна давать inf/nan или падение."""
    r = kerg([2.0] * 150, 5, 100)
    assert r["status"] == "OK", f"статус {r['status']}"
    assert np.isfinite(r["raw"])
    assert np.isfinite(r["value"])


def test_temporal_coherence_handles_constant():
    """Константа: coherence не определена, но обязана возвращаться как None, не падать."""
    assert temporal_coherence([1.0] * 50) is None


# ═══════════════ тесты, добавленные ПОСЛЕ независимого аудита ═══════════════
#
# Независимый аудитор (роль evidence-auditor, 2026-09-21) нашёл, что правка D1
# не покрыта ни одним тестом: мутант `min_lag=1 -> 2` проходил все 12 тестов.
# Ниже — тест, который этот мутант убивает, и тесты на два дефекта, найденных
# аудитом и подтверждённых вручную.

def test_long_period_sine_is_periodic_not_fixed_point():
    """Чистый синус с большим периодом — это ПЕРИОДИКА, а не удержание точки.

    Зачем этот тест. Правка `min_lag=1` (первая версия исправления D1) сделала
    лаг 1 допустимым. Для гладкого сигнала соседние отсчёты близки, поэтому
    `recurrence` на лаге 1 даёт score 1.0, а `max()` берёт первый максимум —
    то есть лаг 1. В результате ЧИСТЫЙ СИНУС С ПЕРИОДОМ 40 классифицировался
    как `FIXED_POINT_HOLD`, то есть «состояние не меняется вообще». Это прямая
    ложь о сигнале, и она тем опаснее, что выглядит правдоподобно.

    Тест убивает мутант `min_lag=1`: на нём тип становится `FIXED_POINT_HOLD`
    и проверка падает. На корректной реализации тип `PERIODIC_LOOP`.
    """
    values = np.sin(2 * np.pi * np.arange(200) / 40.0)
    r = analyze(values, 1.0)
    assert r["transition_type"] != "FIXED_POINT_HOLD", (
        "гладкий синус с периодом 40 объявлен удержанием точки — "
        "это артефакт лага 1"
    )
    assert r["transition_type"] == "PERIODIC_LOOP", f"тип {r['transition_type']}"


def test_non_numeric_input_is_named_refusal_not_crash():
    """Нечисловой вход — названный отказ, а не `ValueError` из недр numpy."""
    r = analyze(["a"] * 150, 1.0)
    assert r["status"] == "UNAVAILABLE", f"статус {r['status']}"
    assert r["status_reason"] == "NON_NUMERIC_INPUT", f"причина {r['status_reason']}"
    assert r["kerg"] is None


def test_zero_sampling_rate_is_named_refusal_not_crash():
    """Нулевая частота дискретизации — названный отказ, а не `ZeroDivisionError`."""
    r = analyze(np.arange(150, dtype=float), 0.0)
    assert r["status"] == "UNAVAILABLE", f"статус {r['status']}"
    assert r["status_reason"] == "INVALID_SAMPLING_RATE", f"причина {r['status_reason']}"


def test_overflow_never_returns_nan_as_measurement():
    """Переполнение не должно выдавать `nan` под видом измеренного значения.

    Дефект унаследован из оригинала: `np.var` на огромных числах переполняется,
    и `kerg` становился `nan` при `status="SIMULATED"`. Читатель видит статус
    «посчитано» и `nan` как будто это результат. `nan` — это отсутствие
    измерения, и оно обязано называться отсутствием.
    """
    r = analyze(np.linspace(-1e160, 1e160, 200), 1.0, 5, 100)
    assert r["status"] != "SIMULATED" or r["kerg"] is None, (
        f"nan выдан как измерение: kerg={r['kerg']}, status={r['status']}"
    )
    assert r["status"] == "UNAVAILABLE", f"статус {r['status']}"
    assert r["status_reason"] == "NON_FINITE_RESULT", f"причина {r['status_reason']}"


# ─────────────── зафиксированные дефекты, требующие решения по канону ───────────────

def test_frozen_floor_verdict_is_resolution_limited():
    """После решения в ADR маленькая живая осцилляция не является hold.

    Исторический тест закреплял дефект абсолютного floor. Теперь контракт
    требует относительную разрешимость без неявной приборной калибровки.
    """
    values = 1e-5 * np.sin(2 * np.pi * np.arange(100) / 4.0)
    assert int(np.sum(np.diff(np.sign(values)) != 0)) > 40, "сигнал должен колебаться"
    r = analyze(values, 1.0)
    assert r["transition_type"] != "FIXED_POINT_HOLD"
    assert r["kerg_estimate"]["status"] == "AVAILABLE"
    assert r["kerg"] is not None, "живой малый сигнал нельзя скрывать абсолютным floor"
    assert r["thresholds_calibration"] == "UNCALIBRATED_UI_ONLY", (
        "вердикт опирается на неоткалиброванный порог и обязан это объявлять"
    )
