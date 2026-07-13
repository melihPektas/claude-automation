# Getmobil E2E harness için container imajı.
# Playwright'ın resmi imajı tüm tarayıcı bağımlılıklarını içerir.
# E2E test suite'i (ayrı repo) runtime'da /e2e'ye volume ile mount edilir.
#
# Build:
#   docker build -t getmobil-harness .
# Çalıştır (e2e repo'yu mount ederek):
#   docker run --rm -v /abs/path/to/getmobil:/e2e getmobil-harness --grep @smoke
#
# NOT: Taban imaj sürümü, e2e projesinin @playwright/test sürümüyle uyumlu olmalıdır.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /harness
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

ENV E2E_DIR=/e2e
ENV CI=true

ENTRYPOINT ["node", "src/run.mjs"]
