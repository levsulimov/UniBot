import http from 'node:http';
import { getConfig } from './config.js';
import { UserRepository } from './user-repository.js';
import { BotService } from './bot-service.js';
import { MaxClient, parseMaxUpdate } from './max-client.js';

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { raw += chunk; if (raw.length > 1_000_000) request.destroy(); });
    request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    request.on('error', reject);
  });
}

export function createServer({ config, service, client }) {
  return http.createServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (request.method !== 'POST' || request.url !== '/max/webhook') {
      response.writeHead(404).end(); return;
    }
    try {
      const event = parseMaxUpdate(await readJson(request));
      response.writeHead(200).end(); // acknowledge MAX promptly; sending is performed independently
      if (!event) return;
      const replies = await service.handle(event);
      for (const reply of replies) await client.send(event.chatId, reply);
    } catch (error) {
      console.error('Webhook processing error:', error);
      if (!response.headersSent) response.writeHead(500).end();
    }
  });
}

const config = getConfig();
const users = new UserRepository(config.databasePath);
const server = createServer({ config, service: new BotService(users), client: new MaxClient({ token: config.maxToken, baseUrl: config.maxApiBaseUrl }) });
server.listen(config.port, () => console.log(`UniBot is listening on port ${config.port}`));
