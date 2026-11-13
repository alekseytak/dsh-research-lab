# Реестр источников и arXiv

## Правило источников

Каждая ссылка имеет ровно одну роль: `FOUNDATION`, `METHOD`, `INSTRUMENTATION`, `BACKGROUND_ONLY`, `UNRESOLVED`, `LEGACY_PROJECT`. Статья не может поддерживать claim за пределами предмета исследования.

| ID | Документ/статья | Роль | Что берём | Чего не берём |
|---|---|---|---|---|
| `arXiv:2504.16225` | [Towards a Generalized Theory of Observers](https://arxiv.org/abs/2504.16225) | `BACKGROUND_ONLY` | язык observer/system boundary | физику сознания, Kerg, EEG-диагностику |
| `arXiv:2412.05979` | [Relational Quantum Dynamics (RQD): An Informational Ontology](https://arxiv.org/abs/2412.05979) | `BACKGROUND_ONLY` | философский контекст relational descriptions | 3D-time, частотную унификацию, эргодичность KEM |
| `arXiv:2412.08881` | [Ultrafast quantum light uncertainty dynamics in real time](https://arxiv.org/abs/2412.08881) | `BACKGROUND_ONLY` | пример real-time quantum-optics dynamics | Schumann resonance, EEG, CSC, alpha rhythms |
| `arXiv:2312.14112` | [Quantum Dynamics Happens Only on Paper: QBism's Account of Decoherence](https://arxiv.org/abs/2312.14112) | `BACKGROUND_ONLY` | интерпретационный QBism context | физический EEG filter, collapse, Kerg |
| `arXiv:2303.03096` | [Spontaneous Collapse of the Wavefunction: A Testable Proposal Motivated by Discrete Physics](https://arxiv.org/abs/2303.03096) | `BACKGROUND_ONLY` | пример testable collapse proposal | collapse в EEG/мозге, терапию |
| `arXiv:2503.16141` | [Quantum Dissipative Continuous Time Crystals](https://arxiv.org/abs/2503.16141) | `BACKGROUND_ONLY` | конкретная физика устойчивых осцилляций в open quantum systems | что KEM/EEG loop — time crystal |
| `arXiv:2507.05366` | [Simultaneous Determination of Local Magnetic Fields and Sensor Orientation with NV Centers in Nanodiamond](https://arxiv.org/abs/2507.05366) | `INSTRUMENTATION` | NV vector magnetometry, orientation inference | NV detection of consciousness/CSC |
| `arXiv:2006.13727` | [Minimal Informationally Complete Measurements for Probability Representation of Quantum Dynamics](https://arxiv.org/abs/2006.13727) | `FOUNDATION` | MIC-POVM mathematics | EEG/MEG as POVM без physical measurement model |
| `arXiv:1408.6090` | [POVM Quantization](https://arxiv.org/abs/1408.6090) | `FOUNDATION` | POVM-quantization mathematics | BCI claims |
| `arXiv:1604.07422` | [Quantum theory cannot consistently describe the use of itself](https://arxiv.org/abs/1604.07422) | `BACKGROUND_ONLY` | foundational quantum-measurement discussion | KEM architecture validation |
| `arXiv:2411.09879` | [ID cited in plan-proverki-kontseptsii-DeCogeren.pdf] | `UNRESOLVED` | nothing until bibliographic audit | any claim |
| `arXiv:2002.03981` | [ID cited in ot-kvantovoi-elektrodinamiki-k-eticheskoi-kogerentnosti.pdf] | `UNRESOLVED` | nothing until bibliographic audit | RG/QED claim |
| `arXiv:1902.07074` | [ID cited as multiple-comparisons source] | `UNRESOLVED` | verify title/authors before citation | automatic validation of Bonferroni |
| `arXiv:2411.00105` | [ID cited in stage-3-frequency-unification.pdf] | `UNRESOLVED` | verify separately | Schumann harmonics/relativity claims |

## Проектные источники

| Документ | Что извлечено | Канонический статус |
|---|---|---|
| [POLNYI-DOKUMENT-INTEGRATsII-KEM-S-FORMULAMI-I-OBIaSNENIIaMI.txt] | ∇ε, CSC, raw variance-ratio Kerg, ATQEC, TDA | `LEGACY_PROJECT`; частично мигрировать |
| [KEM-4.0.txt] | `Kerg=abs(1-stability)*abs(1-coherence)`, escape logic | archived; rename noncanonical proxy |
| [ERGO.txt] | `sigma`-ratio formulas, narrative, 0.33/0.66 | narrative/legacy only |
| [02_KEM_CORE_v42_novyi.md] | time embedding, Markov history, phase-scrambling | engineering implementation review required |
| [TEST_CASES_v1-proverka.md] | synthetic tests, phase scrambling, Bonferroni | reusable testing structure |
| [Edinaia-Veroiatnost-Perekhoda-Supermodel-s-Strunnymi-Chlenami.txt] | `P_transition` toy forms and oscillatory term | hypothetical model |
| [stage-3-frequency-unification.pdf] | frequency transforms | engineering reference convention only |
| [decogerenc-theory-v2-corrected.pdf] | bibliography and module map | source map; claims must be narrowed |

## Citation form

В новых документах пишите название в скобках, затем ссылку:

```markdown
См. (Quantum Dissipative Continuous Time Crystals, arXiv:2503.16141).
```

Не пишите отдельную голую URL без названия документа.
