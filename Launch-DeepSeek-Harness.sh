#!/bin/bash
set -u
HARNESS_DIR="$HOME/deepseek harness"
URL="http://127.0.0.1:3080/"
LOG_FILE="$HOME/Library/Logs/DeepSeek-Harness.log"
NODE_BIN="$HOME/.nvm/versions/node/v24.19.0/bin"
mkdir -p "$(dirname "$LOG_FILE")"
export PATH="$NODE_BIN:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

# dsh-zotero 0.3.2 ships a browser loader entry for the list slot
# settings.plugin.item without the required stable id. Repair it after
# installs/upgrades so the launcher remains self-healing.
ZOTERO_CLIENT="$HOME/.dsh/profiles/web/node_modules/dsh-zotero/lib/client.js"
if [ -f "$ZOTERO_CLIENT" ]; then
  "$NODE_BIN/node" - "$ZOTERO_CLIENT" <<'NODE' >/dev/null 2>&1 || true
const fs = require("node:fs");
const file = process.argv[2];
let text = fs.readFileSync(file, "utf8");
const oldText = `        name: "settings.plugin.item",\n        key: ZOTERO_SETTINGS_NAMESPACE,`;
const newText = `        name: "settings.plugin.item",\n        id: "zotero-settings",\n        key: ZOTERO_SETTINGS_NAMESPACE,`;
if (text.includes(oldText) && !text.includes(`id: "zotero-settings"`)) {
  fs.copyFileSync(file, `${file}.before-id-fix`);
  fs.writeFileSync(file, text.replace(oldText, newText));
}
NODE
fi

if ! curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
  if [ ! -d "$HARNESS_DIR" ]; then
    osascript -e 'display alert "DeepSeek Harness" message "Не найден каталог ~/deepseek harness" as critical'
    exit 1
  fi
  {
    printf '\n[%s] Starting DeepSeek Harness\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    cd "$HARNESS_DIR" || exit 1
    nohup pnpm dsh web >>"$LOG_FILE" 2>&1 &
    echo "PID=$!"
  } >>"$LOG_FILE" 2>&1
  for _ in $(seq 1 30); do
    curl -fsS --max-time 1 "$URL" >/dev/null 2>&1 && break
    sleep 1
  done
fi

if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi
osascript -e 'display alert "DeepSeek Harness" message "Сервер не запустился. Подробности: ~/Library/Logs/DeepSeek-Harness.log" as critical'
exit 1
