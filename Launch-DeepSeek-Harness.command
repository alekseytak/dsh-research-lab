#!/bin/zsh
set -euo pipefail
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
HARNESS_DIR="$HOME/deepseek harness"
LAB_DIR="$HOME/DSH-Research-Lab"
cd "$HARNESS_DIR"
exec pnpm dsh web
