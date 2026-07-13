import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Playwright JSON raporunu (reports/results.json) makine-dostu bir özete indirger.
 * n8n'in bir sonraki node'da kolayca parse edebilmesi için düz bir nesne döner.
 * Varsa reports/steps.json'daki adım (step) ağacını her teste iliştirir.
 */
export function summarize(reportPath, { htmlReport } = {}) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const stepsByKey = loadSteps(dirname(reportPath));

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  const failures = [];
  const byProject = {};
  const tests = [];

  const bump = (proj, key) => {
    byProject[proj] ??= { passed: 0, failed: 0, skipped: 0, flaky: 0 };
    byProject[proj][key]++;
  };

  const walk = (suites = []) => {
    for (const suite of suites) {
      if (suite.suites) walk(suite.suites);
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests) {
          const proj = t.projectName || 'default';
          const durationMs = (t.results ?? []).reduce((a, r) => a + (r.duration ?? 0), 0);
          let status = 'passed';
          switch (t.status) {
            case 'expected':
              passed++;
              bump(proj, 'passed');
              break;
            case 'unexpected':
              failed++;
              status = 'failed';
              bump(proj, 'failed');
              failures.push(`${spec.title} [${proj}]`);
              break;
            case 'flaky':
              passed++;
              flaky++;
              status = 'flaky';
              bump(proj, 'flaky');
              break;
            case 'skipped':
              skipped++;
              status = 'skipped';
              bump(proj, 'skipped');
              break;
          }
          const key = `${proj}::${spec.title}`;
          tests.push({ title: spec.title, project: proj, status, durationMs, steps: stepsByKey[key] ?? [] });
        }
      }
    }
  };
  walk(report.suites);

  const total = passed + failed + skipped;
  return {
    ok: failed === 0,
    total,
    passed,
    failed,
    skipped,
    flaky,
    durationMs: report.stats?.duration ?? null,
    startedAt: report.stats?.startTime ?? null,
    byProject,
    tests,
    failures,
    reportPath,
    htmlReport: htmlReport ?? null,
  };
}

/** reports/steps.json'u okuyup `${project}::${title}` anahtarıyla adım listesine indeksler. */
function loadSteps(dir) {
  const file = resolve(dir, 'steps.json');
  if (!existsSync(file)) return {};
  try {
    const arr = JSON.parse(readFileSync(file, 'utf8'));
    const map = {};
    for (const t of arr) map[`${t.project}::${t.title}`] = t.steps ?? [];
    return map;
  } catch {
    return {};
  }
}
