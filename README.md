<div align="center">

# 🤖 Claude Automation — Getmobil E2E Test Platformu

**[getmobil.com](https://getmobil.com)** için uçtan uca test otomasyonu, API/mock/contract testleri, yük testleri, kod-kalite kapıları ve canlı bir dashboard.

Page Object Model · Multi-browser · WireMock · Pact · k6 · Locust · Mutation Testing · Test Piramidi · n8n · Allure

`Playwright` &nbsp;•&nbsp; `TypeScript` &nbsp;•&nbsp; `WireMock` &nbsp;•&nbsp; `Pact` &nbsp;•&nbsp; `k6` &nbsp;•&nbsp; `Locust` &nbsp;•&nbsp; `node:test` &nbsp;•&nbsp; `Stryker` &nbsp;•&nbsp; `n8n`

</div>

---

## 📌 Nedir?

İki bağımsız ama birlikte çalışan projeden oluşan bir test platformu:

| Proje | Rol |
|-------|-----|
| 🎭 **[`getmobil/`](./getmobil)** | Saf **E2E test suite** — Playwright + Page Object Model, 70 senaryo × 5 tarayıcı |
| 🎛️ **[`getmobil-harness/`](./getmobil-harness)** | **Orkestrasyon katmanı** — dashboard, k6, unit/integration/mutation testleri, n8n |

```
┌───────────────────────────┐         ┌──────────────────────────┐
│      getmobil-harness      │  spawn  │     getmobil (e2e)       │
│  • 🎛️ Web dashboard        │ ──────▶ │  • Playwright + POM      │
│  • 🔌 WireMock+API+Pact    │         │  • 5 tarayıcı projesi    │
│  • 📈 k6 + 🦗 Locust yük   │ ◀────── │  • bad-case + filtre     │
│  • 🧪 unit/int/mutation    │  parse  │  • reports/results.json  │
│  • 🔁 n8n workflow         │         │                          │
└───────────────────────────┘         └──────────────────────────┘
```

Harness, test suite'i **yol (`E2E_DIR`, varsayılan `../getmobil`)** üzerinden çağırır — ikisi bağımsız sürümlenebilir, ayrı ayrı deploy edilebilir.

---

## 🔺 Test Piramidi

Platform, kendi kodunu **test piramidi** stratejisiyle test eder — geniş hızlı taban, daralan üst katmanlar:

```
              ▲
             ╱ ╲        🟧 E2E .............  70   (Playwright × 5 motor)
            ╱───╲       🟦 Integration .....  79   (modüller + gerçek I/O)
           ╱─────╲      🟩 Unit ............ 101   (node:test, izole, ms'ler)
          ╱───────╲
         ╱─────────╲    ✓ unit > integration > e2e  →  Piramit korunuyor
```

**Toplam 250 test.** Dashboard'daki canlı piramit görseli `unit > integration > e2e` sağlığını doğrular. **Mutation testi (Stryker): %85.6** — testlerin gerçekten hata yakaladığını kanıtlar.

---

## ✨ Öne Çıkanlar

- 🎛️ **Canlı Web Dashboard** — tarayıcı seç · çalıştır · sonuçları anlık izle (`npm run ui`)
- 🌐 **Multi-browser** — Chromium · Firefox · WebKit · Mobile Chrome · Mobile Safari
- ⚡ **Paralel çalıştırma** — yapılandırılabilir worker sayısı
- 🔎 **Adım-adım görünüm** — test adına tıkla → Playwright adımlarını (navigate/click/expect) süreleriyle gör
- 🧪 **Kod kalite kapıları** — unit + integration + **mutation** testleri, dashboard'da
- 📈 **k6 yük testi** — smoke / load / stress profilleri (p95, p99, RPS, hata oranı)
- 🚦 **Bad-case & filtre kapsamı** — 404'ler, hatalı girdi, **filtre doğruluğu** (256 GB → sonuç azalır), `?pageNumber` sayfalama
- 🔌 **Backend Otomasyon** — **WireMock** dinamik mock (id/body echo, UUID, zaman damgası) · **API testleri** (GET/POST/PUT/PATCH/DELETE + bad case) · **Locust** yük · **Pact** contract (consumer → provider doğrulama)
- 📊 **3 katmanlı rapor** — Playwright HTML · **Allure** · Stryker mutation, dashboard'dan tek tıkla
- 🔁 **n8n otomasyonu** — **otomatik** (cron) + **manuel** + **webhook** tetikleme, tek zincir

---

## 🚀 Hızlı Başlangıç

```bash
git clone https://github.com/melihPektas/claude-automation.git
cd claude-automation

# 1) E2E test suite
cd getmobil
npm install
npm run install:browsers        # chromium + firefox + webkit
npm test                        # tüm suite

# 2) Harness + Dashboard
cd ../getmobil-harness
npm install
npm run ui                      # http://localhost:4321
```

Dashboard'da: tarayıcı seç → **Testleri Çalıştır** → test adına tıkla (adımlar) → **Yük Testi** → **Kod Kalitesi** (unit/integration/mutation) → **n8n Manuel Tetikle** → **Allure/Mutation** raporlarını aç.

---

## 🗂️ Kapsam Özeti

| Alan | Ne test edilir |
|------|----------------|
| Ana sayfa, header, navigasyon | Logo, 5 kategori menüsü, arama (autocomplete), sepet |
| Kategori & ürün | Listeleme, **filtre doğruluğu**, sayfalama, PDP, **sepete ekle** |
| Sepet · Giriş · Cihaz Sat · SSS | Uçtan uca akışlar, OTP modalı, statik sayfalar |
| **Bad-case** | 404'ler, sonuçsuz/uzun/özel-karakter arama, geçersiz telefon, boş sepet |
| Yük (k6) | Ana sayfa/kategori/ürün/SSS altında p95 < 2.5sn, hata < %5 |
| **Backend API** (WireMock) | Tam CRUD (5 HTTP metodu) + 404/400 bad case + **dinamiklik kanıtı** (farklı UUID/id) |
| **Contract** (Pact) | Consumer kontrat üretir → Provider (mock API) kontrata karşı doğrulanır |
| **Backend yük** (Locust) | Mock API'ye CRUD ağırlıklı yük; endpoint bazında ort/p95 kırılımı |

---

## 🔁 n8n: Otomatik + Manuel Tetikleme

Workflow **3 tetikleyiciyle** aynı zinciri besler:

| Tetikleyici | Ne zaman |
|-------------|----------|
| ⏰ **Otomatik** | Zamanlanmış (cron), ör. her 6 saat |
| ▶ **Manuel** | İstenildiğinde, elle "Execute Workflow" |
| 🌐 **Webhook** | HTTP POST ile dışarıdan |

**Akış:** `(Otomatik │ Manuel │ Webhook) → E2E (multi-browser) → IF geçti → k6 → 🔔 Bildirim`

Otomatik ve manuel tetikleme **birebir aynı** `scripts/pipeline.sh` yolunu izler. Dashboard'daki n8n bölümü bu akışı görselleştirir ve **"Manuel Tetikle"** butonuyla canlı çalıştırır.

---

## 🧭 Yapı

```
claude-automation/
├── getmobil/                  # 🎭 E2E test suite (Playwright + POM)
│   ├── src/pages/             #   sayfa nesneleri + component'ler
│   ├── tests/                 #   *.spec.ts senaryoları (+ negative, filter, catalog)
│   ├── reporters/             #   özel steps reporter (adım-adım görünüm)
│   └── playwright.config.ts   #   5 tarayıcı projesi, paralel, raporlar
│
└── getmobil-harness/          # 🎛️ Orkestrasyon
    ├── ui/                    #   bağımlılıksız dashboard (server + tek sayfa)
    ├── src/                   #   run · config · summary · k6 · quality · backend
    ├── test/                  #   *.unit.test.mjs · *.int.test.mjs
    ├── backend/               #   🔌 wiremock mappings · api-tests · locustfile · pact
    ├── k6/load-test.js        #   yük testi senaryosu
    ├── n8n/getmobil-n8n.json  #   3-tetikleyicili workflow
    └── stryker.config.json    #   mutation testi
```

> **Backend otomasyon gereksinimleri:** Java (`brew install openjdk` — WireMock/Allure) ve Locust (`brew install locust`). `wiremock.jar` ilk çalıştırmada otomatik indirilir.

Detaylar için: **[getmobil/README](./getmobil/README.md)** · **[getmobil-harness/README](./getmobil-harness/README.md)**

---

<div align="center">

Made with **[Claude Code](https://claude.com/claude-code)** 🤖

</div>
