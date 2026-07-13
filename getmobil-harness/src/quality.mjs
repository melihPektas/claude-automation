#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const HARNESS_DIR = resolve(here, '..');
const UNIT_OUT = resolve(HARNESS_DIR, 'reports', 'unit.json');
const INTEG_OUT = resolve(HARNESS_DIR, 'reports', 'integration.json');
const MUT_JSON = resolve(HARNESS_DIR, 'reports', 'mutation', 'mutation.json');
const MUT_HTML = resolve(HARNESS_DIR, 'reports', 'mutation', 'mutation.html');

export { UNIT_OUT, INTEG_OUT, MUT_JSON, MUT_HTML };

// ---------- Unit & Integration testler (node:test) ----------

/** Belirli glob'daki node:test dosyalarını koşar, özetler ve çıktı dosyasına yazar. */
async function runTier(glob, outFile) {
  const { code, out } = await sh(`node --test --test-reporter=tap ${glob}`);
  const summary = parseUnitTap(out, code);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(summary, null, 2));
  return summary;
}

/** Unit testler (izole saf mantık) — test/*.unit.test.mjs */
export const runUnit = () => runTier('test/*.unit.test.mjs', UNIT_OUT);

/** Integration testler (modüller + gerçek I/O) — test/*.int.test.mjs */
export const runIntegration = () => runTier('test/*.int.test.mjs', INTEG_OUT);

export function parseUnitTap(out, exitCode = 0) {
  const num = (re) => {
    const m = out.match(re);
    return m ? Number(m[1]) : null;
  };
  const tests = [];
  const seen = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/^(ok|not ok) \d+ - (.+?)(?:\s+#.*)?$/);
    if (!m) continue;
    const title = m[2].trim();
    if (title.endsWith('.mjs')) continue; // dosya-seviyesi rollup'ları atla
    seen.set(title, { title, status: m[1] === 'ok' ? 'passed' : 'failed' });
  }
  for (const t of seen.values()) tests.push(t);

  const failed = num(/# fail (\d+)/) ?? 0;
  const passed = num(/# pass (\d+)/) ?? 0;
  return {
    ok: failed === 0 && exitCode === 0,
    total: num(/# tests (\d+)/) ?? passed + failed,
    passed,
    failed,
    durationMs: num(/# duration_ms ([\d.]+)/),
    tests,
  };
}

// ---------- Mutation testler (Stryker) ----------

/** Stryker'ı çalıştırır; ardından mutation.json'u özetler. */
export async function runMutation() {
  await sh('npx stryker run');
  if (!existsSync(MUT_JSON)) return { ok: false, error: 'mutation raporu üretilemedi' };
  return summarizeMutation(MUT_JSON);
}

/** Stryker mutation-report JSON'unu skor + dosya kırılımı olan düz özete indirger. */
export function summarizeMutation(reportPath) {
  const rep = JSON.parse(readFileSync(reportPath, 'utf8'));
  const files = rep.files ?? {};
  const totals = { killed: 0, timeout: 0, survived: 0, noCoverage: 0 };
  const byFile = {};

  for (const [name, f] of Object.entries(files)) {
    const c = { killed: 0, timeout: 0, survived: 0, noCoverage: 0 };
    for (const m of f.mutants ?? []) {
      if (m.status === 'Killed') c.killed++;
      else if (m.status === 'Timeout') c.timeout++;
      else if (m.status === 'Survived') c.survived++;
      else if (m.status === 'NoCoverage') c.noCoverage++;
    }
    c.score = mutationScore(c);
    byFile[name.replace(/^.*\/(src\/)/, '$1')] = c;
    for (const k of Object.keys(totals)) totals[k] += c[k];
  }

  return {
    ok: mutationScore(totals) >= 60,
    score: mutationScore(totals),
    ...totals,
    total: totals.killed + totals.timeout + totals.survived + totals.noCoverage,
    byFile,
    htmlReport: MUT_HTML,
  };
}

/** Mutation skoru = (öldürülen + timeout) / (tespit edilen + edilemeyen) * 100 */
function mutationScore({ killed, timeout, survived, noCoverage }) {
  const detected = killed + timeout;
  const undetected = survived + noCoverage;
  const denom = detected + undetected;
  return denom === 0 ? 100 : Math.round((detected / denom) * 1000) / 10;
}

// ---------- yardımcı ----------

/** Komutu shell ile koşar; çıktıyı toplar ve canlı log için stderr'e yansıtır. */
function sh(command) {
  return new Promise((res) => {
    let out = '';
    const child = spawn(command, { cwd: HARNESS_DIR, shell: true, env: process.env });
    const cap = (d) => {
      out += d;
      process.stderr.write(d);
    };
    child.stdout.on('data', cap);
    child.stderr.on('data', cap);
    child.on('close', (code) => res({ code: code ?? 0, out }));
    child.on('error', () => res({ code: 1, out }));
  });
}

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  const emit = (o) => process.stdout.write(JSON.stringify(o) + '\n');
  if (cmd === 'unit') {
    const s = await runUnit();
    emit(s);
    process.exit(s.ok ? 0 : 1);
  } else if (cmd === 'integration') {
    const s = await runIntegration();
    emit(s);
    process.exit(s.ok ? 0 : 1);
  } else if (cmd === 'mutation') {
    const s = await runMutation();
    emit(s);
    process.exit(s.ok ? 0 : 1);
  } else {
    process.stderr.write('kullanım: node src/quality.mjs <unit|mutation>\n');
    process.exit(2);
  }
}
