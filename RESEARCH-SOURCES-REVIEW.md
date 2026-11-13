# Обзор сторонних «DSH-Research-Lab»-источников и план заимствований

Дата: 2026-09-09.
Контекст: искали и устанавливали плагин «DSH-Research-Lab». На GitHub существуют четыре отдельных сторонних
репозитория с похожим именем. По выбору пользователя установлен только `alekseytak/dsh-research-lab-bundle`;
остальные три разобраны глубоко (3 параллельных субагента) — из них берём «дёшево»-артефакты (текст/схемы/промпты),
а исполняемый код НЕ переносим. Этот файл — сводка и рабочий чек-лист для дальнейшего внедрения.

---

## 1. Что уже УСТАНОВЛЕНО

**`alekseytak/dsh-research-lab-bundle`** (выбор пользователя) — в профиль `web` этого GUI:
- `package.json` профиля получил зависимость `dsh-research-lab-bundle: github:alekseytak/dsh-research-lab-bundle`;
- добавлено в список `dsh.profile.bundles` (последним);
- `--dump-config` подтверждает живой патч-слой: persona «research lead» (evidence-first, ответ по-русски)
  на строке `system-prompt` и лимит `agent-instructions maxBytes → 65536`.
- Это чисто конфигурационный patch-слой (6 файлов, MIT), без рантайм-кода, сети и секретов.
- Бандл держится из GitHub (не из временного каталога), переживёт перезагрузку.
- **Новый бандл подхватится в НОВЫЕ сессии после рестарта профиля / перезагрузки страницы** (бандлы не накладываются
  на уже живую сессию динамически). Локальная копия пакета также лежит в `~/DSH-Research-Lab/plugin/dsh-research-lab-bundle`.
- Примеч.: upstream-инструкция исследовательского воркспейса ставит bundle в профиль `research`, а здесь он поставлен
  в действующий профиль `web` — это два разных слоя. Если нужен и профиль `research`, команда: `dsh plugin --profile research add ./plugin/dsh-research-lab-bundle`.

---

## 2. Четыре репозитория — что это

| Репо | Что реально делает | Язык/тип | Статус/зрелость | Брать? |
|---|---|---|---|---|
| `alekseytak/dsh-research-lab-bundle` | persona + `maxBytes` инструкций | config patch (MIT) | 0.1.0 | ✅ **установлен** |
| `Harzva/dsh-research-lab` | contrôle-plane дизайна экспериментов: фиксация baseline+RUNTIMES×повторы, SHA-256 manifest. М0 НЕ вызывает модель | TS, cordis host+client (`webServer`) | 0.1.0-m0, аккуратный, но manifest-only | Дёшево-артефакты; код нет |
| `snow-The/dsh-research-lab` | исполняемый тулкит: вики/AutoSci, eval-лейджер, FTS5-ретривал, arXiv-digest/rewrite | один plugin, 14 tools | цельный, но сырой dist | Чек-лист arXiv-ревью + eval-дисциплина; код нет |
| `raktim-mondol/dsh-researchcraft` | research-профиль из 4 слоёв: persona, ~711 навыков, lab-ноутбук, 21 субагент | **cordis-бандл на JS** (Python только в хелперах!) | 0.7.1, зрелый | Самый богатый источник текстов; код/BYOK нет |

Версии этих репо привязаны к устаревшему/тому или иному спинна DSH и живут как автономные «островки», поэтому
исполняемые части под текущий рантайм не ставим.

---

## 3. «Дёшево»-артефакты к заимствованию (текст/схема/конфиг)

### 3.1 Из `Harzva/dsh-research-lab`
1. **`schemas/research-experiment.schema.json`** — эталонный manifest эксперимента (draft-2020-12):
   `baseline`(dshVersion/profile/agentPreset/model) · `dataset`(id/version/digest) · `budget`(maxTokens/maxToolCalls/
   timeoutSeconds/repetitions) · `metrics` · `baseSeed` · `runtimeIds`.
2. **Enum 6 метрик**: `task-success`, `latency-ms`, `input-tokens`, `output-tokens`, `tool-calls`, `estimated-cost`.
3. **Seed-политика `base-plus-variant-index`** (seed = baseSeed + индекс варианта) — детерминированная конвенция фиксации.
4. **Паттерн `executable:false` + `blockers[]`** — честное отделение реализованного от обещаний (и «claims boundary»:
   явный список НЕ-заявлений). Отражён и в схеме, и в UI.
5. **`REASONING_RUNTIMES` как card-checklist**: поля `capabilities`/`limitations`/`evidence` — шаблон «паспорта» рантайма.
6. **Структура `evidence/m0-YYYY-MM-DD.json`** (scope, determinism, browserSmoke, regression, claimsBoundary).
7. **Дисциплина документов**: ROADMAP = «единственный исполняемый контроль», PRD/architecture, чек-лист claims boundary.

### 3.2 Из `snow-The/dsh-research-lab`
1. **Чек-лист ревью arXiv-статьи (8 пунктов)** — единственный готовый «промпт» репо. Пункты: Contribution /
   Method / Evidence strength / Baseline fairness / Known failure modes / Reproducibility / Claims vs evidence /
   Missing experiments + вердикт (Accept/Weak accept/Borderline/Reject). → класть в `evidence-auditor`.
2. **Дисциплина eval-протокола (口径)** — поля `BenchRow` (`date/model/task/metric/score/split/hf_subset/prompt_type/
   seed/note`) + правило «никогда не сравнивать тест и dev/validation сплит», `metric`/`split` обязательны.
3. **Топология вики `.rlab/wiki/`** (`experiment/literature/decision/todo`, frontmatter, `[[wikilink]]`, индекс+лог),
   **claim-ledger с beta-постериором**, **зымейте структуры дайджестов/refs/ocr/bench** — схемы данных без кода.

### 3.3 Из `raktim-mondol/dsh-researchcraft` (самый богатый)
1. **Persona + research system-prompt** (`prompt.js`, ~149 строк): секции «Research discipline» (framing → designing →
   preregister → verify-before-claiming → red-team-review → investigating-anomalous), «Lab notebook» (лог по ходу, не в
   конце), «Specialists» (роутинг по «трудность, не длина» + `subagent_pro`-эскалация), «Figures» (числовое — реальный
   matplotlib), «Safety» («consistent with» ≠ «proves»). → в `research-lead`.
2. **Каталог навыков** — 21 specialist-brief (reproducibility-auditor, citation-checker, statistical-reviewer,
   literature-researcher, fact-checker, methodology-reviewer, hypothesis-generator…) → DSH-скиллы/субагенты
   `evidence-auditor`-семьи; 16 research-discipline skills → framing/preregistration/verification и т.п.
3. **Lab-ноутбук (схема, без кода)**: 5 типов entry (hypothesis/method/observation/decision/note), стойки
   supports/refutes/neutral, confidence low/med/high, `relatesTo`/`supersedes`/`artifacts`.
4. **Каркасы `scientific_result`**: `table` (columns+unit, rows, кап 25×100) и `statistical_test`
   (test/estimate/pValue/adjustedPValue/effectSize/CI) — каркас терминального ответа evidence-auditor.
5. **`workflows.json`** — 330 шаблонов задач по 22 категориям (literature 12, paper 15, grants 12, genomics 18, ml 15…),
   каждый с `prompt` + `suggestedSkills` + `placeholders` — готовый банк промптов.
6. **Комментарии `agent.cordis.yml`** (45+ строк) — лучший справочник по realm/inject-плоскостям DSH при правке пресетов.

---

## 4. «Дорого» — НЕ переносить (с причинами)

- **`Harzva`**: compile/store-бэкенд, HTTP-API (`POST /dsh-research-lab/api/compile`), React-вкладка, esbuild-обвязка —
  жёстко привязаны к `dsh 0.1.0-rc.6`; без реального Runner (M1+, которого нет) выгоды нет.
- **`snow-The`**: 14 tools целиком (SQLite FTS5, OCR с `PADDLE_OCR_TOKEN`, arXiv-сеть, rewrite); устаревший `dist`,
  Windows-хардкод в тестах.
- **`researchcraft`**: BYOK-инструменты (Consensus/Scite/Unpaywall/Parallel/Gemini/Modal/RunPod), `notebook`/
  `scientific_result` **как код**, zvec-grep (npm+demon+~130MB), python-helpers venv, записи в `~/.dsh`.
  Ниши этих инструментов уже закрыты вашими установленными плагинами: dsh-zotero, dsh-knowledge-base,
  dsh-native-memory, dsh-file-upload, web.

---

## 5. Красные флаги (учесть при любом заимствовании)

- **`researchcraft` `cordis.patch.yml` ставит `agent-presets.default: researchcraft` ГЛОБАЛЬНО** в `~/.dsh/settings.yaml` —
  НЕ копировать этот патч: сломает существующий ростер пресетов. Брать только текстники.
- **Жёсткие пины версий**: `researchcraft` → `dsh-tool-subagent@0.1.1-rc.2`; `Harzva` → `dsh 0.1.0-rc.6`. Дрейф версий
  ломает пресеты («unknown tool»). Перенося routing-идею, перепроверять под текущий DSH.
- **Секреты БЕЗ `role('secret')`** в settings-keys.js researchcraft — ключи открытым текстом в `settings.yaml`;
  «маскировка» лишь write-only-дизайн формы. Локально приемлемо, но при заимствовании схемы хранения ключей знать об этом.
- **Сетевые/диск/процесс-эффекты** в BYOK-инструментах — только под DSH-песочницу/approval; без ключа connector отключён.
- Качество мелочей (`catch {}`-глотание в Harzva, наивные rewrite-правила в snow-The) — не эталон.
- «AutoSci/ToT/Reflexion/ASI-Bench» в описаниях многих звучит впечатляюще, но реального исполнения «науки» нет.

---

## 6. План внедрения (следующие шаги — по «дёшево»-списку)

1. **`evidence-auditor`** (пресет или агент-файл `~/DSH-Research-Lab/agents/evidence-auditor.md`):
   - встроить чек-лист arXiv-ревью (8 пунктов + вердикт);
   - встроить дисциплину eval-протокола (metric/split обязательны, не сравнивать test и dev);
   - добавить шаблон `statistical_test`-карточки в ответ.
2. **`research-lead`** (`~/DSH-Research-Lab/agents/research-lead.md` + persona researchcraft):
   - секции Research discipline / Lab notebook / Specialists / Figures / Safety (перевести и ужать);
   - seed-политику `base-plus-variant-index` и паттерн `executable:false`+`blockers[]` как дисциплину.
3. **Точные шаблоны в `~/DSH-Research-Lab/templates/research/`**: manifest-схема эксперимента
   (`research-experiment` / перенести как `manifest.yaml`-образец — уже есть каркас в `outputs/_template/manifest.yaml`),
   чек-лист arXiv-ревизии, lab-notebook entry, карточка `scientific_result`.
4. **По желанию**: выдернуть отдельные готовые промпты из `workflows.json` snow-/researchcraft в `library/`.

Порядок выполнения уточняется по каждому пункту; вероятность конфликтов с навыками/пресетами оценивается отдельно.
