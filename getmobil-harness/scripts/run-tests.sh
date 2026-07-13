#!/usr/bin/env bash
#
# n8n "Execute Command" node'u için ince sarmalayıcı.
# Asıl işi Node runner (src/run.mjs) yapar; bu script yalnızca doğru dizine geçer.
#
# Kullanım (n8n Execute Command):
#   bash /data/getmobil-harness/scripts/run-tests.sh --grep @smoke
#   bash /data/getmobil-harness/scripts/run-tests.sh                 # tüm suite
#
# stdout'a TEK SATIR JSON özet basar; çıkış kodu test sonucunu yansıtır.
set -uo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HARNESS_DIR" || exit 1

exec node src/run.mjs "$@"
