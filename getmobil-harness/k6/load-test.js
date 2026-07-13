import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

/**
 * Getmobil.com yük testi (k6).
 *
 * Ortam değişkenleri (k6 -e KEY=VALUE):
 *   BASE_URL  -> hedef adres (varsayılan: https://getmobil.com)
 *   VUS       -> eşzamanlı sanal kullanıcı sayısı (varsayılan: 10)
 *   DURATION  -> sabit yük süresi (varsayılan: 30s)
 *   PROFILE   -> "smoke" | "load" | "stress" (aşama profili)
 *
 * Çıktı: özet JSON `k6-summary.json` dosyasına yazılır (harness bunu okur).
 */
const BASE_URL = __ENV.BASE_URL || 'https://getmobil.com';
const VUS = Number(__ENV.VUS || 10);
const DURATION = __ENV.DURATION || '30s';
const PROFILE = __ENV.PROFILE || 'load';

const pageLoad = new Trend('page_load_ms', true);
const errorRate = new Rate('page_errors');

const profiles = {
  // Hızlı doğrulama: baştan 1 kullanıcı, kısa süre
  smoke: { startVUs: 1, stages: [{ duration: '12s', target: 1 }] },
  // Standart yük: kademeli artış → sabit → azalış
  load: {
    stages: [
      { duration: '20s', target: VUS },
      { duration: DURATION, target: VUS },
      { duration: '10s', target: 0 },
    ],
  },
  // Stres: yüksek kullanıcıya tırman
  stress: {
    stages: [
      { duration: '30s', target: VUS },
      { duration: '30s', target: VUS * 3 },
      { duration: '20s', target: 0 },
    ],
  },
};

export const options = {
  scenarios: {
    default: { executor: 'ramping-vus', startVUs: 0, ...profiles[PROFILE] },
  },
  thresholds: {
    http_req_duration: ['p(95)<2500'], // isteklerin %95'i 2.5sn altında
    page_errors: ['rate<0.05'], // hata oranı %5 altında
    http_req_failed: ['rate<0.05'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Statik varlıkları (görsel/font) yük ölçümünden çıkar
  discardResponseBodies: false,
};

// Test edilecek kritik sayfalar
const paths = [
  '/',
  '/satin-al/cep-telefonu/',
  '/satin-al/cep-telefonu/iphone-ios-telefonlar/apple/iphone-13/apple-iphone-13-128-gb-yildiz-isigi-837/',
  '/sikca-sorulan-sorular/',
];

export default function () {
  group('kritik sayfalar', () => {
    for (const path of paths) {
      const res = http.get(`${BASE_URL}${path}`, {
        headers: { 'Accept-Language': 'tr-TR' },
        tags: { path },
      });
      pageLoad.add(res.timings.duration);
      const ok = check(res, {
        'durum 200': (r) => r.status === 200,
        'gövde dolu': (r) => r.body && r.body.length > 500,
      });
      errorRate.add(!ok);
      sleep(1);
    }
  });
}

/** Testin sonunda hem konsola hem de harness'ın okuyacağı JSON dosyasına özet yaz. */
export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'k6-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const g = (path, field) => (m[path] && m[path].values[field] != null ? m[path].values[field] : null);
  const p95 = g('http_req_duration', 'p(95)');
  const avg = g('http_req_duration', 'avg');
  const fail = g('http_req_failed', 'rate');
  const reqs = g('http_reqs', 'count');
  return [
    '',
    '  Getmobil k6 yük testi özeti',
    `  toplam istek : ${reqs ?? '-'}`,
    `  ort. süre    : ${avg ? avg.toFixed(0) : '-'} ms`,
    `  p95 süre     : ${p95 ? p95.toFixed(0) : '-'} ms`,
    `  hata oranı   : ${fail != null ? (fail * 100).toFixed(2) : '-'} %`,
    '',
  ].join('\n');
}
