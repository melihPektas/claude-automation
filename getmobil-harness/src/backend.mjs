#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUnitTap } from './quality.mjs';
import { writeBackendReport, BACKEND_REPORT_DIR, LOCUST_HTML } from './backend-report.mjs';

export { BACKEND_REPORT_DIR };

const here = fileURLToPath(new URL('.', import.meta.url));
const HARNESS_DIR = resolve(here, '..');
const WIREMOCK_DIR = resolve(HARNESS_DIR, 'backend', 'wiremock');
const WIREMOCK_JAR = resolve(WIREMOCK_DIR, 'wiremock.jar');
export const WIREMOCK_URL = process.env.WIREMOCK_URL ?? 'http://localhost:8089';

export const API_OUT = resolve(HARNESS_DIR, 'reports', 'api.json');
const API_EXCHANGES = resolve(HARNESS_DIR, 'reports', 'api-exchanges.json');
export const LOCUST_OUT = resolve(HARNESS_DIR, 'reports', 'locust.json');
export const PACT_OUT = resolve(HARNESS_DIR, 'reports', 'pact.json');

// Java: brew openjdk keg-only olduğundan PATH'e eklenir
const ENV = {
  ...process.env,
  PATH: `/opt/homebrew/opt/openjdk/bin:/opt/homebrew/bin:/usr/local/opt/openjdk/bin:${process.env.PATH}`,
};

// ---------- WireMock yaşam döngüsü ----------

export async function wiremockStatus() {
  try {
    const res = await fetch(`${WIREMOCK_URL}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const WIREMOCK_DL =
  'https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/3.9.1/wiremock-standalone-3.9.1.jar';

/** WireMock'u arka planda başlatır (zaten ayaktaysa dokunmaz) ve hazır olmasını bekler.
 *  Jar dosyası yoksa Maven Central'dan otomatik indirir (~17MB, repoya konmaz). */
export async function wiremockStart() {
  if (await wiremockStatus()) return { ok: true, alreadyRunning: true, url: WIREMOCK_URL };
  if (!existsSync(WIREMOCK_JAR)) {
    process.stderr.write('[backend] wiremock.jar indiriliyor (~17MB)…\n');
    const dl = await sh(`curl -sL -o "${WIREMOCK_JAR}" "${WIREMOCK_DL}"`);
    if (dl.code !== 0 || !existsSync(WIREMOCK_JAR)) {
      return { ok: false, error: 'wiremock.jar indirilemedi' };
    }
  }
  const port = new URL(WIREMOCK_URL).port || '8089';
  const child = spawn(
    'java',
    ['-jar', WIREMOCK_JAR, '--port', port, '--global-response-templating', '--root-dir', WIREMOCK_DIR],
    { cwd: WIREMOCK_DIR, env: ENV, detached: true, stdio: 'ignore' },
  );
  child.unref();
  // hazır olana dek bekle (maks ~15sn)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await wiremockStatus()) return { ok: true, started: true, pid: child.pid, url: WIREMOCK_URL };
  }
  return { ok: false, error: 'WireMock 15sn içinde hazır olmadı (Java kurulu mu?)' };
}

export async function wiremockStop() {
  try {
    await fetch(`${WIREMOCK_URL}/__admin/shutdown`, { method: 'POST', signal: AbortSignal.timeout(3000) });
    return { ok: true, stopped: true };
  } catch {
    return { ok: false, error: 'kapatılamadı (zaten kapalı olabilir)' };
  }
}

// ---------- API testleri (node:test + fetch) ----------

export async function runApiTests() {
  const wm = await wiremockStart();
  if (!wm.ok) return { ok: false, error: wm.error };
  const { code, out } = await sh('node --test --test-reporter=tap backend/api-tests/*.api.test.mjs');
  const summary = { ...parseUnitTap(out, code), tool: 'node:test + fetch', target: WIREMOCK_URL };
  // Testlerin kaydettiği istek/yanıt çiftlerini ilgili teste iliştir (UI hover görünümü)
  summary.tests = attachExchanges(summary.tests, readJsonSafe(API_EXCHANGES) ?? {});
  writeReport(API_OUT, summary);
  refreshBackendReport();
  return summary;
}

/** Test listesine, başlık eşleşmesiyle istek/yanıt kayıtlarını iliştirir (saf, test edilir). */
export function attachExchanges(tests, exchanges) {
  return (tests ?? []).map((t) => ({ ...t, exchanges: exchanges[t.title] ?? [] }));
}

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ---------- Locust yük testi ----------

export async function runLocust({ users = 10, spawnRate = 5, duration = '15s' } = {}) {
  const wm = await wiremockStart();
  if (!wm.ok) return { ok: false, error: wm.error };
  mkdirSync(BACKEND_REPORT_DIR, { recursive: true });
  // --html: Locust'un grafikli (RPS/yanıt süresi zaman serili) native raporu
  const { code, out } = await sh(
    `locust -f backend/locustfile.py --headless -u ${Number(users)} -r ${Number(spawnRate)} ` +
      `-t ${String(duration)} --host ${WIREMOCK_URL} --json --html "${LOCUST_HTML}"`,
  );
  const summary = summarizeLocust(out, code, { users, duration });
  writeReport(LOCUST_OUT, summary);
  refreshBackendReport();
  return summary;
}

/** Locust --json çıktısını (endpoint istatistik dizisi) düz özete indirger. */
export function summarizeLocust(out, exitCode = 0, meta = {}) {
  // stdout'ta JSON dizisini bul (log satırları stderr'de ama garanti değil)
  const start = out.indexOf('[');
  const end = out.lastIndexOf(']');
  if (start < 0 || end <= start) return { ok: false, tool: 'locust', error: 'locust JSON çıktısı bulunamadı' };
  let stats;
  try {
    stats = JSON.parse(out.slice(start, end + 1));
  } catch {
    return { ok: false, tool: 'locust', error: 'locust JSON ayrıştırılamadı' };
  }

  let requests = 0;
  let failures = 0;
  let totalTime = 0;
  let maxMs = 0;
  const endpoints = [];
  for (const s of stats) {
    requests += s.num_requests;
    failures += s.num_failures;
    totalTime += s.total_response_time;
    maxMs = Math.max(maxMs, s.max_response_time ?? 0);
    endpoints.push({
      name: s.name,
      method: s.method,
      requests: s.num_requests,
      failures: s.num_failures,
      avgMs: s.num_requests ? Math.round(s.total_response_time / s.num_requests) : null,
      p95Ms: percentileFromHistogram(s.response_times, s.num_requests, 0.95),
    });
  }
  const failRate = requests ? failures / requests : 0;
  return {
    ok: exitCode === 0 && failRate < 0.05,
    tool: 'locust',
    users: meta.users ?? null,
    duration: meta.duration ?? null,
    requests,
    failures,
    failRate,
    avgMs: requests ? Math.round(totalTime / requests) : null,
    maxMs: Math.round(maxMs),
    endpoints,
  };
}

/** Locust response_times histogramından ({yuvarlanmışMs: adet}) yüzdelik hesaplar. */
function percentileFromHistogram(hist, total, p) {
  if (!hist || !total) return null;
  const entries = Object.entries(hist)
    .map(([ms, n]) => [Number(ms), n])
    .sort((a, b) => a[0] - b[0]);
  const target = Math.ceil(total * p);
  let cum = 0;
  for (const [ms, n] of entries) {
    cum += n;
    if (cum >= target) return ms;
  }
  return entries.length ? entries[entries.length - 1][0] : null;
}

// ---------- Pact contract testleri ----------

export async function runPact() {
  const wm = await wiremockStart();
  if (!wm.ok) return { ok: false, error: wm.error };

  // 1) Consumer: kontratı üret
  const consumer = await sh('node --test --test-reporter=tap backend/pact/consumer.test.mjs');
  const consumerSummary = parseUnitTap(consumer.out, consumer.code);

  // 2) Provider: kontratı WireMock'a karşı doğrula
  let providerSummary = { ok: false, error: 'consumer başarısız, doğrulama atlandı' };
  if (consumerSummary.ok) {
    const verify = await sh('node backend/pact/verify.mjs');
    const lastLine = verify.out.trim().split('\n').filter((l) => l.trim().startsWith('{')).pop();
    try {
      providerSummary = JSON.parse(lastLine ?? '{}');
    } catch {
      providerSummary = { ok: verify.code === 0 };
    }
  }

  const summary = {
    ok: consumerSummary.ok && providerSummary.ok,
    tool: 'pact',
    consumer: { name: 'getmobil-dashboard', ...pick(consumerSummary, ['total', 'passed', 'failed']) },
    provider: { name: 'getmobil-api', verified: providerSummary.ok, url: WIREMOCK_URL, error: providerSummary.error },
    interactions: consumerSummary.tests?.map((t) => ({ title: t.title, status: t.status })) ?? [],
  };
  writeReport(PACT_OUT, summary);
  refreshBackendReport();
  return summary;
}

// ---------- yardımcılar ----------

/** Birleşik Backend HTML raporunu (reports/backend/index.html) tazeler. */
function refreshBackendReport() {
  try {
    writeBackendReport({ apiPath: API_OUT, locustPath: LOCUST_OUT, pactPath: PACT_OUT });
  } catch (err) {
    process.stderr.write(`[backend] rapor üretilemedi: ${err.message}\n`);
  }
}

/** Komutu koşar; stdout'u AYRI döndürür (JSON/TAP ayrıştırma için), her şeyi stderr'e yansıtır. */
function sh(command) {
  return new Promise((res) => {
    let out = '';
    const child = spawn(command, { cwd: HARNESS_DIR, shell: true, env: ENV });
    child.stdout.on('data', (d) => {
      out += d;
      process.stderr.write(d);
    });
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('close', (code) => res({ code: code ?? 0, out }));
    child.on('error', () => res({ code: 1, out }));
  });
}

function writeReport(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2));
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const arg = (k) => {
    const i = process.argv.indexOf(`--${k}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  const done = (s) => {
    emit(s);
    process.exit(s.ok ? 0 : 1);
  };

  if (cmd === 'api') done(await runApiTests());
  else if (cmd === 'locust')
    done(await runLocust({ users: arg('users'), spawnRate: arg('rate'), duration: arg('duration') }));
  else if (cmd === 'pact') done(await runPact());
  else if (cmd === 'wiremock-start') done(await wiremockStart());
  else if (cmd === 'wiremock-stop') done(await wiremockStop());
  else if (cmd === 'wiremock-status') emit({ running: await wiremockStatus(), url: WIREMOCK_URL });
  else if (cmd === 'report') {
    const path = writeBackendReport({ apiPath: API_OUT, locustPath: LOCUST_OUT, pactPath: PACT_OUT });
    emit({ ok: true, report: path });
  } else {
    process.stderr.write('kullanım: node src/backend.mjs <api|locust|pact|report|wiremock-start|wiremock-stop|wiremock-status>\n');
    process.exit(2);
  }
}
