# DSH Research Lab

Workspace для научных изысканий в DeepSeek Harness.

## Устройство проекта

Главный документ: `SPEC.md` — что куда кладётся и как должно работать. Контроллер лупов: `library/ergo/zaloop.md`.

## Старт

1. Открой `/Users/kovganovaekaterirna/DSH-Research-Lab` как workspace.
2. Для новой сессии выбери preset `Ведущий исследователь`.
3. Положи статьи и заметки в `library/`, исходные наборы данных в `data/raw/`, производные — в `data/processed/`.
4. Для проверки создавай отдельные сессии с preset `Аудитор доказательств` и `Аналитик данных`.
5. Итоги сохраняй в `outputs/YYYY-MM-DD-topic/`.
6. Проверь каркас командой `node scripts/validate-workspace.mjs .`.

## Bundle-плагин

Установка локального bundle в профиль Harness:

```bash
dsh plugin --profile research add ./plugin/dsh-research-lab-bundle
dsh --profile research --dump-config
```

Bundle добавляет научную persona и стандартную загрузку инструкций. Секреты в пакет не входят. В профиль `web` этот bundle уже установлен из `github:alekseytak/dsh-research-lab-bundle` и переживает перезагрузку.

## Скилл против застревания

`~/.agents/skills/ergo-break-the-loop/SKILL.md`

Срабатывает, когда одна и та же попытка повторяется против неизменного мира: меняется рамка, а не параметры. Метрика, ограничения и список исключений описаны в `library/ergo/README.md`.

Счётчик по журналу ходов:

```bash
node scripts/ergo-score.mjs library/ergo/ledger.example.jsonl
```

Установленная обвязка: knowledge base, cited native memory, academic writing, document upload/OCR и Zotero.
