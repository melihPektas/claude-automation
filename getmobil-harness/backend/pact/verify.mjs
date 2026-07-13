#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import pact from '@pact-foundation/pact';

const { Verifier } = pact;
const here = fileURLToPath(new URL('.', import.meta.url));

/**
 * PACT PROVIDER doğrulaması — consumer.test.mjs'in ürettiği kontratı
 * gerçek mock sağlayıcıya (WireMock, :8089) karşı doğrular.
 * Sağlayıcı kontrata uymuyorsa (alan eksik/yanlış tip) burada patlar.
 */
const PROVIDER_URL = process.env.WIREMOCK_URL ?? 'http://localhost:8089';
const PACT_FILE = resolve(here, 'pacts', 'getmobil-dashboard-getmobil-api.json');

if (!existsSync(PACT_FILE)) {
  process.stdout.write(JSON.stringify({ ok: false, error: 'pact dosyası yok — önce consumer testini çalıştırın' }) + '\n');
  process.exit(1);
}

const health = await fetch(`${PROVIDER_URL}/api/health`).catch(() => null);
if (!health || !health.ok) {
  process.stdout.write(JSON.stringify({ ok: false, error: `sağlayıcı (WireMock) ayakta değil: ${PROVIDER_URL}` }) + '\n');
  process.exit(1);
}

try {
  const output = await new Verifier({
    provider: 'getmobil-api',
    providerBaseUrl: PROVIDER_URL,
    pactUrls: [PACT_FILE],
    logLevel: 'error',
  }).verifyProvider();

  process.stdout.write(
    JSON.stringify({
      ok: true,
      consumer: 'getmobil-dashboard',
      provider: 'getmobil-api',
      providerUrl: PROVIDER_URL,
      pactFile: PACT_FILE,
      detail: String(output).slice(0, 200),
    }) + '\n',
  );
} catch (err) {
  process.stdout.write(
    JSON.stringify({ ok: false, error: String(err.message ?? err).slice(0, 500) }) + '\n',
  );
  process.exit(1);
}
