const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const root = __dirname;
const files = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
};

function headers(type) {
  return {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, headers('text/plain; charset=utf-8'));
    response.end('Method Not Allowed');
    return;
  }
  if (url.pathname === '/healthz') {
    response.writeHead(200, headers('application/json; charset=utf-8'));
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ ok: true }));
    return;
  }
  const entry = files[url.pathname];
  if (!entry) {
    response.writeHead(404, headers('text/plain; charset=utf-8'));
    response.end(request.method === 'HEAD' ? undefined : 'Not Found');
    return;
  }
  fs.readFile(path.join(root, entry[0]), (error, content) => {
    if (error) {
      response.writeHead(500, headers('text/plain; charset=utf-8'));
      response.end(request.method === 'HEAD' ? undefined : 'Internal Server Error');
      return;
    }
    response.writeHead(200, headers(entry[1]));
    response.end(request.method === 'HEAD' ? undefined : content);
  });
}).listen(port, host, () => console.log(`NetScope listening on http://${host}:${port}`));
