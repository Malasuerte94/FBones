#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -d "$PWD/.tools/cargo/registry" ]]; then
  export CARGO_HOME="$PWD/.tools/cargo"
  export CARGO_NET_OFFLINE=true
fi
exec pnpm dev "$@"
