# Getmobil E2E Harness

**Ayrı repodaki** Getmobil Playwright test suite'ini çalıştıran/orkestre eden harness katmanı. Test kodu içermez; test suite'i çağırır, sonucu makine-dostu JSON özete indirger ve şunları sağlar:

- 🎛️ **Web UI dashboard** — tarayıcı seç, çalıştır, sonuçları canlı izle (sunum/demo için)
- 🔎 **Adım-adım test görünümü** — test adına tıkla → Playwright adımlarını (navigate/click/expect) süreleriyle gör
- 🔺 **Test Piramidi görselleştirmesi** — Unit (125) › Integration+API (95) › E2E (70), dashboard'da canlı + sağlık göstergesi
- 🌐 **Multi-browser** — chromium · firefox · webkit · mobile-chrome · mobile-safari
- ⚡ **Paralel çalıştırma** — yapılandırılabilir worker sayısı
- 📈 **k6 yük testi** — smoke / load / stress profilleri
- 🔌 **Backend Otomasyon** — WireMock dinamik mock · API testleri (GET/POST/PUT/PATCH/DELETE) · Locust yük · Pact contract
- 🧪 **Harness kodu için unit + integration + mutation test** — node:test + Stryker (%85.6 mutation), sonuçlar dashboard'da
- 📊 **Raporlar** — Playwright HTML · Allure · Stryker mutation, dashboard'dan tek tıkla
- 🔁 **n8n workflow** — zamanlanmış E2E + yük testi zinciri

```
┌─────────────────────────┐        ┌──────────────────────────┐
│     getmobil-harness    │  spawn │    getmobil (e2e suite)  │
│  • UI dashboard (ui/)   │ ─────▶ │    Playwright + POM      │
│  • runner (src/run.mjs) │        │    5 tarayıcı projesi    │
│  • k6 (k6/, src/k6.mjs) │ ◀───── │    reports/results.json  │
│  • n8n workflow         │  parse │                          │
└─────────────────────────┘        └──────────────────────────┘
```

## Bağlantı
Harness, test suite'i **yol (path)** üzerinden bulur; varsayılan kardeş dizindir:

```
Documents/
├── getmobil/            ← e2e test suite (ayrı repo)
└── getmobil-harness/    ← bu repo
```
Farklı yerdeyse: `E2E_DIR=/abs/path node src/run.mjs` veya `--e2e-dir /abs/path`.

## 🎛️ UI Dashboard (sunum için)

```bash
npm run ui           # http://localhost:4321
```
Tarayıcıda:
- Tarayıcıları seç (chip'ler), kapsam (@smoke/tümü) ve worker sayısını ayarla → **Testleri Çalıştır**
- Yük testi profilini/VUS'u seç → **Yük Testini Başlat**
- Canlı durum, per-browser geçme oranı, test tablosu, k6 metrikleri (p95/p99, RPS, hata oranı) tek ekranda
- **📊 Playwright Raporu** ve **📈 Allure Raporu** butonları — raporları dashboard içinden yeni sekmede açar; Allure yoksa tek tıkla üretir
- Sayfa açıldığında son çalıştırma verisini otomatik gösterir

Port değiştirmek için: `PORT=8080 npm run ui`.

> **Allure** için Java gerekir (`brew install openjdk`). Dashboard, Allure'ü üretirken keg-only openjdk'yı otomatik PATH'e ekler. Java yoksa Playwright HTML raporu yine de çalışır.

## 🌐 Multi-browser & ⚡ paralel (CLI)

```bash
node src/run.mjs                                      # tüm projeler, tüm testler
node src/run.mjs --grep @smoke                        # hızlı smoke
node src/run.mjs --browsers chromium,firefox,webkit   # seçili tarayıcılar
node src/run.mjs --browsers webkit --workers 8        # 8 paralel worker
npm run run:all-browsers                              # chromium+firefox+webkit kısayolu
```
> Masaüstü projeler (chromium/firefox/webkit) tüm suite'i; mobil projeler (mobile-chrome/mobile-safari) yalnızca `@smoke`'u koşar (mobilde nav/giriş hamburger menüdedir).

Çıktı — stdout'a **tek satır JSON** (Playwright çıktısı stderr'e gider):
```json
{"ok":true,"total":10,"passed":10,"failed":0,"byProject":{"chromium":{"passed":2,...},"webkit":{...}},"tests":[...],"failures":[]}
```
Çıkış kodu: `0` geçti, `1` başarısız.

## 📈 k6 Yük Testi

```bash
node src/k6.mjs --profile smoke                       # 1 kullanıcı, hızlı doğrulama
node src/k6.mjs --profile load --vus 10 --duration 30s
node src/k6.mjs --profile stress --vus 20
BASE_URL=https://staging.getmobil.com node src/k6.mjs # farklı hedef
```
`k6/load-test.js` ana sayfa, kategori, ürün ve SSS sayfalarını test eder; eşikler: p95 < 2.5sn, hata oranı < %5. Özet:
```json
{"ok":true,"tool":"k6","requests":12,"rps":0.9,"avgMs":99,"p95Ms":173,"p99Ms":202,"failRate":0,"checksPassed":24,"thresholdsPassed":true}
```
> k6 gerekir: `brew install k6` (macOS) veya https://k6.io/docs/get-started/installation

## 🔌 Backend Otomasyon (WireMock · API · Locust · Pact)

Dashboard'daki **Backend Otomasyon** bölümü, gerçek backend'e dokunmadan tam bir API test hattı sunar:

| Bileşen | Ne yapar |
|---------|----------|
| 🧱 **WireMock** (:8089) | Getmobil-benzeri ürün API'sini taklit eder. Yanıtlar **dinamiktir**: id/body echo, rastgele stok, zaman damgası, UUID (Handlebars templating). Dashboard'dan başlat/durdur + "Dinamik Yanıtı Canlı Dene" |
| 🧪 **API testleri** | 13 test: **GET · POST · PUT · PATCH · DELETE** + bad case'ler (404, 400 doğrulama) + dinamiklik kanıtı (farklı traceId/id). node:test + native fetch |
| 🦗 **Locust** | Mock API'ye CRUD ağırlıklı yük (kullanıcı/süre ayarlanabilir); endpoint bazında istek/ort/p95 kırılımı |
| 🤝 **Pact** | **Consumer** (dashboard) kontratı üretir → **Provider** (WireMock) kontrata karşı doğrulanır; 3 etkileşim |

```bash
npm run wiremock          # mock sunucuyu başlat (Java gerekir; jar otomatik indirilir)
npm run backend:api       # CRUD API testleri
npm run backend:locust    # yük testi (LOCUST: brew install locust)
npm run backend:pact      # consumer + provider doğrulaması
node src/backend.mjs report   # birleşik HTML raporu elle tazele
```
Hepsi stdout'a tek satır JSON özet basar (n8n uyumlu) ve `reports/{api,locust,pact}.json` üretir.

### Backend Raporlama
Her koşudan sonra **otomatik** güncellenen iki HTML raporu üretilir ve dashboard'dan tek tıkla açılır:

| Rapor | İçerik | Yol |
|-------|--------|-----|
| 📄 **Backend Raporu** | API + Locust + Pact birleşik özeti (BAŞARILI/BAŞARISIZ rozetleri, test/endpoint/etkileşim tabloları) | `/report/backend/` |
| 📊 **Locust Raporu** | Locust'un native grafikli raporu: RPS/yanıt süresi zaman serileri, yüzdelik tablosu (p50–p100) | `/report/backend/locust.html` |

## 🔁 n8n Entegrasyonu (otomatik + manuel tetikleme)

Workflow **3 tetikleyiciyle** aynı zinciri (E2E → IF → k6 → bildirim) besler:

| Tetikleyici | Ne zaman | n8n düğümü |
|-------------|----------|------------|
| ⏰ **Otomatik** | Zamanlanmış (cron), ör. her 6 saat | Schedule Trigger |
| ▶ **Manuel** | İstenildiğinde, elle "Execute Workflow" | Manual Trigger |
| 🌐 **Webhook** | HTTP POST ile dışarıdan | Webhook (`/webhook/getmobil-e2e`) |

Dashboard'daki **🔁 n8n Otomasyon** bölümü bu akışı görselleştirir ve **"Manuel Tetikle"** butonuyla aynı zinciri (`scripts/pipeline.sh` = E2E smoke → k6 smoke) çalıştırır — yani otomatik ve manuel **birebir aynı yolu** izler.

1. İki repoyu n8n'in erişebildiği yola koyun (ör. `/data/getmobil`, `/data/getmobil-harness`).
2. `n8n/getmobil-n8n.json` dosyasını **Import from File** ile aktarın.
3. Akış: **(Otomatik | Manuel | Webhook) → E2E (multi-browser) → parse → IF geçti → k6 → bildirim** (aksi halde hata bildirimi, yük testi atlanır).
4. Execute Command komutları:
   ```bash
   bash /data/getmobil-harness/scripts/run-tests.sh --browsers chromium,firefox,webkit --grep @smoke
   bash /data/getmobil-harness/scripts/run-k6.sh --profile load --vus 10 --duration 30s
   bash /data/getmobil-harness/scripts/pipeline.sh   # tek komutta E2E→k6 zinciri
   ```
5. `noOp` bildirim node'larını Slack/Telegram/E-posta ile değiştirin.

### Docker
```bash
docker build -t getmobil-harness .
docker run --rm -v /abs/path/to/getmobil:/e2e getmobil-harness --browsers chromium,firefox
```

## 🔺 Test Piramidi

Harness kendi kodunu **test piramidi** stratejisiyle test eder — geniş bir hızlı-izole taban, daralan üst katmanlar:

| Katman | Sayı | Araç | Kapsam |
|--------|------|------|--------|
| 🟩 **Unit** (taban) | 125 | node:test | Saf mantık: summary, config, k6, quality (izole, ms'ler içinde) |
| 🟦 **Integration + API/Pact** (orta) | 95 | node:test · WireMock · Pact | Modül+I/O pipeline (79) + servis-seviyesi API testleri (13) + Pact kontrat (3) |
| 🟧 **E2E** (tepe) | 70 | Playwright × 5 motor | Tam tarayıcıda gerçek getmobil.com akışları |

Dashboard'daki **Test Piramidi** görseli bu katmanları canlı gösterir ve `unit > integration > e2e` koşulunu ("✓ Piramit korunuyor") doğrular. Toplam **290+** harness+e2e testi.

### 🔄 Otomatik güncelleme + zorunlu kalite kapısı

**Piramit kendini günceller:** Dashboard sunucusu test/kaynak dizinlerini izler (`fs.watch`). Herhangi bir alana test eklendiğinde veya kaynak değiştiğinde **kalite kapısı** otomatik koşar (unit + integration + WireMock ayaktaysa API testleri + E2E sayımı) ve piramit tazelenir — elle hiçbir şey çalıştırmana gerek yok. Piramit bölümünde "son tazeleme" saati görünür.

**Her geliştirme sonrası test zorunlu (git hooks):** Repo kökündeki `bash setup-hooks.sh` ile kurulur:

| Hook | Kapı | Geçmezse |
|------|------|----------|
| `pre-commit` | unit + integration testleri | commit reddedilir |
| `pre-push` | **mutation testi** (Stryker, eşik **%70** — `thresholds.break`) | push reddedilir |

Acil durum kaçışları (önerilmez): `git commit --no-verify` · `SKIP_MUTATION=1 git push`.

- Unit/integration ayrımı dosya adıyla: `test/*.unit.test.mjs` · `test/*.int.test.mjs`
- Çoğu test **data-driven** (girdi matrisleri) → hızlı ve kapsamlı
- Mutation testi (Stryker) bu testlerin gerçekten hata yakaladığını doğrular: **%85.6 skor**

```bash
npm run test:unit          # sadece unit
npm run test:integration   # sadece integration
npm run test:all           # ikisi birden
npm run test:mutation      # Stryker mutation testi
```

## Yapı
```
getmobil-harness/
├── ui/
│   ├── server.mjs          # bağımlılıksız dashboard sunucusu (Node http)
│   └── public/index.html   # dashboard arayüzü (piramit + adım görünümü dahil)
├── src/
│   ├── run.mjs             # E2E giriş noktası + buildPlaywrightArgs (saf, test edilir)
│   ├── config.mjs          # E2E_DIR / --grep / --browsers / --workers + parseArgs
│   ├── setup.mjs           # e2e bağımlılık + tarayıcı kurulumu (idempotent)
│   ├── summary.mjs         # results.json + steps.json → özet (byProject + tests + adımlar)
│   ├── k6.mjs              # k6 çalıştırıcı + özet
│   └── quality.mjs         # unit/integration çalıştırıcı + mutation özetleyici
├── test/
│   ├── *.unit.test.mjs     # unit testler (taban)
│   ├── *.int.test.mjs      # integration testler (orta)
│   └── fixtures/           # sahte rapor/k6/mutation verileri
├── k6/load-test.js         # yük testi senaryosu
├── stryker.config.json     # mutation testi yapılandırması
├── scripts/                # n8n Execute Command sarmalayıcıları (run-tests.sh, run-k6.sh)
├── n8n/getmobil-n8n.json   # zamanlanmış workflow
├── Dockerfile
└── .env.example
```

## npm script'leri
| Komut | Açıklama |
|-------|----------|
| `npm run ui` | Dashboard'u başlat (:4321) |
| `npm run run` | Tüm suite |
| `npm run run:smoke` | Sadece @smoke |
| `npm run run:all-browsers` | chromium+firefox+webkit |
| `npm run k6` | Yük testi (load) |
| `npm run k6:smoke` | Yük testi (smoke) |
| `npm run test:unit` | Harness unit testleri |
| `npm run test:integration` | Harness integration testleri |
| `npm run test:mutation` | Mutation testi (Stryker) |
| `npm run setup:e2e` | E2E bağımlılık/tarayıcı kurulumunu tetikle |
