# Google Colab bridge для DSH Research Lab

## Решение

Безопасный вариант — не передавать DSH ключи в Colab и не поднимать публичный сервер. DSH готовит notebook и отправляет в Colab только выбранные входные файлы и параметры. Colab выполняет код, а результат возвращается в `outputs/` через скачиваемый artifact или Google Drive.

## MVP

1. `prepare_notebook` создаёт `.ipynb` из скрипта анализа и фиксирует `requirements.txt`, commit/hash данных и параметры.
2. `open_in_colab` открывает notebook через `https://colab.research.google.com/drive/...` или локальный upload flow.
3. `export_run` сохраняет stdout, stderr, environment manifest, plots и таблицы в `outputs/YYYY-MM-DD-topic/colab-run/`.
4. `verify_run` проверяет checksum входов, версию Python, список пакетов и наличие ожидаемых артефактов.

## Безопасность

- Никогда не вшивать API keys, OAuth refresh tokens или абсолютные приватные пути в notebook.
- Секреты только через Colab Secrets, credential references или ручной ввод в ячейку.
- По умолчанию разрешать только workspace `data/` и `outputs/`.
- Передавать наружу только явно выбранные файлы.
- Явно показывать пользователю diff перед отправкой notebook.

## Следующий кодовый шаг

Сделать отдельный пакет `dsh-colab-bridge` с tools `prepare_notebook`, `open_in_colab`, `verify_run`, `import_artifacts` и Web panel с журналом запусков. Для первого релиза оставить выполнение в Colab ручным, без удалённого выполнения по API. Это убирает OAuth и серверный туннель из критического пути.

## Публикация

В текущем checkout Harness отдельного `dshmarket` не обнаружено. Поэтому bundle распространяется как npm-пакет или локальный tarball; публикация выполняется только через настроенный release/registry workflow после проверки артефактов и явного подтверждения владельца.
