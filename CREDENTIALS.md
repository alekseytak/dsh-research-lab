# API keys for agents

Боты используют credential references, а не копии ключей в prompt-файлах.

- Основной provider: `CLAUDE_N_CODEX_API_KEY`.
- Ссылка хранится в `~/.dsh/.credentials.yaml` с правами `0600`.
- В `SOUL.md`, `AGENTS.md`, preset-файлах и workspace ключи не записываются.
- Если понадобится Zotero Web API, Colab, OpenAI transcription или Google OAuth, добавлять отдельную credential reference только после явной настройки соответствующего сервиса.

Это намеренно: раздать ботам доступ можно через общий credential provider, но разносить секрет по каждому боту — плохая идея. Промпт не является хранилищем ключей.
