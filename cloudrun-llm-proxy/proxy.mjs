import http from 'node:http';

import { fetch, ProxyAgent } from 'undici';

const PORT = Number(process.env.PORT || 8080);
// 例: http://sakaki.<tailnet>.ts.net:11434  (tailnet 経由・公開しない)
const OLLAMA_URL = (process.env.OLLAMA_URL || '').replace(/\/+$/, '');
// この Cloud Run を保護するアプリ層トークン (Functions は Bearer で送る)
const PROXY_TOKEN = process.env.PROXY_TOKEN || '';
// tailscaled が出す HTTP プロキシ (tailnet 宛て通信を通す)
const dispatcher = new ProxyAgent(process.env.TS_HTTP_PROXY || 'http://localhost:1055');

if (!OLLAMA_URL) console.error('WARN: OLLAMA_URL is not set');

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/healthz') {
      res.writeHead(200);
      return res.end('ok');
    }
    if (PROXY_TOKEN && req.headers['authorization'] !== `Bearer ${PROXY_TOKEN}`) {
      res.writeHead(401);
      return res.end('unauthorized');
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);

    const upstream = await fetch(`${OLLAMA_URL}${req.url}`, {
      method: req.method,
      headers: { 'content-type': req.headers['content-type'] || 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      dispatcher,
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log(`llm-proxy :${PORT} -> ${OLLAMA_URL} via ${process.env.TS_HTTP_PROXY}`);
});
