#!/usr/bin/env bash
#
# n8n workflow'unun yaptığı ZİNCİRİ tek komutta çalıştırır:
#   1) E2E smoke (multi-browser)  →  2) k6 smoke yük testi
#
# Hem n8n "Execute Command" (manuel/webhook tetikleme) hem de dashboard'daki
# "Manuel Tetikle" butonu bu script'i kullanır — böylece otomatik ve manuel
# çalıştırma AYNI yolu izler.
#
# Her adımın stdout'una tek satır JSON özet basılır.
set -uo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HARNESS_DIR" || exit 1

echo "▶ [1/2] E2E smoke (chromium, firefox, webkit)..."
node src/run.mjs --browsers chromium,firefox,webkit --grep @smoke
E2E_EXIT=$?

echo "▶ [2/2] k6 smoke yük testi..."
node src/k6.mjs --profile smoke
K6_EXIT=$?

echo "✓ Pipeline tamamlandı (e2e:$E2E_EXIT k6:$K6_EXIT)"
# E2E başarısızsa pipeline başarısız
exit $E2E_EXIT
