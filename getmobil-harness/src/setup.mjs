import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from './config.mjs';

/**
 * E2E test suite'inin çalışmaya hazır olduğundan emin olur:
 *  - node_modules kuruludur
 *  - Playwright chromium tarayıcısı indirilmiştir
 * Zaten kuruluysa hiçbir şey yapmaz (idempotent).
 */
export async function ensureE2EReady(e2eDir) {
  const hasModules = existsSync(resolve(e2eDir, 'node_modules'));
  if (!hasModules) {
    log(`E2E bağımlılıkları kuruluyor: ${e2eDir}`);
    const install = spawnSync('npm', ['ci'], { cwd: e2eDir, stdio: 'inherit' });
    if (install.status !== 0) {
      // package-lock uyumsuzsa normal install'a düş
      const alt = spawnSync('npm', ['install'], { cwd: e2eDir, stdio: 'inherit' });
      if (alt.status !== 0) throw new Error('npm install başarısız');
    }
    log('Chromium indiriliyor…');
    spawnSync('npx', ['playwright', 'install', 'chromium'], { cwd: e2eDir, stdio: 'inherit' });
  }
}

function log(msg) {
  process.stderr.write(`[harness] ${msg}\n`);
}

// Doğrudan çalıştırılırsa (npm run setup:e2e) kurulumu tetikle
if (import.meta.url === `file://${process.argv[1]}`) {
  const { e2eDir } = loadConfig();
  await ensureE2EReady(e2eDir);
  log('E2E hazır.');
}
