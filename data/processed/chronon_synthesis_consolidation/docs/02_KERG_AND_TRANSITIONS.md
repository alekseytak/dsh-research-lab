# K_erg и типы переходов

## 1. Каноническое определение

**Имя:** `K_erg` — KEM Temporal Regime Deviation Index.  
**Owner:** `ATQEC_PhysicalTemporal`.  
**Статус:** `ENGINEERING_METRIC`, `HYPOTHETICAL_PROXY`.

Для заранее объявленного скалярного переходного сигнала `q_t`, локального окна длины `w`, reference-окна длины `W>w` и стабилизатора `epsilon>0`:

\[
V_{local}(t;w)=\widehat{Var}(q_{t-w+1},\ldots,q_t),
\]

\[
V_{ref}(t;W)=\widehat{Var}(q_{t-W+1},\ldots,q_t),
\]

\[
K_{erg}^{raw}(t)=\left|\frac{V_{local}(t;w)}{V_{ref}(t;W)+\epsilon}-1\right|,
\]

\[
\boxed{K_{erg}(t)=\frac{K_{erg}^{raw}(t)}{1+K_{erg}^{raw}(t)}}.
\]

`K_erg_raw` лежит в `[0,+∞)`. Канонический нормированный `K_erg` лежит в `[0,1)`.

## 2. Откуда берётся формула

Исторический предшественник находится в [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt]: `time_variance = var(values[-5:])`, `ensemble_variance = var(values)`, `kerg = abs(time_variance / ensemble_variance - 1)`. Пакет сохраняет его смысл — сравнение локального и reference режима — но добавляет `epsilon`, явный статус raw/normalized и запрещает считать raw-значение числом `[0,1]`.

## 3. Что K_erg не означает

- Не доказательство математической эргодичности.
- Не spectral gap, mixing time или коэффициент `1-lambda`.
- Не доля охваченного state space.
- Не вероятность перехода `P_transition`.
- Не число петель TDA `beta_1`.
- Не риск, диагноз, состояние сознания либо разрешение на вмешательство.

Строгая эргодичность требует заданных динамики, инвариантной меры и условий теоремы Биркгофа; в старом документе [ergodic-theory-math.md] приведена общая теорема, но проектный `K_erg` её не реализует.

## 4. Петли и временные признаки

Петля не подменяет `K_erg`. Она выявляется дополнительными величинами:

\[
R_{ij}^{(\varepsilon)}=\mathbf{1}[d(z_i,z_j)\le\varepsilon],\quad j-i\ge L,
\]

\[
recurrence\_score=\frac{\sum R_{ij}^{(\varepsilon)}}{N_{pairs}}.
\]

Для периода `p`:

\[
loop\_match(p)=\frac{1}{N-p}\sum_{i=1}^{N-p}\mathbf{1}[d(z_i,z_{i+p})\le\varepsilon].
\]

\[
p^*=\arg\max_{p\in[p_{min},p_{max}]}loop\_match(p),\qquad T_{loop}=p^*\Delta t.
\]

## 5. Канонические типы переходов

| Тип | Условие | Смысл |
|---|---|---|
| `REFERENCE_COMPATIBLE` | низкий `K_erg` | локальная вариативность близка к reference |
| `TRANSIENT_REGIME_SHIFT` | `K_erg` повышен, recurrence неустойчива | смена режима без устойчивой петли |
| `FIXED_POINT_HOLD` | высокая coherence и recurrence при lag=1 | почти неизменное состояние |
| `PERIODIC_LOOP` | высокая coherence и recurrence при lag>1 | повторный временной цикл |
| `METASTABLE_TRAP` | длительный высокий dwell + возвраты в кластер | удержание в локальном режиме |
| `CHAOTIC_DISPERSION` | высокий `K_erg`, низкая coherence/recurrence | нестабильное рассеяние |
| `INSUFFICIENT_DATA` | мало точек/нет valid reference | расчёт запрещён |

Пороги `0.33`/`0.66` имеют статус `UNCALIBRATED_UI_ONLY`, если сохранены для интерфейса. Они не являются фундаментальными константами и не должны включать действие.

## 6. Контракт безопасности

`K_erg` и transition type могут только сформировать наблюдение/отчёт. Запрещено:

```text
K_erg -> изменение ethical decision
K_erg -> quantum escape
K_erg -> нейростимуляция / BCI action
K_erg -> медицинская или генетическая интерпретация
```

Старая связка `Kerg > 0.66 -> activate_quantum_escape()` из [KEM-4.0.txt] и [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt] переводится в архив и не является исполняемой спецификацией.
