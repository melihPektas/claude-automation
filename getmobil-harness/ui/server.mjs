#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { summarize } from '../src/summary.mjs';
import { summarizeK6 } from '../src/k6.mjs';
import { summarizeMutation, UNIT_OUT, INTEG_OUT, MUT_JSON } from '../src/quality.mjs';
import { wiremockStatus, wiremockStart, wiremockStop, API_OUT, LOCUST_OUT, PACT_OUT, WIREMOCK_URL, BACKEND_REPORT_DIR } from '../src/backend.mjs';

const MUT_REPORT_DIR = resolve(fileURLToPath(new URL('..', import.meta.url)), 'reports', 'mutation');

const here = fileURLToPath(new URL('.', import.meta.url));
const HARNESS_DIR = resolve(here, '..');
const PUBLIC_DIR = resolve(here, 'public');
const PORT = Number(process.env.PORT || 4321);

const cfg = loadConfig([]);
const K6_SUMMARY = resolve(HARNESS_DIR, 'k6-summary.json');
const PW_REPORT_DIR = resolve(cfg.e2eDir, 'reports', 'html');
const ALLURE_REPORT_DIR = resolve(cfg.e2eDir, 'reports', 'allure');
const ALLURE_RESULTS_DIR = resolve(cfg.e2eDir, 'reports', 'allure-results');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.zip': 'application/zip', '.map': 'application/json', '.txt': 'text/plain',
  '.webm': 'video/webm', '.mp4': 'video/mp4',
};

/** Aynı anda tek iş çalışır. */
let job = null; // { type, startedAt, log: string[] }

/** E2E suite'inin distinct test sayısı (playwright --list ile bir kez hesaplanır). */
let e2eSuiteCount = null;
function computeE2ECount() {
  // --reporter=line: config'in json/html reporter'larını geçersiz kıl ki
  // --list çağrısı reports/results.json'u EZMESİN.
  const child = spawn('npx', ['playwright', 'test', '--project=chromium', '--list', '--reporter=line'], {
    cwd: cfg.e2eDir,
    env: process.env,
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.on('close', () => {
    const m = out.match(/Total:\s*(\d+)\s*test/i);
    if (m) e2eSuiteCount = Number(m[1]);
  });
  child.on('error', () => {});
}
computeE2ECount();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/status') return json(res, await buildStatus());
    // Backend otomasyon
    if (url.pathname === '/api/backend/api' && req.method === 'POST') return startBackend(res, 'api', []);
    if (url.pathname === '/api/backend/locust' && req.method === 'POST') {
      const opts = await body(req);
      const args = [];
      if (opts.users) args.push('--users', String(opts.users));
      if (opts.rate) args.push('--rate', String(opts.rate));
      if (opts.duration) args.push('--duration', String(opts.duration));
      return startBackend(res, 'locust', args);
    }
    if (url.pathname === '/api/backend/pact' && req.method === 'POST') return startBackend(res, 'pact', []);
    if (url.pathname === '/api/backend/wiremock/start' && req.method === 'POST')
      return json(res, await wiremockStart());
    if (url.pathname === '/api/backend/wiremock/stop' && req.method === 'POST')
      return json(res, await wiremockStop());
    // Dinamik mock demo: WireMock'tan canlı yanıt çek (CORS'suz, sunucu üzerinden)
    if (url.pathname === '/api/backend/demo') {
      const id = Math.floor(Math.random() * 900) + 100;
      try {
        const r = await fetch(`${WIREMOCK_URL}/api/products/${id}`, { signal: AbortSignal.timeout(3000) });
        return json(res, { request: `GET /api/products/${id}`, response: await r.json() });
      } catch {
        return json(res, { error: 'WireMock ayakta değil — önce başlatın' }, 503);
      }
    }
    if (url.pathname === '/api/run' && req.method === 'POST') return startE2E(res, await body(req));
    if (url.pathname === '/api/k6' && req.method === 'POST') return startK6(res, await body(req));
    if (url.pathname === '/api/allure' && req.method === 'POST') return startAllure(res);
    if (url.pathname === '/api/pipeline' && req.method === 'POST') return startPipeline(res);
    if (url.pathname === '/api/unit' && req.method === 'POST') return startQuality(res, 'unit');
    if (url.pathname === '/api/integration' && req.method === 'POST') return startQuality(res, 'integration');
    if (url.pathname === '/api/mutation' && req.method === 'POST') return startQuality(res, 'mutation');
    if (url.pathname === '/report/mutation' || url.pathname === '/report/mutation/')
      return redirect(res, '/report/mutation/mutation.html');
    if (url.pathname.startsWith('/report/mutation/'))
      return serveFrom(MUT_REPORT_DIR, url.pathname.slice('/report/mutation/'.length), res);
    if (url.pathname === '/report/backend' || url.pathname === '/report/backend/')
      return redirect(res, '/report/backend/index.html');
    if (url.pathname.startsWith('/report/backend/'))
      return serveFrom(BACKEND_REPORT_DIR, url.pathname.slice('/report/backend/'.length), res);
    // Raporları dashboard içinden aç: /report/playwright/… ve /report/allure/…
    if (url.pathname === '/report/playwright' || url.pathname === '/report/playwright/')
      return redirect(res, '/report/playwright/index.html');
    if (url.pathname.startsWith('/report/playwright/'))
      return serveFrom(PW_REPORT_DIR, url.pathname.slice('/report/playwright/'.length), res);
    if (url.pathname === '/report/allure' || url.pathname === '/report/allure/')
      return redirect(res, '/report/allure/index.html');
    if (url.pathname.startsWith('/report/allure/'))
      return serveFrom(ALLURE_REPORT_DIR, url.pathname.slice('/report/allure/'.length), res);
    return serveStatic(url.pathname, res);
  } catch (err) {
    json(res, { error: String(err.message ?? err) }, 500);
  }
});

server.listen(PORT, () => {
  process.stdout.write(`\n  Getmobil E2E Dashboard → http://localhost:${PORT}\n`);
  process.stdout.write(`  E2E suite: ${cfg.e2eDir}\n\n`);
});

// ---- API ----

async function buildStatus() {
  return {
    job: job ? { type: job.type, startedAt: job.startedAt } : null,
    log: job ? job.log.slice(-40) : [],
    e2e: readE2E(),
    k6: readK6(),
    unit: readJson(UNIT_OUT),
    integration: readJson(INTEG_OUT),
    pyramid: buildPyramid(),
    backend: {
      wiremock: await wiremockStatus(),
      wiremockUrl: WIREMOCK_URL,
      api: readJson(API_OUT),
      locust: readJson(LOCUST_OUT),
      pact: readJson(PACT_OUT),
    },
    mutation: existsSync(MUT_JSON) ? safe(() => summarizeMutation(MUT_JSON)) : null,
    reports: {
      playwright: existsSync(resolve(PW_REPORT_DIR, 'index.html')),
      allure: existsSync(resolve(ALLURE_REPORT_DIR, 'index.html')),
      allureResults: existsSync(ALLURE_RESULTS_DIR),
      mutation: existsSync(resolve(MUT_REPORT_DIR, 'mutation.html')),
      backend: existsSync(resolve(BACKEND_REPORT_DIR, 'index.html')),
      locustHtml: existsSync(resolve(BACKEND_REPORT_DIR, 'locust.html')),
    },
    e2eDir: cfg.e2eDir,
  };
}

function startE2E(res, opts) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  const args = ['src/run.mjs'];
  if (opts.grep) args.push('--grep', opts.grep);
  if (opts.browsers) args.push('--browsers', opts.browsers);
  if (opts.workers) args.push('--workers', String(opts.workers));
  runJob('e2e', 'node', args);
  json(res, { started: true, type: 'e2e' });
}

function startK6(res, opts) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  const args = ['src/k6.mjs'];
  if (opts.profile) args.push('--profile', opts.profile);
  if (opts.vus) args.push('--vus', String(opts.vus));
  if (opts.duration) args.push('--duration', opts.duration);
  const env = { ...process.env };
  if (opts.baseUrl) env.BASE_URL = opts.baseUrl;
  runJob('k6', 'node', args, env);
  json(res, { started: true, type: 'k6' });
}

/** Backend otomasyon işini (api|locust|pact) arka planda başlatır. */
function startBackend(res, kind, args) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  runJob(`backend-${kind}`, 'node', ['src/backend.mjs', kind, ...args]);
  json(res, { started: true, type: `backend-${kind}` });
}

/** n8n workflow zincirini manuel tetikler: E2E smoke → k6 smoke (aynı pipeline.sh). */
function startPipeline(res) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  runJob('pipeline', 'bash', ['scripts/pipeline.sh']);
  json(res, { started: true, type: 'pipeline' });
}

function startQuality(res, kind) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  runJob(kind, 'node', ['src/quality.mjs', kind]);
  json(res, { started: true, type: kind });
}

function startAllure(res) {
  if (job) return json(res, { error: 'zaten çalışıyor', job: job.type }, 409);
  if (!existsSync(ALLURE_RESULTS_DIR)) {
    return json(res, { error: 'allure-results yok — önce testleri çalıştırın' }, 400);
  }
  // allure-commandline Java gerektirir; brew openjdk keg-only olduğundan PATH'e ekliyoruz
  const env = {
    ...process.env,
    PATH: `/opt/homebrew/opt/openjdk/bin:/usr/local/opt/openjdk/bin:${process.env.PATH}`,
  };
  const allureBin = resolve(cfg.e2eDir, 'node_modules', '.bin', 'allure');
  const cmd = existsSync(allureBin) ? allureBin : 'allure';
  runJob(
    'allure',
    cmd,
    ['generate', 'reports/allure-results', '--clean', '-o', 'reports/allure'],
    env,
    cfg.e2eDir,
  );
  json(res, { started: true, type: 'allure' });
}

function runJob(type, cmd, args, env = process.env, cwd = HARNESS_DIR) {
  job = { type, startedAt: new Date().toISOString(), log: [] };
  const child = spawn(cmd, args, { cwd, env });
  const capture = (buf) => {
    for (const line of buf.toString().split('\n')) {
      if (line.trim()) job.log.push(line.replace(/\x1b\[[0-9;]*m/g, ''));
    }
    if (job.log.length > 400) job.log = job.log.slice(-400);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('close', () => {
    job = null;
  });
  child.on('error', (e) => {
    if (job) job.log.push(`HATA: ${e.message}`);
    job = null;
  });
}

// ---- Rapor okuma ----

function readE2E() {
  if (!existsSync(cfg.reportPath)) return null;
  try {
    return summarize(cfg.reportPath, { htmlReport: cfg.htmlReport });
  } catch {
    return null;
  }
}

function readK6() {
  if (!existsSync(K6_SUMMARY)) return null;
  try {
    return summarizeK6(K6_SUMMARY, 0);
  } catch {
    return null;
  }
}

/** Test piramidi katman sayıları: unit > integration > e2e. */
function buildPyramid() {
  const unit = readJson(UNIT_OUT)?.total ?? null;
  const integration = readJson(INTEG_OUT)?.total ?? null;
  const e2e = e2eSuiteCount; // playwright --list ile önbelleğe alınır
  return { unit, integration, e2e };
}

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function safe(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

// ---- Yardımcılar ----

function serveStatic(pathname, res) {
  const file = resolve(PUBLIC_DIR, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(PUBLIC_DIR) || !existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'text/plain' });
  res.end(readFileSync(file));
}

/** Bir rapor kökünden (Playwright HTML / Allure) güvenli statik dosya servisi. */
function serveFrom(rootDir, relPath, res) {
  const clean = decodeURIComponent(relPath.split('?')[0]) || 'index.html';
  let file = resolve(rootDir, clean);
  if (!file.startsWith(rootDir)) return res.writeHead(403).end('forbidden');
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('rapor bulunamadı — önce oluşturun');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function json(res, obj, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function body(req) {
  return new Promise((res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        res(data ? JSON.parse(data) : {});
      } catch {
        res({});
      }
    });
  });
}
