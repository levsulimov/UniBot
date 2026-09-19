import test from 'node:test';
import assert from 'node:assert/strict';
import { BotService, messages } from '../src/bot-service.js';
import { UserRepository } from '../src/user-repository.js';
import { processUpdate } from '../src/update-handler.js';

test('a MAX message update is handled and produces a reply in its chat', async (t) => {
  const users = new UserRepository(':memory:');
  t.after(() => users.close());
  const sent = [];
  const handled = await processUpdate({
    update: {
      message: {
        sender: { user_id: 42 },
        recipient: { chat_id: 99 },
        body: { text: '/start' },
      },
    },
    service: new BotService(users),
    client: { send: async (chatId, message) => sent.push({ chatId, message }) },
  });

  assert.equal(handled, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chatId, 99);
  assert.equal(sent[0].message.text, messages.START_TEXT);
  assert.equal(sent[0].message.kind, 'role');
});

test('an unsupported MAX update is ignored without sending a reply', async (t) => {
  const users = new UserRepository(':memory:');
  t.after(() => users.close());
  const handled = await processUpdate({
    update: { update_type: 'bot_started' },
    service: new BotService(users),
    client: { send: async () => assert.fail('must not send') },
  });
  assert.equal(handled, false);
});
