#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null; then
  export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
fi
if ! command -v node >/dev/null; then
  print '请先安装 Node.js 22，然后重新打开此文件。'; read; exit 1
fi
node scripts/doctor.mjs || { read; exit 1; }
if [[ ! -d node_modules ]]; then
  print '请先运行 pnpm install --frozen-lockfile。'; read; exit 1
fi
open 'http://127.0.0.1:3000/settings'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
read
