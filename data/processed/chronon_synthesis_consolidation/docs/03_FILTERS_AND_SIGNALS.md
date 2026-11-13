# Фильтры и сигналы

## Карта фильтров

| Компонент | Источник/предшественник | Каноническая роль | Статус | Что исправить |
|---|---|---|---|---|
| Signal preprocessing | [Wavelet Filter Algorithm Documentation.pdf], [filter_suite_summary.md] | очистка сигнала, подавление шума, quality checks | engineering | хранить параметры фильтра, sampling rate, SNR до/после |
| CSC | [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt] | выбранный project signal `q_t` только при явном контракте | legacy/hypothetical | не называть физической квантовой чувствительностью без измерительной модели |
| `K_erg` | [02_KERG_AND_TRANSITIONS.md] | смена temporal regime | engineering proxy | не смешивать с CSC, beta, risk и loop |
| ATQEC | [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt], [ATQEC-2.0-QFI-plateaus.md] | history/consistency analysis или simulator module | hypothetical | запретить «unitary correction» для произвольных data vectors |
| TDA | [02_KEM_CORE_v42_novyi.md], [07_TDA_CMB_Analysis.md] | persistent/topological features | mathematical method + implementation dependent | Betti numbers считать по корректно построенному комплексу, не по произвольной эвристике |
| Markov transition history | [02_KEM_CORE_v42_novyi.md] | эмпирические последовательности дискретных состояний | engineering | обучать на наблюдённых transitions; не использовать случайную initial matrix как факт |
| Frequency conversion | [stage-3-frequency-unification.pdf] | только нормировка/визуализация частот | engineering transform | не выводить биологическую/космологическую причинность из совпадения ratios |
| Phase scrambling | [TEST_CASES_v1-proverka.md], [02_KEM_CORE_v41_FIXES.md] | null model, сохраняющий амплитудный спектр и разрушающий фазовые отношения | established signal-analysis procedure | соблюдать conjugate symmetry для real-valued signal; фиксировать seed и n permutations |
| Bonferroni/FDR | [TEST_CASES_v1-proverka.md] | коррекция множественных сравнений | established statistics | сначала определить family of tests и preregister alpha |

## CSC: безопасная реконструкция

Старый CSC записан как:

\[
CSC=\left|\frac{dV}{dt}\right|\exp\left(-\frac{|\Delta V|}{k_BT}\right)\phi^{-n/10}.
\]

В [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt] `V` — project/ethical value, `k_B` взята в eV/K, `T=310.15 K`, а `n` связан с длиной буфера. Эта формула **размерностно неоднозначна**, если `V` не имеет единиц энергии: аргумент экспоненты обязан быть безразмерным. Поэтому в v1 CSC разрешён только как named internal feature после явного `value_units`, `normalization_method` и `temperature_model`; иначе использовать простую нормированную скорость:

\[
q_t=\frac{|v_t-v_{t-1}|}{\Delta t\,s_{ref}+\epsilon},
\]

где `s_ref` — масштабирующий параметр с единицами `value/time`.

## ATQEC

Исторически ATQEC назван Advanced Temporal Quantum Entanglement Corrector и содержит операторную запись `|Psi(t+dt)> = U_ATQEC(D_t)|Psi(t)>` в [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt]. Для обычного численного state vector это нельзя объявлять физическим унитарным оператором без Hilbert-space model, оператора `U`, нормировки и наблюдаемых. В каноне:

```text
ATQEC = Temporal Consistency Analysis module
```

Разрешённые операции: обнаружение резких переходов, consistency flags, журнал history, классификация transition type. Любая «коррекция» — только симуляционная, reversible и отмеченная `SIMULATION_ONLY`.

## TDA

Установленный факт: `beta_0`, `beta_1`, `beta_2` — числа Бетти построенного топологического объекта; характеристика Эйлера:

\[
\chi=\beta_0-\beta_1+\beta_2.
\]

Не допускается: напрямую читать `beta_1` как «эргo-петлю», «побег невозможен» или `K_erg`. Для временной динамики требуется: окна, embedding, комплекс, filtration, алгоритм persistent homology, диапазон масштаба и null model.

## Фильтровый контракт

Каждый output фильтра обязан содержать:

```yaml
input_signal_id: string
sampling_rate_hz: number
window_start: timestamp
window_end: timestamp
filter_id: string
filter_version: string
parameters: object
quality_flags: [string]
snr_before_db: number|null
snr_after_db: number|null
provenance_ref: string
status: MEASURED|SIMULATED|UNAVAILABLE|HYPOTHETICAL
```
