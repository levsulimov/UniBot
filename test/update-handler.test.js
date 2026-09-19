import test from 'node:test';
import assert from 'node:assert/strict';
import { BotService, messages } from '../src/bot-service.js';
import { UserRepository } from '../src/user-repository.js';
import { processUpdate } from '../src/update-handler.js';

function messageUpdate(text = '/start') {
  return {
    message: {
      sender: { user_id: 42 },
      recipient: { chat_id: 99 },
      body: { text },
    },
  };
}

test('a MAX message update is handled, replied to, and stored for later cleanup', async (t) => {
  const users = new UserRepository(':memory:');
  t.after(() => users.close());
  const sent = [];
  const handled = await processUpdate({
    update: messageUpdate(),
    service: new BotService(users),
    users,
    client: { send: async (chatId, message) => { sent.push({ chatId, message }); return 'bot-start'; } },
  });

  assert.equal(handled, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].chatId, 99);
  assert.equal(sent[0].message.text, messages.START_TEXT);
  assert.deepEqual(users.getBotMessages('42').map((message) => ({ ...message })), [{ messageId: 'bot-start', chatId: '99' }]);
});

test('a callback deletes stored bot messages before sending the new menu', async (t) => {
  const users = new UserRepository(':memory:');
  t.after(() => users.close());
  users.rememberBotMessage({ messageId: 'old-welcome', maxUserId: '42', chatId: '99' });
  users.rememberBotMessage({ messageId: 'old-menu', maxUserId: '42', chatId: '99' });
  const order = [];

  await processUpdate({
    update: { callback: { user_id: 42, payload: 'role:applicant', message: { recipient: { chat_id: 99 } } } },
    service: new BotService(users),
    users,
    client: {
      deleteMessage: async (messageId) => order.push(`delete:${messageId}`),
      send: async (_chatId, message) => { order.push(`send:${message.kind}`); return 'new-menu'; },
    },
  });

  assert.deepEqual(order, ['delete:old-welcome', 'delete:old-menu', 'send:applicant-menu']);
  assert.deepEqual(users.getBotMessages('42').map((message) => ({ ...message })), [{ messageId: 'new-menu', chatId: '99' }]);
});

test('an unsupported MAX update is ignored without sending a reply', async (t) => {
  const users = new UserRepository(':memory:');
  t.after(() => users.close());
  const handled = await processUpdate({
    update: { update_type: 'bot_started' },
    service: new BotService(users),
    users,
    client: { send: async () => assert.fail('must not send') },
  });
  assert.equal(handled, false);
});
