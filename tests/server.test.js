'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('../server');
const C = require('../public/core');
const header = ['Date', 'Student ID', 'Name', 'Student status', 'Attendance'];
const row = ['2026-10-06', 'STU-1013', 'Alex Demo Updated', 'Active', 'Present'];

async function start(t, options) {
  const server = createServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('server delivers website assets, a health check and every supplied CSV row', async t => {
  const base = await start(t);
  for (const [url, type] of [['/', 'text/html'], ['/app.js', 'text/javascript'], ['/core.js', 'text/javascript'], ['/styles.css', 'text/css'], ['/assets/favicon.svg', 'image/svg+xml'], ['/assets/architecture.svg', 'image/svg+xml']]) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200, url);
    assert.ok(response.headers.get('content-type').startsWith(type), url);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
    assert.ok((await response.text()).length > 0);
  }
  assert.deepEqual(await (await fetch(base + '/api/health')).json(), { status: 'ok' });
  const response = await fetch(base + '/api/attendance');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.equal(data.source, 'campus-attendance-2026-10-06.csv');
  assert.equal(data.rows.length, 12);
  assert.equal(data.rows.at(-1).id, 'STU-1013');
  const head = await fetch(base + '/api/attendance', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('CSV updates are read without restarting; missing or invalid files return actionable errors', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'campus-csv-test-'));
  const csvFile = path.join(dir, 'attendance.csv');
  t.after(async () => { await fs.rm(csvFile, { force: true }); await fs.rmdir(dir); });
  const base = await start(t, { csvFile });
  let response = await fetch(base + '/api/attendance');
  assert.equal(response.status, 404);
  assert.match((await response.json()).error, /not found/);
  await fs.writeFile(csvFile, C.csv([header, row]));
  assert.equal((await (await fetch(base + '/api/attendance')).json()).rows[0].attendance, 'Present');
  await fs.writeFile(csvFile, C.csv([header, [...row.slice(0, 4), 'Absent']]));
  assert.equal((await (await fetch(base + '/api/attendance')).json()).rows[0].attendance, 'Absent');
  await fs.writeFile(csvFile, 'Bad,headers');
  response = await fetch(base + '/api/attendance');
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Expected CSV columns/);
});

test('server rejects writes, missing routes, malformed URLs and paths outside public', async t => {
  const base = await start(t);
  for (const url of ['/api/attendance', '/']) {
    const response = await fetch(base + url, { method: 'POST', body: 'unexpected write' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
  for (const url of ['/server.js', '/package.json', '/campus-attendance-2026-10-06.csv', '/api/missing', '/not-found']) {
    assert.equal((await fetch(base + url)).status, 404, url);
  }
  for (const [url, expected] of [['/..%2fserver.js', 403], ['/%E0%A4%A', 400]]) {
    const status = await new Promise((resolve, reject) => {
      http.get(base + url, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(status, expected, url);
  }
});
