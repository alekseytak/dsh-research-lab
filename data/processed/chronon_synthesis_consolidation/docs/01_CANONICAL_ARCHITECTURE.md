# Каноническая архитектура Хронон-Синтез

## 1. Цель

Этот документ объединяет старые линии KEM, DeCogerenc, CSC, ATQEC, TDA и переходных формул в единую архитектуру. В источниках одновременно существовали: variance-ratio `Kerg`, отношение стандартных отклонений, произведение stability/coherence, narrative «ERGOPRISON», а также нераскрытые `ergo_score`. Их нельзя использовать как одну величину.

Источники расхождений: [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt](../archive/LEGACY_FORMULAS.md), [KEM-4.0.txt](../archive/LEGACY_FORMULAS.md), [ERGO.txt](../archive/LEGACY_FORMULAS.md), [decogerenc-theory-v2-corrected.pdf](05_SOURCES_AND_ARXIV.md).

## 2. Pipeline

```text
raw observations / simulation
  -> preprocessing and signal-quality checks
  -> declared transition signal q_t
  -> local/reference temporal statistics
  -> K_erg (regime deviation)
  -> temporal coherence + recurrence + dominant lag
  -> transition-type classifier
  -> observation/report only
```

| Слой | Вход | Выход | Назначение | Статус |
|---|---|---|---|---|
| Signal | временной ряд/история состояний | `q_t`, timestamps | формирует измеряемую последовательность | инженерный |
| Filters | `q_t` | очищенный/нормированный сигнал | подавление артефактов, quality flags | зависит от реализации |
| Temporal metrics | `q_t` | variance, autocorrelation, recurrence | описывает режим во времени | инженерный |
| `K_erg` | local/reference variance | scalar `[0,1)` | обнаруживает отклонение режима | гипотетический proxy |
| Transition classifier | `K_erg`, coherence, recurrence | тип режима | отличает цикл, фиксацию, сдвиг, dispersion | гипотетический |
| Policy | observation | report | не запускает вмешательств | обязательное ограничение |

## 3. Статусы утверждений

| Маркер | Смысл | Пример |
|---|---|---|
| `ESTABLISHED_MATH` | установленное математическое определение | дисперсия, автокорреляция, числа Бетти |
| `ENGINEERING_METRIC` | воспроизводимая метрика проекта | нормированный `K_erg` |
| `HYPOTHETICAL_MODEL` | модель без эмпирической валидации | классификация типов KEM-переходов |
| `BACKGROUND_ONLY` | внешняя работа для узкого контекста | MIC-POVM, NV sensing, time crystals |
| `LEGACY_AMBIGUOUS` | историческое, но семантически неоднозначное | bare `Kerg`, `ergo_score` |
| `NARRATIVE_ONLY` | метафора | ERGOPRISON / «Узник Эрго» |

## 4. Владение

- `KEM_Core`: этический градиент и прикладная логика принятия решений.
- `ATQEC_PhysicalTemporal`: временные метрики, history, recurrence, `K_erg`.
- `TDA`: отдельные топологические признаки; не выдаёт `K_erg`.
- `SignalProcessing`: фильтрация, SNR, артефакты, sampling.
- `NarrativeArchive`: «эргo-тюрьма», художественные/философские интерпретации.

## 5. Непересекающиеся роли

| Имя | Единственный канонический смысл |
|---|---|
| `P_transition` | output вероятностной/скоринговой модели перехода |
| `K_erg` | temporal regime deviation, а не вероятность |
| `temporal_coherence` | самосогласованность во времени на заданных лагах |
| `recurrence_score` | доля дальних возвратов в близкие состояния |
| `dominant_period` | период максимальной повторяемости |
| `loop_confinement` | классифицированный режим, не scalar |
| `beta_0,beta_1,beta_2` | топологические признаки построенного комплекса |
| `CSC` | legacy/проектный переходный signal только после явной калибровки |
