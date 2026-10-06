'use strict';
// Local preview with a read-only attendance CSV API. No database or AWS connection.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readAttendanceCsv } = require('./lib/attendance-csv');
const root = path.join(__dirname, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const defaultCsv = path.join(__dirname, 'campus-attendance-2026-10-06.csv');

function createServer({ csvFile = process.env.ATTENDANCE_CSV || defaultCsv } = {}) {
  return http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'");
  const json = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
  };
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  try {
    const url = new URL(req.url, 'http://localhost');
    const requested = decodeURIComponent(url.pathname);
    if (requested === '/api/health') return json(200, { status: 'ok' });
    if (requested === '/api/attendance') {
      let text;
      try { text = await fs.readFile(csvFile, 'utf8'); }
      catch (error) {
        return json(error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'Attendance CSV not found. Check ATTENDANCE_CSV on the server.' : 'The server could not read the attendance CSV.' });
      }
      try { return json(200, { source: path.basename(csvFile), rows: readAttendanceCsv(text) }); }
      catch (error) { return json(422, { error: error.message }); }
    }
    if (requested.startsWith('/api/')) return json(404, { error: 'API route not found.' });
    const file = path.resolve(root, '.' + (requested === '/' ? '/index.html' : requested));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400);
    res.end('Page not found');
  }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other server or set PORT to a free port.` : `Could not start the server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, host, () => console.log(`Campus preview: http://${host}:${server.address().port}`));
}

module.exports = { createServer };
