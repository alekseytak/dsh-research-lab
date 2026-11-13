set harnessDir to (POSIX path of (path to home folder)) & "deepseek harness"
set launchCmd to "export PATH=\"$HOME/.nvm/versions/node/v24.19.0/bin:$PATH\"; cd " & quoted form of harnessDir & "; if curl -fsS --max-time 1 http://127.0.0.1:3080/ >/dev/null 2>&1; then open http://127.0.0.1:3080/; else pnpm dsh web; fi"
tell application "Terminal"
  activate
  do script launchCmd
end tell
