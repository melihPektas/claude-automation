#!/usr/bin/env bash
#
# n8n "Execute Command" node'u için k6 yük testi sarmalayıcısı.
#
# Kullanım:
#   bash /data/getmobil-harness/scripts/run-k6.sh --profile load --vus 10 --duration 30s
#
# stdout'a TEK SATIR JSON özet basar; çıkış kodu eşik sonucunu yansıtır.
set -uo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HARNESS_DIR" || exit 1

exec node src/k6.mjs "$@"
