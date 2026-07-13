import { existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * Harness yapılandırmasını ortam değişkenleri + CLI argümanlarından çözer.
 *
 * Ortam değişkenleri:
 *   E2E_DIR    -> Playwright test suite'inin (getmobil-e2e) yolu.
 *                 Varsayılan: ../getmobil (harness'ın kardeşi)
 *   BASE_URL   -> test edilecek adres (test suite'e iletilir)
 *
 * CLI argümanları:
 *   --grep <ifade>       -> yalnızca eşleşen testler (ör. "@smoke")
 *   --project <ad>       -> tek proje
 *   --browsers a,b,c     -> birden çok proje (ör. chromium,firefox,webkit)
 *   --workers <n>        -> paralel worker sayısı
 *   --e2e-dir <yol>      -> E2E_DIR'i geçersiz kılar
 */
export function loadConfig(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  const rawDir =
    args['e2e-dir'] ?? process.env.E2E_DIR ?? resolve(here, '..', '..', 'getmobil');
  const e2eDir = isAbsolute(rawDir) ? rawDir : resolve(process.cwd(), rawDir);

  if (!existsSync(resolve(e2eDir, 'package.json'))) {
    throw new Error(
      `E2E test suite bulunamadı: ${e2eDir}\n` +
        `E2E_DIR ortam değişkeni ya da --e2e-dir ile doğru yolu verin.`,
    );
  }

  const rawProjects = args.browsers ?? args.project ?? process.env.PROJECT ?? '';
  const projects = String(rawProjects)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    e2eDir,
    grep: args.grep ?? process.env.GREP ?? null,
    projects, // dizi; boşsa tüm projeler
    workers: args.workers ?? process.env.WORKERS ?? null,
    baseUrl: process.env.BASE_URL ?? null,
    reportPath: resolve(e2eDir, 'reports', 'results.json'),
    htmlReport: resolve(e2eDir, 'reports', 'html', 'index.html'),
  };
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}
