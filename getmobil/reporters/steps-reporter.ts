import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
  FullResult,
} from '@playwright/test/reporter';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Özel Playwright reporter'ı: her testin adım (step) ağacını `reports/steps.json`
 * dosyasına yazar. Yerleşik JSON reporter adımları serileştirmediği için gereklidir.
 * Harness/dashboard bu dosyayı okuyarak "test adına tıkla → adım adım" görünümü sunar.
 */
const OUT = 'reports/steps.json';

// Gürültüyü azaltmak için yalnızca anlamlı adım kategorileri
const KEEP = new Set(['test.step', 'expect', 'pw:api']);

function serialize(step: TestStep): any {
  return {
    title: step.title,
    category: step.category,
    duration: step.duration,
    error: step.error?.message?.split('\n')[0],
    steps: (step.steps ?? []).filter((s) => KEEP.has(s.category)).map(serialize),
  };
}

export default class StepsReporter implements Reporter {
  private tests: any[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const path = test.titlePath(); // ['', <project>, <file>, ...describe, <title>]
    this.tests.push({
      title: test.title,
      project: path[1] ?? '',
      file: test.location.file.split('/').pop(),
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      steps: result.steps.filter((s) => KEEP.has(s.category)).map(serialize),
    });
  }

  onEnd(_result: FullResult) {
    mkdirSync(dirname(OUT), { recursive: true });
    // Aynı test birden çok kez (retry) eklenmiş olabilir; son denemeyi tut
    const latest = new Map<string, any>();
    for (const t of this.tests) latest.set(`${t.project}::${t.title}`, t);
    writeFileSync(OUT, JSON.stringify([...latest.values()], null, 2));
  }
}
