/**
 * EPG Proxy Server
 * Simple proxy to bypass CORS restrictions for EPG downloads
 *
 * Usage: node epg-proxy.js
 * Default port: 3001
 */

const http = require('http');
const https = require('https');
const url = require('url');
const zlib = require('zlib');

const PORT = process.env.EPG_PROXY_PORT || 3001;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse URL and get target
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  console.log(`[EPG Proxy] Fetching: ${targetUrl}`);

  // Determine protocol
  const protocol = targetUrl.startsWith('https') ? https : http;

  // Make request to target URL
  const proxyReq = protocol.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EPG-Proxy/1.0)',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate'
    }
  }, (proxyRes) => {
    // Forward status code
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
      'Content-Length': proxyRes.headers['content-length'],
      'Access-Control-Allow-Origin': '*'
    });

    // Pipe response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    console.error(`[EPG Proxy] Error: ${error.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  });

  // Timeout after 60 seconds
  proxyReq.setTimeout(60000, () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request timeout' }));
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[EPG Proxy] Running on http://127.0.0.1:${PORT}`);
  console.log(`[EPG Proxy] Usage: http://127.0.0.1:${PORT}/?url=<encoded_url>`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[EPG Proxy] Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
