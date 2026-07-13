import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.mjs';
import { buildPlaywrightArgs } from '../src/run.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const E2E = resolve(here, 'fixtures', 'fake-e2e');

/**
 * INTEGRATION: CLI argümanı → config.mjs → run.mjs zinciri.
 * Kullanıcının verdiği argümanların son Playwright komutuna doğru dönüştüğünü
 * uçtan uca doğrular (iki modül birlikte).
 */
function cliToArgs(extra) {
  const cfg = loadConfig(['--e2e-dir', E2E, ...extra]);
  return buildPlaywrightArgs(cfg);
}

// Tüm anlamlı kombinasyonları üret (browsers × grep × workers)
const browserSets = [
  { flag: [], projects: [] },
  { flag: ['--browsers', 'chromium'], projects: ['chromium'] },
  { flag: ['--browsers', 'chromium,firefox'], projects: ['chromium', 'firefox'] },
  { flag: ['--browsers', 'chromium,firefox,webkit'], projects: ['chromium', 'firefox', 'webkit'] },
  { flag: ['--project', 'webkit'], projects: ['webkit'] },
];
const grepSets = [
  { flag: [], grep: null },
  { flag: ['--grep', '@smoke'], grep: '@smoke' },
];
const workerSets = [
  { flag: [], workers: null },
  { flag: ['--workers', '4'], workers: '4' },
];

for (const b of browserSets) {
  for (const g of grepSets) {
    for (const w of workerSets) {
      const label = `browsers=[${b.projects}] grep=${g.grep} workers=${w.workers}`;
      test(`cli→args: ${label}`, () => {
        const args = cliToArgs([...b.flag, ...g.flag, ...w.flag]);
        // temel iskelet
        assert.equal(args[0], 'playwright');
        assert.equal(args[1], 'test');
        // grep
        if (g.grep) assert.ok(args.includes('--grep') && args.includes(g.grep));
        else assert.ok(!args.includes('--grep'));
        // her proje --project ile yer almalı
        assert.equal(args.filter((a) => a === '--project').length, b.projects.length);
        for (const p of b.projects) assert.ok(args.includes(p), `${p} bekleniyordu`);
        // workers
        if (w.workers) assert.ok(args.includes('--workers') && args.includes(w.workers));
        else assert.ok(!args.includes('--workers'));
      });
    }
  }
}

test('cli→args: --browsers --project üzerinde önceliklidir', () => {
  const args = cliToArgs(['--browsers', 'chromium,firefox', '--project', 'webkit']);
  assert.ok(args.includes('chromium') && args.includes('firefox'));
  assert.ok(!args.includes('webkit'));
});

// --- Ek zincir senaryoları (piramit tabanını korumak için genişletilmiş kapsam) ---
const chainCases = [
  { argv: ['--grep', '@smoke', '--browsers', 'chromium'], hasGrep: true, projects: 1 },
  { argv: ['--browsers', 'firefox,webkit'], hasGrep: false, projects: 2 },
  { argv: ['--workers', '2', '--browsers', 'chromium'], hasGrep: false, projects: 1 },
  { argv: ['--grep', '@smoke', '--workers', '4'], hasGrep: true, projects: 0 },
  { argv: ['--browsers', 'chromium,firefox,webkit', '--grep', '@smoke', '--workers', '6'], hasGrep: true, projects: 3 },
  { argv: [], hasGrep: false, projects: 0 },
  { argv: ['--project', 'mobile-chrome'], hasGrep: false, projects: 1 },
  { argv: ['--project', 'mobile-safari', '--grep', '@smoke'], hasGrep: true, projects: 1 },
];
for (const c of chainCases) {
  test(`cli→args zincir kapsamı: ${JSON.stringify(c.argv)}`, () => {
    const args = cliToArgs(c.argv);
    assert.equal(args.filter((a) => a === '--project').length, c.projects);
    assert.equal(args.includes('--grep'), c.hasGrep);
    assert.equal(args[0], 'playwright');
  });
}
