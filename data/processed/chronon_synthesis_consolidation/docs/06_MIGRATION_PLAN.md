# План миграции и устранения расхождений

## P0: блокирующие правки

1. Запретить bare `kerg` в новых payload, policy и коде.
2. Заменить `is_ergoprison` на `transition_type`; `ERGOPRISON` оставить только в narrative archive.
3. Удалить автоматическую цепь `Kerg > threshold -> activate_quantum_escape`.
4. Удалить утверждения, что `K_erg` доказывает эргодичность/неэргодичность.
5. Маркировать все человеческие/медицинские/генетические применения как `NOT_IMPLEMENTED; CLINICAL_USE_PROHIBITED`.

## Переименование

| Было | Стало | Файл-источник |
|---|---|---|
| `Kerg = abs(time_variance / ensemble_variance - 1)` | `kerg_raw` + normalized `K_erg` | [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt] |
| `Kerg = abs(std_t/std_ens - 1)` | `legacy_std_ratio_deviation` | [ERGO.txt] |
| `Kerg = std_t/std_space` | `legacy_std_ratio` | [ERGO.txt] |
| `Kerg = abs(1-stability)*abs(1-coherence)` | `decision_temporal_instability_proxy` | [KEM-4.0.txt] |
| `kerg=1-lambda` | `transition_parameter_complement` | historical ATQEC notes |
| `ERGOPRISON` | `NARRATIVE_ONLY` | [ERGO.txt] |
| `quantum_escape` | удалить из temporal metrics | [KEM-4.0.txt] |

## P1: структура каталога

```text
chronon-synthesis/
  docs/
    metrics/
    filters/
    sources/
    migration/
  code/
  schemas/
  archive/
  tests/
```

## P2: tests

- stationary process: `K_erg` низкий;
- variance regime shift: `K_erg` растёт;
- periodic synthetic trajectory: `PERIODIC_LOOP`;
- constant trajectory: `FIXED_POINT_HOLD`;
- white noise: не должен устойчиво давать `PERIODIC_LOOP`;
- no action: classification не изменяет decision output.

## P3: evidence requirement

Перед любым переходом статуса из `HYPOTHETICAL` в `MEASURED` необходимо хранить dataset ID, preprocessing version, reference selection, split, uncertainty method, null model и результаты теста.
