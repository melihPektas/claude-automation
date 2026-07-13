# Getmobil.com E2E Otomasyonu (Playwright + POM)

[getmobil.com](https://getmobil.com) için **Page Object Model** mimarisiyle yazılmış uçtan uca test otomasyonu. Sitenin fonksiyonel yüzeyinin ~%80'ini kapsar ve **n8n** ile zamanlanmış çalıştırmaya hazırdır.

## Kapsam (~%80)

| Alan | Test Dosyası | Neyi doğrular |
|------|--------------|---------------|
| Ana sayfa | `home.spec.ts` | Başlık, popüler ürünler, kartlar, çerez izni, altbilgi |
| Header & Navigasyon | `header-nav.spec.ts` | Logo, 5 kategori menüsü, Cihaz Sat, sepet ikonu |
| Arama (autocomplete) | `search.spec.ts` | Öneri açılır listesi, öneriye tıklama, marka araması |
| Kategori / Listeleme | `category.spec.ts` | Ürün kartları, filtre grupları, marka kırılımı, ürüne geçiş |
| Ürün Detay (PDP) | `product.spec.ts` | Başlık/fiyat, kozmetik durum, özellikler, **sepete ekle** |
| Sepet | `cart.spec.ts` | Boş sepet + uçtan uca "ekle → sepette gör" |
| Giriş (OTP modal) | `login.spec.ts` | Modal açılışı, telefon alanı, kapatma* |
| Cihaz Sat | `sell.spec.ts` | Satış akışı sayfası, marka seçenekleri |
| SSS | `faq.spec.ts` | Soru listesi, accordion açılışı |
| Altbilgi & statik sayfalar | `footer-static.spec.ts` | Hakkımızda, İletişim, Mağazalar, Kampanyalar vb. |
| Katalog (pozitif) | `catalog.spec.ts` | 5 kategori + 3 marka sayfası, sonuç sayacı (data-driven) |
| **Filtre & Sayfalama** | `filter.spec.ts` | Sol filtre paneli, `?pageNumber=2`, **filtre doğruluğu** (256 GB → sonuç azalır) |
| **Bad case / negatif** | `negative.spec.ts` | 404'ler, sonuçsuz/uzun/özel-karakter arama, geçersiz telefon (buton pasif), boş sepet |
| Smoke `@smoke` | `smoke.spec.ts` | Kritik sayfaların hızlı sağlık kontrolü |

Toplam **~70 distinct E2E testi** × 5 tarayıcı motoru. Pozitif akışların yanı sıra **negatif/bad-case** senaryoları (geçersiz URL 404, hatalı girdi doğrulaması, sınır durumlar) ve **filtre doğruluğu / sayfalama** da kapsanır.

\* Giriş **telefon + OTP (SMS)** tabanlı olduğu için tam kimlik doğrulaması bilinçli olarak otomatize edilmedi; yalnızca modal davranışı test edilir.

## Mimari

```
getmobil/
├── playwright.config.ts        # baseURL, chromium + mobile projeleri, raporlar
├── src/
│   ├── data/
│   │   ├── urls.ts             # tüm yol tanımları tek yerde
│   │   └── testData.ts         # arama terimleri, nav öğeleri, sabitler
│   ├── pages/
│   │   ├── BasePage.ts         # ortak temel (goto + çerez + header/footer)
│   │   ├── HomePage / CategoryPage / ProductPage / CartPage ...
│   │   └── components/         # Header, Footer, CookieConsent, LoginModal
│   └── fixtures/
│       └── pages.ts            # sayfa nesnelerini enjekte eden özel fixture
├── tests/                      # *.spec.ts senaryoları
└── n8n/
    ├── run-tests.sh            # n8n Execute Command çalıştırıcısı (JSON özet basar)
    └── getmobil-workflow.json  # içe aktarılabilir örnek workflow
```

**POM prensibi:** Testler seçici (selector) içermez; sadece sayfa nesnelerinin metotlarını çağırır. Site arayüzü değişince yalnızca ilgili `Page`/`Component` sınıfı güncellenir.

## Kurulum & Çalıştırma

```bash
cd getmobil
npm install
npm run install:browsers      # chromium + firefox + webkit indirir

npm test                      # tüm projeler
npm run test:smoke            # sadece @smoke
npm run test:desktop          # chromium + firefox + webkit (tüm testler)
npm run test:mobile           # mobile-chrome + mobile-safari (@smoke)
npm run test:parallel         # 6 worker ile paralel
npm run test:headed           # tarayıcı görünür
npm run report                # son HTML raporu aç
```

### Multi-browser & paralel
Proje matrisi (`playwright.config.ts`):

| Proje | Motor | Kapsam |
|-------|-------|--------|
| `chromium` | Chromium | tüm testler |
| `firefox` | Firefox | tüm testler |
| `webkit` | WebKit (Safari) | tüm testler |
| `mobile-chrome` | Chromium (Pixel 7) | `@smoke` |
| `mobile-safari` | WebKit (iPhone 13) | `@smoke` |

```bash
npx playwright test --project=chromium --project=firefox   # seçili tarayıcılar
WORKERS=8 npx playwright test                              # 8 paralel worker
```
Testler `fullyParallel` çalışır. Ortam değişkenleri: `BASE_URL`, `HEADLESS=false`, `CI=true`, `WORKERS=<n>`, `FULLY_PARALLEL=false`.

## n8n Entegrasyonu → ayrı repo

Çalıştırma/orkestrasyon (n8n runner, workflow, Docker, zamanlama, bildirim) bilinçli olarak bu repoda **değildir**; ayrı bir harness projesindedir:

- **`getmobil-harness`** — bu test suite'ini yol (`E2E_DIR`) üzerinden çağırır, sonucu tek satır JSON özete indirger ve n8n workflow'unu sağlar.

Bu repo saf test suite olarak kalır; yalnızca `reports/results.json` üretir (harness bunu okur). Kurulum ve n8n adımları için harness README'sine bakın.

## Raporlar
Her çalıştırma dört katmanlı rapor üretir:

| Rapor | Konum | Açma |
|-------|-------|------|
| JSON özet | `reports/results.json` | harness/n8n parse eder |
| Playwright HTML | `reports/html/` | `npm run report` |
| Allure (ham) | `reports/allure-results/` | aşağıdaki komutla |
| Allure HTML | `reports/allure/` | `npm run report:allure` |

```bash
npm run report            # Playwright yerleşik HTML raporu
npm run report:allure     # Allure raporu üret + aç (Java gerekir)
```
> **Allure** için Java çalışma zamanı gerekir: `brew install openjdk` (macOS). Harness dashboard'undan tek tıkla üretip açabilirsiniz (bkz. harness README).

Başarısızlıklarda otomatik ekran görüntüsü + video + trace (`test-results/`) eklenir.
