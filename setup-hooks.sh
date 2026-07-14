#!/usr/bin/env bash
#
# Kalite kapısı git hook'larını kurar (tek seferlik):
#   pre-commit → unit + integration testleri zorunlu
#   pre-push   → mutation testi zorunlu (Stryker, eşik %70)
set -e
cd "$(dirname "$0")"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "✅ Kalite kapısı hook'ları kuruldu:"
echo "   pre-commit → unit + integration zorunlu"
echo "   pre-push   → mutation testi zorunlu (eşik %70)"
echo "   Kaçış: git commit --no-verify · SKIP_MUTATION=1 git push (önerilmez)"
