import test from 'node:test';
import assert from 'node:assert/strict';
import { MaxClient, parseMaxUpdate } from '../src/max-client.js';

test('requests MAX updates from the configured API domain with a marker', async () => {
  let request;
  const client = new MaxClient({
    token: 'test-token',
    baseUrl: 'https://platform-api2.max.ru',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ updates: [], marker: 'next-marker' }), { status: 200 });
    },
  });

  const result = await client.getUpdates({ marker: 'previous-marker', timeout: 25 });
  assert.equal(result.marker, 'next-marker');
  assert.equal(request.url, 'https://platform-api2.max.ru/updates?timeout=25&limit=100&marker=previous-marker');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
});

test('parses callback events that carry the user id directly', () => {
  const event = parseMaxUpdate({
    callback: {
      user_id: 123,
      payload: 'role:applicant',
      message: { recipient: { chat_id: 456 } },
    },
  });
  assert.deepEqual(event, { userId: '123', chatId: 456, text: undefined, payload: 'role:applicant', isCallback: true });
});


test('deletes a bot message through the MAX delete endpoint', async () => {
  let request;
  const client = new MaxClient({
    token: 'test-token',
    baseUrl: 'https://platform-api2.max.ru',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(null, { status: 204 });
    },
  });
  await client.deleteMessage('message/123');
  assert.equal(request.url, 'https://platform-api2.max.ru/messages/message%2F123');
  assert.equal(request.options.method, 'DELETE');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
});
