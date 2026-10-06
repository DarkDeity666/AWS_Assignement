'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createServer } = require('../server');
const C = require('../public/core');

// Exercise the real app script and HTTP connection with a minimal DOM adapter.
// These checks verify generated content and interactions, not browser layout.
async function loadApp(t) {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', addEventListener(type, callback) { this[type] = callback; } });
    return elements.get(selector);
  };
  const storage = new Map([['campus-portal-v1', JSON.stringify(C.seed())]]);
  const context = vm.createContext({
    window: { PortalCore: C, addEventListener() {} },
    document: { querySelector: element, querySelectorAll: () => [], addEventListener() {} },
    location: { hash: '#overview', protocol: 'http:' },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    fetch: (url, options) => fetch(base + url, options),
    AbortSignal, setTimeout, clearTimeout, TypeError
  });
  vm.runInContext(await fs.readFile(path.join(__dirname, '../public/app.js'), 'utf8'), context);
  context.location.hash = '#csv';
  await vm.runInContext("page = 'csv'; loadCsv()", context);
  vm.runInContext('render()', context);
  return { context, element, storage };
}

test('website renders all CSV records from the HTTP API without changing saved students or attendance', async t => {
  const { context, element, storage } = await loadApp(t);
  const before = storage.get('campus-portal-v1');
  const html = element('#main').innerHTML;
  assert.match(html, /Connected: campus-attendance-2026-10-06\.csv/);
  assert.match(html, /STU-1013/);
  assert.match(html, /Alex Demo Updated/);
  assert.equal((html.match(/<td>Present<\/td>/g) || []).length, 1);
  assert.equal((html.match(/<td>Unmarked<\/td>/g) || []).length, 11);
  assert.equal((html.match(/<td>2026-10-06<\/td>/g) || []).length, 12);
  assert.equal(element('#breadcrumb').textContent, 'CSV attendance');
  assert.equal(element('#storage-status').textContent, 'Read-only CSV from local server');
  element('#csv-date').change({ target: { value: '2026-10-06' } });
  assert.match(element('#main').innerHTML, /12 records/);
  await vm.runInContext('loadCsv()', context);
  assert.equal(storage.get('campus-portal-v1'), before);
});

test('website clears stale CSV data on failure, explains file-mode limits and can retry', async t => {
  const { context, element } = await loadApp(t);
  const connectedFetch = context.fetch;
  context.fetch = async () => new Response(JSON.stringify({ error: 'Attendance CSV not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  await vm.runInContext('loadCsv()', context);
  assert.match(element('#main').innerHTML, /role="alert"/);
  assert.match(element('#main').innerHTML, /Attendance CSV not found/);
  assert.doesNotMatch(element('#main').innerHTML, /STU-1013/);
  context.fetch = async () => new Response('<html>Not found</html>', { status: 404, headers: { 'Content-Type': 'text/html' } });
  await vm.runInContext('loadCsv()', context);
  assert.match(element('#main').innerHTML, /CSV API is unavailable/);
  context.location.protocol = 'file:';
  await vm.runInContext('loadCsv()', context);
  assert.match(element('#main').innerHTML, /http:\/\/127\.0\.0\.1:4173/);
  context.location.protocol = 'http:';
  context.fetch = connectedFetch;
  await vm.runInContext('loadCsv()', context);
  assert.match(element('#main').innerHTML, /Alex Demo Updated/);
});

test('CSV view escapes source names and student names before rendering', async t => {
  const { context, element } = await loadApp(t);
  context.fetch = async () => new Response(JSON.stringify({ source: '<img src=x onerror=alert(1)>.csv', rows: [{ date: '2026-10-06', id: 'STU-1013', name: '<script>alert(1)</script>', studentStatus: 'Active', attendance: 'Present' }] }), { headers: { 'Content-Type': 'application/json' } });
  await vm.runInContext('loadCsv()', context);
  assert.doesNotMatch(element('#main').innerHTML, /<script>|<img src=x/);
  assert.match(element('#main').innerHTML, /&lt;script&gt;/);
});
