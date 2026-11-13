# Независимый аудит (evidence-auditor)

Роль: независимый аудитор доказательств. Задача — не подтвердить, а попытаться опровергнуть.
Все числа ниже получены командами, реально выполненными в этой сессии; рабочая площадка —
`/tmp/audit-chronon`. Файлы исследования не изменялись, кроме этого отчёта.

## claim

Проверяемое утверждение: в `kerg_temporal.py` из пакета `chronon_synthesis_consolidation` было
четыре дефекта — (D1) объявленный в спеке тип перехода `FIXED_POINT_HOLD` был недостижим;
(D2) `METASTABLE_TRAP` объявлен в спеке, но ветки в `classify()` не имел и был недостижим;
(D3) замороженный ряд возвращал `kerg = 0.5` — артефакт `0/(0+ε)`, а не измерение;
(D4) почти замороженный ряд (шум 1e-6) также не был обработан. Исправленная реализация делает
все семь объявленных в спеке типов достижимыми, а её тесты устойчивы к мутациям (три мутанта
убиты), тогда как собственные три теста пакета — нет.

## вычисления

### 1. Оригинал — действительно оригинал (SHA-256)

```
shasum -a 256 <study>/code/kerg_temporal.original.py <processed>/code/kerg_temporal.py
17c193ace0dde06e8236221c16a1345ea4f4ffc7dc2976eb632aaebfa8943518  .../code/kerg_temporal.original.py
17c193ace0dde06e8236221c16a1345ea4f4ffc7dc2976eb632aaebfa8943518  .../chronon_synthesis_consolidation/code/kerg_temporal.py
diff <A> <B>   ->  IDENTICAL (no diff);  обе копии 75 строк / 3411 байт
```

Проверка происхождения до архива (`data/raw/chronon-synthesis-consolidation.tar.gz`):

```
shasum -a 256 <tarball>
1d09720362afca1cf16cf338f9f154bfeb838c35229b12d27e36a69e24cf9b65   <- совпадает с DERIVATION.md:16
tar xzf ... ; shasum -a 256 tarx/.../code/kerg_temporal.py
17c193ace0dde06e8236221c16a1345ea4f4ffc7dc2976eb632aaebfa8943518   <- та же самая
shasum -a 256 tarx/.../code/test_kerg_temporal.py  ==  processed/.../code/test_kerg_temporal.py
e7114a8f0c28505b7f52860ec8c0e2208cf8481a275f85820b6bfec6248a21d2   (оба, diff = IDENTICAL)
```

Три независимые копии реализации (архив, `processed/`, `code/kerg_temporal.original.py`) совпадают
побайтово. Хеши самой производной и её тестов:

```
7f7b009a1b38ff93eae858ab1f3730b59e3c3ef68b9e1dfd98e44cd919f84685  code/kerg_temporal.py      (286 строк)
84a91b8041d2a141758224e7d37f44330dca14cc9c7732f18fe12d4e86c31966  code/test_kerg_temporal.py (195 строк)
```

Все три префикса SHA-256 (16) в таблице `DERIVATION.md:10-12` совпали с фактическими.
**Опровержения нет: оригинал подлинный, производная и тесты — те, что заявлены.**

### 2. Независимое воспроизведение RED (оригинал + тесты исследования)

```
mkdir -p /tmp/audit-chronon/red && cp <processed>/code/kerg_temporal.py red/kerg_temporal.py
cp <study>/code/test_kerg_temporal.py red/
cd /tmp/audit-chronon/red && python3 -m pytest test_kerg_temporal.py -q
FAILED test_kerg_temporal.py::test_frozen_signal_is_fixed_point_hold
FAILED test_kerg_temporal.py::test_near_constant_signal_is_fixed_point_hold
FAILED test_kerg_temporal.py::test_metastable_trap_is_reachable
FAILED test_kerg_temporal.py::test_every_spec_type_is_emittable
4 failed, 8 passed in 0.36s
```

**4 failed, 8 passed — совпадает с `DERIVATION.md:22`.**

Тексты падений (важно для атрибуции):

```
test_metastable_trap_is_reachable:
    AssertionError: удержание с возвратами распознано как TRANSIENT_REGIME_SHIFT
    assert 'TRANSIENT_REGIME_SHIFT' == 'METASTABLE_TRAP'
test_every_spec_type_is_emittable:
    AssertionError: объявлены в спеке, но недостижимы в коде: ['METASTABLE_TRAP']
    assert not {'METASTABLE_TRAP'}
```

Обратите внимание: в множестве недостижимых — **только `METASTABLE_TRAP`**. `FIXED_POINT_HOLD`
этот тест не назвал недостижимым.

### 3. Независимое воспроизведение GREEN

```
cp <study>/code/kerg_temporal.py green/ ; cp <study>/code/test_kerg_temporal.py green/
cd /tmp/audit-chronon/green && python3 -m pytest test_kerg_temporal.py -q
............                                                             [100%]
12 passed in 0.28s
```

**12 passed — совпадает с `DERIVATION.md:28`.**

### 4. Атрибуция падений D1–D4 (проверка по коду и по прогонам)

Оригинал, `classify()` вызванный напрямую с `dominant_lag=1`:

```
python3 probe_d1_original.py
A) original classify(0.5, 0.9, 0.9, 1) = FIXED_POINT_HOLD
A) original classify(0.8, 1.0, 1.0, 1) = FIXED_POINT_HOLD
B) analyze() transition types seen on original over 48 series:
   ['INSUFFICIENT_DATA', 'PERIODIC_LOOP', 'REFERENCE_COMPATIBLE', 'TRANSIENT_REGIME_SHIFT']
B) FIXED_POINT_HOLD produced by analyze() on original? False
C) original recurrence(ramp) dominant_lag = 2
   original recurrence() dominant_lag over 300 series: min=2 max=50  (any lag < 2 ? False)
```

Оригинал, замороженный и почти замороженный ряд:

```
python3 probe_d3_original.py
kerg([5.0]*150) = {'status': 'OK', 'raw': 1.0, 'value': 0.5, 'v_local': 0.0, 'v_ref': 0.0}
analyze frozen -> status = SIMULATED | kerg = 0.5 | kerg_raw = 1.0
                  | transition_type = INSUFFICIENT_DATA | temporal_coherence = None
kerg(near-frozen) raw = 0.6207328169974975 value = 0.3829951553319204
                  v_local = 7.364180283992754e-13 v_ref = 9.416866562758117e-13
analyze near-frozen -> kerg = 0.3829951553319204 | transition_type = TRANSIENT_REGIME_SHIFT
```

Итог атрибуции (мой вывод по коду, а не пересказ автора):

| Падавший тест | Реальная причина падения | Вердикт по атрибуции автора |
|---|---|---|
| `test_frozen_signal_is_fixed_point_hold` | оригинал отдаёт `INSUFFICIENT_DATA`, потому что `temporal_coherence` для константы возвращает `None` (`original.py:20`) | D3 — по существу верно; падает именно на типе, а не на 0.5 |
| `test_near_constant_signal_is_fixed_point_hold` | `TRANSIENT_REGIME_SHIFT` из отношения двух шумовых дисперсий | D4 — подтверждено |
| `test_metastable_trap_is_reachable` | нет ветки `METASTABLE_TRAP` в `classify()` | D2 — подтверждено |
| `test_every_spec_type_is_emittable` | `missing = {'METASTABLE_TRAP'}` | **D2, а не D1** — атрибуция D1 неверна |

### 5. Мутанты — пересозданы самостоятельно

Мутанты строились скриптом `mutate.py` из **исправленной** реализации; каждый якорь проверялся
на ровно одно вхождение (`assert n==1`). Прогонялись два набора тестов: 12 тестов исследования
(`study-12`) и 3 собственных теста пакета (`pkg-3`).

```
BASELINE
  corrected vs study-12 : 12 passed          failing=[]
  corrected vs pkg-3    : 3 passed           failing=[]
M1 metric inverted: abs(v_local/(v_ref+epsilon)-1.0) -> abs(v_ref/(v_local+epsilon)-1.0)
  corrected vs study-12 : 1 failed, 11 passed  KILLED   failing=['test_normalization_saturates_toward_one']
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
M2 normalization: raw/(1.0+raw) -> min(raw/2.0, 1.0)
  corrected vs study-12 : 1 failed, 11 passed  KILLED   failing=['test_normalization_saturates_toward_one']
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
M3 epsilon removed: abs(v_local/v_ref - 1.0)
  corrected vs study-12 : 1 failed, 11 passed  KILLED   failing=['test_epsilon_prevents_zero_division']
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
M4 REVERT D1: analyze(..., min_lag=1) -> min_lag=2
  corrected vs study-12 : 12 passed            SURVIVED failing=[]
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
M5 REVERT D2: if trap: -> if False:
  corrected vs study-12 : 2 failed, 10 passed  KILLED   failing=['test_metastable_trap_is_reachable','test_every_spec_type_is_emittable']
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
M6 REVERT D3/D4: if v_ref <= frozen_std_floor**2: -> if v_ref < 0:
  corrected vs study-12 : 2 failed, 10 passed  KILLED   failing=['test_frozen_signal_is_fixed_point_hold','test_near_constant_signal_is_fixed_point_hold']
  corrected vs pkg-3    : 3 passed             SURVIVED failing=[]
```

Три мутанта M1/M2/M3 убиты, собственные тесты пакета выживают на всех трёх — **таблица
`DERIVATION.md:56-62` подтверждена полностью (1 failed на каждый мутант, «3 passed» у пакета).**
Дополнительно: пакетные тесты на оригинале — `3 passed in 0.21s`.

Атрибуция убийства M1 проверена отдельно:

```
cd mut_M1_metric_inverted_study_12
python3 -m pytest test_kerg_temporal.py::test_regime_shift_increases_deviation -q  -> 1 passed
python3 -m pytest test_kerg_temporal.py::test_normalization_saturates_toward_one  -q  -> 1 failed
```

То есть тест, чей docstring обещает убить перевёрнутую метрику, её **не** убивает.

### 6. Атака на достижимость семи типов

Спека (из архива, `docs/02_KERG_AND_TRANSITIONS.md:66-76`) объявляет ровно семь типов;
машиночитаемая спека `schemas/temporal_transition_analysis.schema.json` содержит тот же перечень
из семи значений в `enum` для `transition_type`. Посылка про «семь объявленных типов» верна.

```
python3 probe_reach.py
4-arg classify grid: 12672 calls      exceptions: 0
full-arg classify grid: 506880 calls  exceptions: 0
classify с аргументами None -> produced: все семь; NEVER produced: []
analyze() randomized search (4000 рядов): 5 типов; PERIODIC_LOOP не найден случайным поиском
```

Структурированный поиск по синусоидам (315 конфигураций: P=3..100, шум 0..1.0, n=150..400) нашёл
`PERIODIC_LOOP`: P=32, шум 0, n=150 → `coh=0.7998, rec=1.0, lag=32, dwell=0.29, reent=4`.
Итоговый прогон `probe_7types2.py` — все семь типов через публичный `analyze()`:

```
OK want=REFERENCE_COMPATIBLE   got=REFERENCE_COMPATIBLE   status=SIMULATED   kerg=0.21837145744492295
OK want=TRANSIENT_REGIME_SHIFT got=TRANSIENT_REGIME_SHIFT status=SIMULATED   kerg=0.44170630034387803
OK want=FIXED_POINT_HOLD       got=FIXED_POINT_HOLD       status=OK          kerg=None
OK want=PERIODIC_LOOP          got=PERIODIC_LOOP          status=SIMULATED   kerg=0.48530653789848854
OK want=METASTABLE_TRAP        got=METASTABLE_TRAP        status=SIMULATED   kerg=0.4438697232235097
OK want=CHAOTIC_DISPERSION     got=CHAOTIC_DISPERSION     status=SIMULATED   kerg=0.682929238816935
OK want=INSUFFICIENT_DATA      got=INSUFFICIENT_DATA      status=UNAVAILABLE kerg=None
missing: []
```

На тех же семи входах оригинал: `FIXED_POINT_HOLD -> INSUFFICIENT_DATA (kerg=0.5)`,
`METASTABLE_TRAP -> TRANSIENT_REGIME_SHIFT`. **D2 и недостижимость `FIXED_POINT_HOLD` именно
через `analyze()` подтверждены; заявление «все семь достижимы» подтверждено.**

### 7. Порог `frozen_std_floor` — ложное «замершее» на реальной осцилляции

```
python3 probe_floor.py    (сигнал A*sin(2*pi*t/4), 200 отсчётов, analyze(x,1.0,5,100))
         A        v_ref  frozen?     status                   type     kerg
  1.42e-04   1.0184e-08    False  SIMULATED   REFERENCE_COMPATIBLE 0.278428
  1.41e-04   1.0041e-08    False  SIMULATED   REFERENCE_COMPATIBLE 0.278427
  1.40e-04   9.8990e-09     True         OK       FIXED_POINT_HOLD     None
  1.00e-04   5.0505e-09     True         OK       FIXED_POINT_HOLD     None
  1.00e-05   5.0505e-11     True         OK       FIXED_POINT_HOLD     None
```

Минимальное воспроизведение (`A=1e-5`, период 4 отсчёта, 49 смен знака на 100 отсчётов):

```
x = 1e-5*np.sin(2*np.pi*np.arange(200)/4.0); analyze(x, 1.0, 5, 100)
status = OK ; status_reason = REFERENCE_VARIATION_BELOW_FROZEN_FLOOR
transition_type = FIXED_POINT_HOLD ; kerg = None ; v_ref = 5.0505050505050504e-11
number of zero crossings in 100 samples: 49
```

Оперативная граница — `v_ref <= frozen_std_floor**2 = 1e-8`, то есть СКО эталонного окна
≤ 1e-4; для синуса это амплитуда ≤ ~1.41e-4. **Автор объявил эту цену в `DERIVATION.md:82-85`
(«сигнал с амплитудой ниже 1e-4 будет назван замершим независимо от формы») — факт подтверждён,
но в docstring модуля этого нет, и выдаётся канонический `transition_type`, противоречащий §5 спеки.**

### 8. Артефакт D3 (`0/(v_ref+ε)`) в исправленном коде НЕ устранён

```
python3 probe_d3_survives.py
volatile tail plateau: N(0,1)*195 + [7.0]*5
    v_ref=3.265567e+00  v_local=0.000000e+00  raw=1.0  kerg=0.5
    analyze: status=SIMULATED reason=COMPUTED type=TRANSIENT_REGIME_SHIFT kerg=0.5 kerg_raw=1.0
[1,2,3,4,5]*20 + [9.0]*5
    v_ref=3.646465e+00  v_local=0.000000e+00  raw=1.0  kerg=0.5
    analyze: status=SIMULATED reason=COMPUTED type=TRANSIENT_REGIME_SHIFT kerg=0.5 kerg_raw=1.0
чувствительность к одному отличающемуся отсчёту в локальном окне:
  delta=0:      v_local=0.000e+00 raw=1.000000 kerg=0.500000
  delta=1e-12:  v_local=2.000e-25 raw=1.000000 kerg=0.500000
  delta=1e-09:  v_local=2.000e-19 raw=1.000000 kerg=0.500000
  delta=1e-03:  v_local=2.000e-07 raw=1.000000 kerg=0.500000
  delta=1:      v_local=2.000e-01 raw=0.935283 kerg=0.483280
```

Детерминированное минимальное воспроизведение: `analyze(list(np.tile([1.,2,3,4,5],20)) + [9.0]*5, 1.0, 5, 100)`
даёт `kerg = 0.5`, `kerg_raw = 1.0`, `status = SIMULATED`, `transition_type = TRANSIENT_REGIME_SHIFT`.
Ветка `frozen_std_floor` срабатывает только когда **всё** эталонное окно тише порога; случай
`v_local == 0` при активном эталонном окне (в частности любой плато-хвост длины `local_window`)
по-прежнему даёт ровно 0.5.

### 9. Adversarial-входы `analyze()`

Полный вывод `probe_inputs.py` (сокращённо, только значимые строки):

```
empty list                -> UNAVAILABLE / SERIES_SHORTER_THAN_REFERENCE_WINDOW, без исключения
single point              -> UNAVAILABLE / SERIES_SHORTER_THAN_REFERENCE_WINDOW
all identical [5.0]*150   -> OK / REFERENCE_VARIATION_BELOW_FROZEN_FLOOR / FIXED_POINT_HOLD, kerg=None
NaN present               -> UNAVAILABLE / NON_FINITE_INPUT
inf present               -> UNAVAILABLE / NON_FINITE_INPUT
len == reference_window   -> SIMULATED / COMPUTED / TRANSIENT_REGIME_SHIFT, kerg=0.3958808385031101
reference_window<=local_window -> UNAVAILABLE / LOCAL_OR_REFERENCE_WINDOW_UNUSABLE
local_window=1            -> UNAVAILABLE / LOCAL_OR_REFERENCE_WINDOW_UNUSABLE
reference_window=0 (пустой ряд) -> UNAVAILABLE / LOCAL_OR_REFERENCE_WINDOW_UNUSABLE (+3 RuntimeWarning)
negative reference_window -> UNAVAILABLE / LOCAL_OR_REFERENCE_WINDOW_UNUSABLE
non-numeric strings ["a"]*150 -> *** EXCEPTION ValueError: could not convert string to float: 'a'
None внутри списка        -> UNAVAILABLE / NON_FINITE_INPUT
вложенный list-of-lists   -> OK / FROZEN (молча принимает 2-D вход), kerg=None
negative values           -> SIMULATED, kerg=0.3618597558902781
huge range 1e200 amp      -> SIMULATED / COMPUTED / INSUFFICIENT_DATA, kerg=nan, kerg_raw=nan  ***
huge range 1e160 amp      -> SIMULATED / COMPUTED / INSUFFICIENT_DATA, kerg=nan, kerg_raw=nan  ***
huge range 1e150 amp      -> SIMULATED, kerg=0.4992563212692117
tiny 1e-300 noise         -> OK / FROZEN, kerg=None
numpy array == python tuple == тот же результат (kerg=0.2188782373959609, lag=43)
int list                  -> SIMULATED, kerg=0.4992563212692117
sampling_rate_hz=0        -> *** EXCEPTION ZeroDivisionError: float division by zero
sampling_rate_hz=None     -> *** EXCEPTION TypeError: float('NoneType')
```

Провенанс `nan` (важно: не приписывать исправлению чужое):

```
CORRECTED analyze(linspace(-1e160,1e160,200)): kerg=nan raw=nan type=INSUFFICIENT_DATA status=SIMULATED
ORIGINAL  analyze(то же самое):                kerg=nan raw=nan type=TRANSIENT_REGIME_SHIFT status=SIMULATED
nan present in BOTH: True
```

### 10. Контракт схемы

```
ORIGINAL  UNAVAILABLE keys = ['definition_id','policy_eligible','status','transition_type']
ORIGINAL  schema-required keys MISSING = ['source_signal', 'kerg']
CORRECTED UNAVAILABLE keys = 19 полей;  CORRECTED schema-required keys MISSING = []
```

### 11. Таблица `dwell` из `DERIVATION.md` — пересчитана независимо

```
trap (конструкция самого теста, seed 12, n=150): dwell_fraction=0.7900 reentries=6   [DERIVATION: 0.79 / 6]
sine P=4 (n=300):                               dwell_fraction=0.5000 reentries=49  [DERIVATION: 0.50 / 49]
ramp range(200):                                dwell_fraction=0.1500 reentries=0   [DERIVATION: 0.15 / 0]
stationary noise: 0.26 / 19 воспроизводится на seed 1, 10, 17, 46                    [seed НЕ объявлен]
```

Таблица автора точна. Единственное замечание — для строки «стационарный шум» seed не объявлен,
строка не воспроизводима однозначно (я нашёл четыре подходящих seed из 60 проверенных).

### 12. Проверка утверждений docstring против кода (`probe_docstrings.py`)

```
ramp range(200):       recurrence lag=1 score=1.0 eps=7.217e+00 | analyze type=FIXED_POINT_HOLD coh=1.0
ramp arange(200)*1e-3: lag=1 score=1.0 | analyze type=FIXED_POINT_HOLD
ramp arange(200)*1e-4: lag=1 score=1.0 | analyze type=FIXED_POINT_HOLD
linspace(-1,1,200):    lag=1 score=1.0 | analyze type=FIXED_POINT_HOLD
точный период P= 4 -> dominant_lag=  4 CORRECT=True
точный период P=12 -> dominant_lag= 12 CORRECT=True
точный период P=32 -> dominant_lag= 32 CORRECT=True
точный период P=40 -> dominant_lag=  1 CORRECT=False
точный период P=64 -> dominant_lag=  1 CORRECT=False
corrected kerg([5.0]*150) = {'status':'OK','raw':1.0,'value':0.5,'v_local':0.0,'v_ref':0.0,'v_ref_exactly_zero':True}
```

Через `analyze()` для чистых синусов (`probe_final.py`):

```
P=40: recurrence lag=1 score=1.0 | analyze type=FIXED_POINT_HOLD coh=0.8745 rec=1.0
P=64: recurrence lag=1 score=1.0 | analyze type=FIXED_POINT_HOLD coh=0.9456 rec=1.0
```

### 13. Стоимость `dwell()` (масштабирование)

```
n=  1000:   0.029 s      (матрица ~ 1.0 MB)
n=  2000:   0.240 s x8.20 (4.0 MB)
n=  4000:   0.893 s x3.72 (16.0 MB)
n=  8000:   5.502 s x6.16 (64.0 MB)
```

`dwell()` строит матрицу `n x n`; при дефолтном `reference_window=100` это не проблема, но
`analyze(..., reference_window=len(x))` на длинном ряде масштабируется сверхлинейно.

## цитат

Оригинал — `code/kerg_temporal.original.py` (SHA-256 `17c193ac…`, идентичен `processed/` и архиву):

```
6:  def kerg(values, local_window=5, reference_window=100, epsilon=1e-12):
14:     raw = abs(v_local / (v_ref + epsilon) - 1.0)
15:     return {"status": "OK", "raw": raw, "value": raw / (1.0 + raw), "v_local": v_local, "v_ref": v_ref}
```

```
27: def recurrence(values, epsilon=None, min_lag=2, max_lag=None):
36:     for lag in range(min_lag, min(max_lag, n - 1) + 1):
```

```
43: def classify(kerg_value, coherence, recurrence_score, dominant_lag,
...
48:     if kerg_value < low:
49:         return "REFERENCE_COMPATIBLE"
50:     if coherence >= coherence_high and recurrence_score >= recurrence_high:
51:         return "FIXED_POINT_HOLD" if dominant_lag == 1 else "PERIODIC_LOOP"
52:     if kerg_value >= high and coherence < coherence_low and recurrence_score < recurrence_low:
53:         return "CHAOTIC_DISPERSION"
54:     return "TRANSIENT_REGIME_SHIFT"
```

```
57: def analyze(values, sampling_rate_hz, local_window=5, reference_window=100):
58:     kr = kerg(values, local_window, reference_window)
60:         return {"definition_id":"kem.temporal-regime-deviation.kerg.v1", "status":"UNAVAILABLE",
61:                 "transition_type":"INSUFFICIENT_DATA", "policy_eligible":False}
62:     coh = temporal_coherence(values[-reference_window:])
63:     rec = recurrence(values[-reference_window:])
```

Исправленная — `code/kerg_temporal.py` (SHA-256 `7f7b009a…`):

```
42: Известное ограничение (не баг, объявлено честно): `recurrence()` использует
43:     относительный ε = 0.25·σ, поэтому монотонный ряд с шагом меньше ε даёт
44:     `dominant_lag = 1` и высокий `recurrence_score`. Для рампы это артефакт
45:     масштаба, и тип по ней не канонизируется.
```

```
76:     raw = abs(v_local / (v_ref + epsilon) - 1.0)     # ФОРМУЛА D3 НЕ ИЗМЕНЕНА
```

```
122:     # max() возвращает первый максимум: при точном периоде выигрывает
123:     # наименьший лаг, то есть период, а не его кратные.
124:     lag, peak = max(matches, key=lambda z: z[1])
```

```
180:     if dwell_fraction is None:
181:         trap = (kerg_value >= low
182:                 and recurrence_score >= recurrence_high
183:                 and coherence < coherence_high
184:                 and dominant_lag != 1)
185:     else:
186:         trap = (dwell_fraction >= trap_dwell
187:                 and reentry_count is not None
188:                 and reentry_count >= trap_min_reentries)
189:     if trap:
190:         return "METASTABLE_TRAP"
...
195:         return "FIXED_POINT_HOLD" if dominant_lag == 1 else "PERIODIC_LOOP"
```

```
202:             frozen_std_floor=FROZEN_STD_FLOOR_DEFAULT, min_lag=1,
244:     # 2. Замершее состояние: отклонение режима не определено, тип — удержание.
245:     v_ref = float(np.var(reference, ddof=1))
246:     if v_ref <= frozen_std_floor ** 2:
248:                 "status_reason": "REFERENCE_VARIATION_BELOW_FROZEN_FLOOR",
249:                 "transition_type": "FIXED_POINT_HOLD", "kerg": None,
```

Спека — `chronon_synthesis_consolidation/docs/02_KERG_AND_TRANSITIONS.md` (из архива):

```
66: ## 5. Канонические типы переходов
72: | `FIXED_POINT_HOLD` | высокая coherence и recurrence при lag=1 | почти неизменное состояние |
73: | `PERIODIC_LOOP` | высокая coherence и recurrence при lag>1 | повторный временной цикл |
74: | `METASTABLE_TRAP` | длительный высокий dwell + возвраты в кластер | удержание в локальном режиме |
78: Пороги `0.33`/`0.66` имеют статус `UNCALIBRATED_UI_ONLY`, ...
```

Docstring теста — `code/test_kerg_temporal.py`:

```
97:     Мутация, переворачивающая отношение V_ref/V_local, обязана этот тест уронить.
```

DERIVATION.md:

```
64: Скрипт проверки — в разделе выше, воспроизводится одной командой на каждый мутант.
43: | D1 | ... `analyze()` вызывал `recurrence()` без `min_lag` ... | `test_every_spec_type_is_emittable` | `analyze(..., min_lag=1)` |
```

## вердикт

**ПОДТВЕРЖДЕНО ЧАСТИЧНО.**

Подтверждено полностью и независимо:

* D2 — `METASTABLE_TRAP` действительно не имел ветки в `classify()` оригинала и был недостижим
  ни на одном входе; исправление делает его достижимым, и реверс-мутант M5 убит двумя тестами.
* D3 по существу описания — `kerg([5.0]*150)` в оригинале даёт `raw=1.0`, `value=0.5`, а
  `analyze()` отдаёт это со `status="SIMULATED"`; арифметика `0/(0+ε)` подтверждена.
* D4 — почти замороженный ряд (шум 1e-6) в оригинале даёт `TRANSIENT_REGIME_SHIFT` при
  `kerg=0.383`, то есть отношение двух шумовых дисперсий.
* Достижимость всех семи типов в исправленной реализации — и через `classify()` (12672 + 506880
  вызовов, 0 исключений), и через публичный `analyze()` (все семь получены).
* Тесты устойчивы к мутациям ровно в заявленном виде: M1/M2/M3 убиты (по 1 failed), собственные
  три теста пакета выживают на всех трёх (`3 passed` каждый раз). Таблица `DERIVATION.md:56-62`
  воспроизведена с точностью до чисел.
* RED = 4 failed / 8 passed, GREEN = 12 passed, оригинал подлинный по SHA-256 (три копии).

Почему не полное подтверждение:

1. **D1 сформулирован неверно и не закрыт тестом.** «`FIXED_POINT_HOLD` нельзя было получить ни на
   одном входе» — ложь: `classify(0.5, 0.9, 0.9, 1)` на оригинале возвращает `FIXED_POINT_HOLD`.
   Верно более узкое утверждение: тип недостижим через `analyze()`, так как `recurrence()` имеет
   дефолт `min_lag=2` (проверено: 300 рядов, минимальный `dominant_lag = 2`). Ни один из четырёх
   упавших тестов не падает из-за D1 (`test_every_spec_type_is_emittable` назвал только
   `METASTABLE_TRAP`), а реверс-мутант M4 (`min_lag=1 → 2`) **выживает на всех 12 тестах**.
   Правка D1 не покрыта ни одним тестом.
2. **Исправление D3 неполно.** Формула `abs(v_local/(v_ref+epsilon) - 1.0)` в исправленном коде
   не изменена (строка 76), добавлен только порог. Как только локальное окно константно, а
   эталонная дисперсия выше порога, `raw = 1.0` и `kerg = 0.5` возвращаются как измерение
   (`status="SIMULATED"`, канонический `transition_type`). Минимальное воспроизведение:
   `analyze(list(np.tile([1.,2,3,4,5],20)) + [9.0]*5, 1.0, 5, 100)` → `kerg = 0.5`.
3. **Порог `frozen_std_floor` даёт ложный `FIXED_POINT_HOLD`** для сигнала с реальной
   осцилляцией: `analyze(1e-5*np.sin(2*np.pi*np.arange(200)/4.0), 1.0, 5, 100)` → `status="OK"`,
   `transition_type="FIXED_POINT_HOLD"` (49 смен знака на 100 отсчётов). Цена объявлена в
   `DERIVATION.md:82-85`, но не в docstring, и выдаётся канонический тип, противоречащий §5 спеки.
4. **Известное ограничение из docstring шире, чем объявлено, и не соблюдается кодом.** Для чистой
   синусоиды с точным периодом 40 или 64 отсчёта `recurrence()` отдаёт `dominant_lag = 1`, и
   `analyze()` возвращает `FIXED_POINT_HOLD` (`coh=0.8745`, `rec=1.0`) — не рампа, а настоящая
   периодика. Для рампы тип тоже выдаётся: 4 из 4 проверенных рампов → `FIXED_POINT_HOLD`, то есть
   фраза «тип по ней не канонизируется» — проза, не подкреплённая кодом.

## находки

### CONFIRMED — дефекты и противоречия (каждая воспроизводима командой выше)

1. **D3 закрыт лишь порогом, артефакт `0/(v_ref+ε)` жив.** Исправленный код при константном
   локальном окне отдаёт `kerg = 0.5` со `status="SIMULATED"` и каноническим типом.
   Минимальный вход: `analyze(list(np.tile([1.,2,3,4,5],20)) + [9.0]*5, 1.0, 5, 100)` →
   `kerg=0.5, kerg_raw=1.0, transition_type="TRANSIENT_REGIME_SHIFT"`. Артефакт устойчив:
   отличие одного отсчёта на 1e-9 всё ещё даёт `kerg=0.500000`; сдвигает значение только
   отличие порядка 1.0 (`kerg=0.483280`). Прямое противоречие утверждению, что исправленная
   реализация закрывает D3.
2. **D1 сформулирован как «ни на одном входе» — опровергнуто.** На оригинале
   `classify(0.5, 0.9, 0.9, 1) == "FIXED_POINT_HOLD"`; `FIXED_POINT_HOLD` входит в множество
   типов, выдаваемых `classify()` оригинала на полной сетке значений. Недостижим он только
   через `analyze()` (дефолт `min_lag=2` в `recurrence()`).
3. **Правка D1 не покрыта ни одним тестом.** Мутант M4 (`analyze(..., min_lag=1)` → `min_lag=2`)
   проходит все 12 тестов исследования (`12 passed`) и все 3 пакетных. Утверждение
   «каждый дефект закрыт падающим тестом» для D1 не выполняется.
4. **Неверная атрибуция в `DERIVATION.md:43`.** `test_every_spec_type_is_emittable` в красном
   прогоне назвал недостижимым только `METASTABLE_TRAP` (то есть это D2), а не `FIXED_POINT_HOLD`
   (D1). Из четырёх падений D1 не соответствует ни одно.
5. **Ложное «замершее» на осциллирующем сигнале.** `analyze(1e-5*sin(2πt/4), 1.0, 5, 100)` →
   `status="OK"`, `FIXED_POINT_HOLD`, `kerg=None`. Порог срабатывает при
   `v_ref <= 1e-8` (СКО ≤ 1e-4); измеренная граница для синуса — амплитуда 1.41e-4 ещё не
   замершая, 1.40e-4 уже замершая. Цена объявлена в `DERIVATION.md:82-85`, но выдача
   канонического `FIXED_POINT_HOLD` для периода 4 противоречит §5 спеки.
6. **Комментарий кода (строки 122-123) неверен при совпадении счётов.** Утверждение «при точном
   периоде выигрывает наименьший лаг, то есть период» опровергнуто: для P=40 и P=64
   `dominant_lag = 1` (score 1.0), период не найден, и `analyze()` выдаёт `FIXED_POINT_HOLD` для
   чистой периодики. Для P=4, 12, 32 комментарий верен.
7. **Ограничение из docstring (строки 42-45) уже́, чем реальность, и не соблюдается.** Заявлено
   только для монотонного ряда, но наблюдается и на строго периодических синусоидах (P=40, P=64);
   фраза «тип по ней не канонизируется» не соответствует поведению — `analyze()` возвращает
   `FIXED_POINT_HOLD` для 4 из 4 проверенных рампов.
8. **`nan` в полях результата при переполнении.** `analyze(np.linspace(-1e160, 1e160, 200), 1.0, 5, 100)`
   → `status="SIMULATED"`, `kerg=nan`, `kerg_raw=nan`. Дефект **унаследован** (в оригинале тоже
   `nan`, только тип `TRANSIENT_REGIME_SHIFT`), но добавленный `NON_FINITE_INPUT` проверяет лишь
   входной ряд, а не производные величины. Тест `test_no_nan_or_inf_anywhere` сформулирован как
   «ни одно поле не должно быть nan/inf», однако проверяет три мягких ряда и инвариант не
   обеспечивает.
9. **Нечисловой вход не имеет именованного отказа.** `analyze(["a"]*150, 1.0, 5, 100)` →
   необработанное `ValueError: could not convert string to float: 'a'`. Для `NaN`/`inf` отказ
   именованный (`NON_FINITE_INPUT`), для нечислового входа — нет.
10. **`sampling_rate_hz` не валидируется.** `analyze(x, 0.0, 5, 100)` → `ZeroDivisionError`;
    `analyze(x, None, ...)` → `TypeError`. Схема объявляет `sampling_rate_hz` как
    `exclusiveMinimum: 0`, то есть 0 вне контракта, но код отказывает исключением, а не статусом
    (ср. с обработкой `reference_window=0`). Унаследовано из оригинала.
11. **Оригинал нарушает собственную схему.** `analyze()` оригинала в ветке `UNAVAILABLE`
    возвращает только `['definition_id','policy_eligible','status','transition_type']`, тогда как
    `schemas/temporal_transition_analysis.schema.json` требует `source_signal` и `kerg`. Это
    дефект оригинала, **не упомянутый** ни в D1-D4, ни в DERIVATION. Исправленная версия
    обязательные ключи содержит.
12. **Битый указатель в документации.** `DERIVATION.md:64` обещает «Скрипт проверки — в разделе
    выше», но в документе ровно один блок кода (строки 32-37, воспроизведение RED); скрипта
    проверки мутантов нет. Процедуру мутаций я не смог воспроизвести по документу и пересоздал
    мутантов сам.
13. **Docstring теста `test_regime_shift_increases_deviation` (`test_kerg_temporal.py:97`) неверен.**
    Заявлено, что этот тест обязан уронить мутацию «перевёрнутое отношение»; на M1
    `test_regime_shift_increases_deviation` проходит (`1 passed`), а убивает мутанта другой тест —
    `test_normalization_saturates_toward_one`. Мутант убит (требование выполнено), но не тем
    тестом, который для этого написан.

### Опровергнуть НЕ удалось (отрицательные результаты — сообщаю честно)

14. Подлинность оригинала: три копии совпадают по SHA-256, хеш архива совпадает с заявленным.
15. Числа автора — RED 4/8, GREEN 12/12, мутанты 1 failed каждый, пакет 3 passed на всех трёх
    мутантах, таблица `dwell` (0.79/6, 0.50/49, 0.15/0) — воспроизведены точно.
16. Достижимость семи типов: 12672 + 506880 вызовов `classify()` без единого исключения, все семь
    типов получены; семь типов получены и через `analyze()`.
17. Устойчивость к мусорному входу: пустой список, одна точка, все одинаковые, NaN, inf,
    длина ровно `reference_window`, `reference_window <= local_window`, отрицательные значения,
    `local_window=1`, отрицательный `reference_window` — все дают именованный статус без падения;
    numpy-массив, tuple и список дают идентичный результат.
18. Перечень семи типов в спеке `docs/02_KERG_AND_TRANSITIONS.md:66-76` и в `enum` схемы
    совпадает — посылка утверждения верна.

### Чего я НЕ проверял (явно)

* Не проверял калибровку порогов `low/high/trap_dwell/trap_min_reentries/frozen_std_floor`
  на внешних данных: датасета калибровки в репозитории нет, все пороги объявлены
  `UNCALIBRATED_UI_ONLY`, и проверять нечего. Проверял только разделимость, заявленную автором.
* Не запускал валидатор JSON Schema: пакет `jsonschema` не установлен (`ModuleNotFoundError`).
  Сверял вручную только список обязательных ключей и попадание типа в `enum`.
* Не проверял, соответствует ли сам пакет `chronon_synthesis_consolidation` внешнему канону за
  пределами архива: единственные доступные спеки — `docs/*` и `schemas/*` внутри архива.
* Не проверял поведение на рядах длиной более 8000 точек (см. п.13 находок — замер сделан до
  n=8000); риск `MemoryError` на очень длинных рядах при `reference_window=len(x)` не измерен.
* Не проверял процессную часть (кто и когда правил файлы, git-историю, «внешнюю публикацию
  требует подтверждения Алексея») — это не технические утверждения.
* Не проверял `dwell()`/`classify()` на 2-D и иных экзотических формах входа за пределами
  пункта 9 (вложенный list-of-lists молча принимается как 2-D массив — зафиксировано, но
  систематически не исследовано).
