#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { summarize } from './summary.mjs';
import { ensureE2EReady } from './setup.mjs';

/**
 * Getmobil E2E harness giriş noktası.
 *
 * - Ayrı repodaki Playwright test suite'ini (E2E_DIR) çalıştırır.
 * - Bittiğinde stdout'a TEK SATIR JSON özet basar (n8n bunu parse eder).
 * - Çıkış kodu test sonucunu yansıtır (0 = geçti, 1 = başarısız/hatalı).
 *
 * Kullanım:
 *   node src/run.mjs                     # tüm suite
 *   node src/run.mjs --grep @smoke       # yalnızca smoke
 *   node src/run.mjs --project chromium  # yalnızca chromium
 *   E2E_DIR=/path/to/getmobil node src/run.mjs
 */
async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    emit({ ok: false, error: String(err.message ?? err) });
    process.exit(1);
  }

  try {
    await ensureE2EReady(config.e2eDir);
  } catch (err) {
    emit({ ok: false, error: `kurulum başarısız: ${err.message ?? err}` });
    process.exit(1);
  }

  const args = buildPlaywrightArgs(config);

  const env = { ...process.env, CI: 'true', HEADLESS: 'true' };
  if (config.baseUrl) env.BASE_URL = config.baseUrl;

  const runExit = await run('npx', args, { cwd: config.e2eDir, env });

  if (!existsSync(config.reportPath)) {
    emit({ ok: false, error: 'rapor üretilemedi', reportPath: config.reportPath, exitCode: runExit });
    process.exit(1);
  }

  const summary = summarize(config.reportPath, { htmlReport: config.htmlReport });
  emit(summary);
  process.exit(summary.ok ? 0 : 1);
}

/**
 * Config'ten Playwright CLI argümanlarını kurar (saf fonksiyon — test edilebilir).
 */
export function buildPlaywrightArgs(config) {
  const args = ['playwright', 'test'];
  if (config.grep) args.push('--grep', config.grep);
  for (const p of config.projects ?? []) args.push('--project', p);
  if (config.workers) args.push('--workers', String(config.workers));
  return args;
}

/**
 * Alt süreci çalıştırır. Playwright'ın kendi çıktısını (fd 1 ve 2) parent'ın
 * STDERR'ine (fd 2) yönlendirir; böylece parent'ın STDOUT'u yalnızca JSON özeti içerir
 * ve n8n güvenle parse edebilir.
 */
function run(cmd, args, opts) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 2, 2] });
    child.on('close', (code) => res(code ?? 0));
    child.on('error', () => res(1));
  });
}

/** Özeti stdout'a tek satır JSON olarak basar (n8n Execute Command bunu okur). */
function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// Yalnızca doğrudan çalıştırıldığında main()'i tetikle (import edildiğinde değil)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
