import { defineConfig, devices } from '@playwright/test';

/**
 * Getmobil.com E2E - Playwright yapılandırması.
 * CI/n8n ortamlarında ortam değişkenleriyle davranış ayarlanabilir:
 *   BASE_URL   -> test edilecek temel adres (varsayılan: https://getmobil.com)
 *   HEADLESS   -> "false" ile tarayıcıyı görünür çalıştır
 *   CI=true    -> yeniden deneme aç
 *   WORKERS    -> paralel worker sayısı (ör. 4). Boşsa: CI'de 4, yerelde otomatik
 *   FULLY_PARALLEL -> "false" ile dosya-içi paralelliği kapat
 */
const BASE_URL = process.env.BASE_URL ?? 'https://getmobil.com';
const isCI = !!process.env.CI;
const WORKERS = process.env.WORKERS ? Number(process.env.WORKERS) : isCI ? 4 : undefined;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: process.env.FULLY_PARALLEL !== 'false',
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: WORKERS,
  timeout: 60_000,
  expect: { timeout: 15_000 },

  // Çok katmanlı raporlama:
  //  - list  : terminal
  //  - json  : harness'ın okuduğu makine-dostu özet (reports/results.json)
  //  - html  : Playwright'ın yerleşik HTML raporu (reports/html)
  //  - allure: zengin Allure raporu için ham sonuçlar (reports/allure-results)
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/results.json' }],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['allure-playwright', { resultsDir: 'reports/allure-results', detail: true }],
    ['./reporters/steps-reporter.ts'],
  ],

  use: {
    baseURL: BASE_URL,
    headless: process.env.HEADLESS !== 'false',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    viewport: { width: 1366, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },

  // Multi-browser matrisi. Belirli tarayıcıları koşmak için:
  //   npx playwright test --project=chromium --project=firefox
  // Masaüstü tarayıcılar tüm suite'i, mobil projeler yalnızca @smoke'u koşar
  // (mobilde nav/giriş hamburger menüdedir).
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      // Chromium tabanlı mobil emülasyon (ekstra indirme gerektirmez)
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      grep: /@smoke/,
    },
    {
      // WebKit tabanlı mobil (gerçek iOS Safari davranışı)
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      grep: /@smoke/,
    },
  ],
});
