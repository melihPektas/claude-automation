import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const HARNESS_DIR = resolve(here, '..');
export const BACKEND_REPORT_DIR = resolve(HARNESS_DIR, 'reports', 'backend');
export const BACKEND_REPORT_HTML = resolve(BACKEND_REPORT_DIR, 'index.html');
export const LOCUST_HTML = resolve(BACKEND_REPORT_DIR, 'locust.html');

/**
 * reports/{api,locust,pact}.json dosyalarından tek parça (self-contained)
 * bir Backend Test Raporu HTML'i üretir: reports/backend/index.html.
 * Her backend koşusundan sonra çağrılır — rapor daima günceldir.
 */
export function writeBackendReport({ apiPath, locustPath, pactPath, outPath = BACKEND_REPORT_HTML }) {
  const api = readJson(apiPath);
  const locust = readJson(locustPath);
  const pact = readJson(pactPath);
  mkdirSync(resolve(outPath, '..'), { recursive: true });
  writeFileSync(outPath, render({ api, locust, pact }));
  return outPath;
}

function readJson(p) {
  if (!p || !existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const badge = (ok) =>
  ok == null
    ? '<span class="b muted">çalıştırılmadı</span>'
    : ok
      ? '<span class="b ok">BAŞARILI</span>'
      : '<span class="b fail">BAŞARISIZ</span>';

function render({ api, locust, pact }) {
  const now = new Date().toLocaleString('tr-TR');

  const apiRows = (api?.tests ?? [])
    .map(
      (t) => `<tr><td>${esc(t.title)}</td>
        <td class="${t.status === 'passed' ? 'ok' : 'fail'}">${t.status === 'passed' ? '✓ GEÇTİ' : '✗ KALDI'}</td></tr>`,
    )
    .join('');

  const locustRows = (locust?.endpoints ?? [])
    .map(
      (e) => `<tr><td><b>${esc(e.method)}</b> ${esc(e.name.replace(e.method + ' ', ''))}</td>
        <td>${e.requests}</td><td>${e.failures}</td><td>${e.avgMs ?? '–'} ms</td><td>${e.p95Ms ?? '–'} ms</td></tr>`,
    )
    .join('');

  const pactRows = (pact?.interactions ?? [])
    .map(
      (i) => `<tr><td>${esc(i.title.replace('kontrat: ', ''))}</td>
        <td class="${i.status === 'passed' ? 'ok' : 'fail'}">${i.status === 'passed' ? '✓' : '✗'}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Backend Test Raporu — Getmobil</title>
<style>
  :root{--bg:#0d1117;--card:#161b22;--b2:#1c2330;--border:#2a3240;--text:#e6edf3;--muted:#8b98a9;
    --accent:#ff5a1f;--green:#3fb950;--red:#f85149;--blue:#58a6ff}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:28px}
  .wrap{max-width:960px;margin:0 auto}
  h1{font-size:20px;display:flex;align-items:center;gap:10px;margin:0 0 4px}
  .logo{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),#ff7a45);color:#fff;font-weight:800}
  .sub{color:var(--muted);font-size:12px;margin-bottom:22px}
  section{background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:18px;overflow:hidden}
  section>h2{margin:0;padding:14px 18px;font-size:15px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
  section>h2 .b{margin-left:auto}
  .body{padding:16px 18px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px}
  .c{background:var(--b2);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
  .c .n{font-size:22px;font-weight:800}.c .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:3px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)}
  th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.4px}
  .ok{color:var(--green);font-weight:700}.fail{color:var(--red);font-weight:700}
  .b{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}
  .b.ok{background:rgba(63,185,80,.15);color:var(--green)}.b.fail{background:rgba(248,81,73,.15);color:var(--red)}
  .b.muted{background:var(--b2);color:var(--muted)}
  .note{color:var(--muted);font-size:12px;margin:8px 0 0}
  .foot{text-align:center;color:var(--muted);font-size:11px;padding:8px 0 4px}
  .g{color:var(--green)}.r{color:var(--red)}.bl{color:var(--blue)}
</style></head><body><div class="wrap">
<h1><span class="logo">G</span> Backend Test Raporu <span style="color:var(--muted);font-weight:400;font-size:13px">WireMock mock API</span></h1>
<div class="sub">Oluşturma: ${now} · hedef: ${esc(api?.target ?? locust?.users != null ? 'http://localhost:8089' : '—')}</div>

<section>
  <h2>🧪 API Testleri <span style="color:var(--muted);font-size:12px;font-weight:400">GET · POST · PUT · PATCH · DELETE</span> ${badge(api?.ok)}</h2>
  <div class="body">
    ${
      api
        ? `<div class="cards">
            <div class="c"><div class="n">${api.total}</div><div class="l">Toplam</div></div>
            <div class="c"><div class="n g">${api.passed}</div><div class="l">Geçti</div></div>
            <div class="c"><div class="n r">${api.failed}</div><div class="l">Kaldı</div></div>
            <div class="c"><div class="n bl">${api.durationMs ? Math.round(api.durationMs) + 'ms' : '–'}</div><div class="l">Süre</div></div>
          </div>
          <table><thead><tr><th>Test</th><th>Durum</th></tr></thead><tbody>${apiRows}</tbody></table>`
        : '<div class="note">Henüz çalıştırılmadı.</div>'
    }
  </div>
</section>

<section>
  <h2>🦗 Locust Yük Testi ${badge(locust?.ok)}</h2>
  <div class="body">
    ${
      locust && !locust.error
        ? `<div class="cards">
            <div class="c"><div class="n">${locust.requests}</div><div class="l">İstek</div></div>
            <div class="c"><div class="n ${locust.failRate > 0 ? 'r' : 'g'}">${(locust.failRate * 100).toFixed(1)}%</div><div class="l">Hata</div></div>
            <div class="c"><div class="n bl">${locust.avgMs}ms</div><div class="l">Ort.</div></div>
            <div class="c"><div class="n">${locust.maxMs}ms</div><div class="l">Maks</div></div>
            <div class="c"><div class="n">${locust.users ?? '–'}</div><div class="l">Kullanıcı</div></div>
            <div class="c"><div class="n">${locust.duration ?? '–'}</div><div class="l">Süre</div></div>
          </div>
          <table><thead><tr><th>Endpoint</th><th>İstek</th><th>Hata</th><th>Ort.</th><th>p95</th></tr></thead><tbody>${locustRows}</tbody></table>
          <div class="note">Grafikli ayrıntılı rapor: <a href="./locust.html" style="color:var(--blue)">locust.html</a></div>`
        : '<div class="note">Henüz çalıştırılmadı.</div>'
    }
  </div>
</section>

<section>
  <h2>🤝 Pact Contract Testi ${badge(pact?.ok)}</h2>
  <div class="body">
    ${
      pact && !pact.error
        ? `<div class="cards">
            <div class="c"><div class="n ${pact.consumer?.failed === 0 ? 'g' : 'r'}">${pact.consumer?.passed}/${pact.consumer?.total}</div><div class="l">Consumer (kontrat)</div></div>
            <div class="c"><div class="n ${pact.provider?.verified ? 'g' : 'r'}">${pact.provider?.verified ? '✓' : '✗'}</div><div class="l">Provider doğrulama</div></div>
          </div>
          <table><thead><tr><th>Etkileşim</th><th>Durum</th></tr></thead><tbody>${pactRows}</tbody></table>
          <div class="note">Consumer: <b>${esc(pact.consumer?.name ?? '')}</b> → Provider: <b>${esc(pact.provider?.name ?? '')}</b> (${esc(pact.provider?.url ?? '')})</div>`
        : '<div class="note">Henüz çalıştırılmadı.</div>'
    }
  </div>
</section>

<div class="foot">Getmobil Harness · Backend Otomasyon Raporu</div>
</div></body></html>`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
