#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const HARNESS_DIR = resolve(here, '..');
const SCRIPT = resolve(HARNESS_DIR, 'k6', 'load-test.js');
const SUMMARY = resolve(HARNESS_DIR, 'k6-summary.json');

/**
 * k6 yük testini çalıştırır ve makine-dostu özet döner.
 *
 * Seçenekler (ortam/CLI):
 *   BASE_URL, VUS, DURATION, PROFILE (smoke|load|stress)
 */
export async function runK6(opts = {}) {
  if (!hasK6()) {
    return {
      ok: false,
      error: 'k6 kurulu değil. Kurulum: brew install k6  (veya https://k6.io/docs/get-started/installation)',
    };
  }

  const env = { ...process.env };
  if (opts.baseUrl) env.BASE_URL = opts.baseUrl;
  if (opts.vus) env.VUS = String(opts.vus);
  if (opts.duration) env.DURATION = opts.duration;
  if (opts.profile) env.PROFILE = opts.profile;

  const exit = await run('k6', ['run', SCRIPT], { cwd: HARNESS_DIR, env });

  if (!existsSync(SUMMARY)) {
    return { ok: false, error: 'k6 özeti üretilemedi', exitCode: exit };
  }
  return summarizeK6(SUMMARY, exit);
}

export function summarizeK6(summaryPath, exitCode = 0) {
  const data = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const m = data.metrics ?? {};
  const val = (name, field) => m[name]?.values?.[field] ?? null;

  const httpFailRate = val('http_req_failed', 'rate');
  // Eşik ihlali olduğunda k6 çıkış kodu 99 döner
  const thresholdsPassed = exitCode === 0;

  return {
    ok: thresholdsPassed,
    tool: 'k6',
    requests: val('http_reqs', 'count'),
    rps: val('http_reqs', 'rate'),
    avgMs: round(val('http_req_duration', 'avg')),
    p95Ms: round(val('http_req_duration', 'p(95)')),
    p99Ms: round(val('http_req_duration', 'p(99)')),
    maxMs: round(val('http_req_duration', 'max')),
    failRate: httpFailRate,
    checksPassed: val('checks', 'passes'),
    checksFailed: val('checks', 'fails'),
    thresholdsPassed,
    summaryPath,
  };
}

function hasK6() {
  const r = spawnSync('k6', ['version'], { stdio: 'ignore' });
  return r.status === 0;
}

function run(cmd, args, opts) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 2, 2] });
    child.on('close', (code) => res(code ?? 0));
    child.on('error', () => res(1));
  });
}

function round(n) {
  return n == null ? null : Math.round(n);
}

// Doğrudan çalıştırma: node src/k6.mjs [--profile load] [--vus 10] [--duration 30s]
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const get = (k) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const summary = await runK6({
    profile: get('profile'),
    vus: get('vus'),
    duration: get('duration'),
    baseUrl: process.env.BASE_URL,
  });
  process.stdout.write(JSON.stringify(summary) + '\n');
  process.exit(summary.ok ? 0 : 1);
}
