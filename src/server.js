import http from 'node:http';
import { getConfig } from './config.js';
import { UserRepository } from './user-repository.js';
import { BotService } from './bot-service.js';
import { MaxClient, runPolling } from './max-client.js';
import { processUpdate } from './update-handler.js';

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { raw += chunk; if (raw.length > 1_000_000) request.destroy(); });
    request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    request.on('error', reject);
  });
}

export function createServer({ service, client }) {
  return http.createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    // Kept for compatibility with webhook delivery; long polling is started below.
    if (request.method !== 'POST' || request.url !== '/max/webhook') {
      response.writeHead(404).end(); return;
    }
    try {
      await processUpdate({ update: await readJson(request), service, users, client });
      response.writeHead(200).end();
    } catch (error) {
      console.error('Webhook processing error:', error);
      response.writeHead(500).end();
    }
  });
}

const config = getConfig();
const users = new UserRepository(config.databasePath);
const service = new BotService(users);
const client = new MaxClient({ token: config.maxToken, baseUrl: config.maxApiBaseUrl });
const server = createServer({ service, client });
const shutdown = new AbortController();

server.listen(config.port, () => {
  console.log(`UniBot is listening on port ${config.port}`);
  runPolling({ client, signal: shutdown.signal, onUpdate: (update) => processUpdate({ update, service, users, client }) });
});

process.once('SIGINT', () => { shutdown.abort(); server.close(); users.close(); });
process.once('SIGTERM', () => { shutdown.abort(); server.close(); users.close(); });
