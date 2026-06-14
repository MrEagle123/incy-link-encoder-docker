import { createServer } from 'node:http';
import { encryptLink } from './index.js';

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 8080;
const MAX_BODY_BYTES = 1024 * 1024;

interface EncodeRequestBody {
  url?: unknown;
  name?: unknown;
}

function jsonResponse(statusCode: number, body: unknown): { statusCode: number; body: string } {
  return {
    statusCode,
    body: `${JSON.stringify(body)}\n`,
  };
}

function encodeFromInput(input: EncodeRequestBody): { url: string; name?: string } {
  if (typeof input.url !== 'string' || input.url.length === 0) {
    throw new TypeError('url must be a non-empty string');
  }
  if (input.name !== undefined && typeof input.name !== 'string') {
    throw new TypeError('name must be a string when provided');
  }
  return input.name ? { url: input.url, name: input.name } : { url: input.url };
}

function parsePort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return port;
}

const host = process.env.HOST || DEFAULT_HOST;
const port = parsePort(process.env.PORT);

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`);

  function send(statusCode: number, body: unknown): void {
    const response = jsonResponse(statusCode, body);
    res.writeHead(response.statusCode, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(response.body);
  }

  if (req.method === 'GET' && requestUrl.pathname === '/health') {
    send(200, { ok: true });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/encode') {
    try {
      const input = encodeFromInput({
        url: requestUrl.searchParams.get('url') || undefined,
        name: requestUrl.searchParams.get('name') || undefined,
      });
      send(200, { link: encryptLink(input.url, { name: input.name }) });
    } catch (error) {
      send(400, { error: error instanceof Error ? error.message : 'invalid request' });
    }
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/encode') {
    let body = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        req.destroy(new Error('request body is too large'));
      }
    });
    req.on('error', (error) => {
      send(413, { error: error.message });
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}') as EncodeRequestBody;
        const input = encodeFromInput(parsed);
        send(200, { link: encryptLink(input.url, { name: input.name }) });
      } catch (error) {
        send(400, { error: error instanceof Error ? error.message : 'invalid request' });
      }
    });
    return;
  }

  send(404, { error: 'not found' });
});

server.listen(port, host, () => {
  console.log(`incy-link-encoder API listening on http://${host}:${port}`);
});
