import test from 'node:test';
import assert from 'node:assert/strict';
import { BotService, messages } from '../src/bot-service.js';
import { UserRepository } from '../src/user-repository.js';

function setup() {
  const users = new UserRepository(':memory:');
  return { users, bot: new BotService(users) };
}

test('/start shows a role selector', async (t) => {
  const { users, bot } = setup(); t.after(() => users.close());
  const [reply] = await bot.handle({ userId: '1', text: '/start' });
  assert.equal(reply.text, messages.START_TEXT);
  assert.deepEqual(reply.keyboard.map(([button]) => button.text), ['🎓 Я абитуриент', '👨‍🎓 Я первокурсник']);
});

test('applicant selection persists role and opens applicant menu', async (t) => {
  const { users, bot } = setup(); t.after(() => users.close());
  const [reply] = await bot.handle({ userId: '2', payload: 'role:applicant' });
  assert.equal(users.get('2').role, 'applicant');
  assert.equal(reply.kind, 'applicant-menu');
  assert.deepEqual(reply.keyboard.map(([button]) => button.text), messages.applicantItems);
});

test('freshman without group receives group prompt', async (t) => {
  const { users, bot } = setup(); t.after(() => users.close());
  const [reply] = await bot.handle({ userId: '3', payload: 'role:freshman' });
  assert.equal(users.get('3').role, 'freshman');
  assert.equal(reply.text, messages.GROUP_PROMPT);
});

test('freshman group is saved and menu is displayed', async (t) => {
  const { users, bot } = setup(); t.after(() => users.close());
  await bot.handle({ userId: '4', payload: 'role:freshman' });
  const replies = await bot.handle({ userId: '4', text: 'ПИ25-2' });
  assert.equal(users.get('4').studyGroup, 'ПИ25-2');
  assert.equal(replies[0].text, '✅ Группа ПИ25-2 сохранена.');
  assert.equal(replies[1].kind, 'freshman-menu');
});

test('returning freshman with saved group sees menu without a prompt', async (t) => {
  const { users, bot } = setup(); t.after(() => users.close());
  await bot.handle({ userId: '5', payload: 'role:freshman' });
  await bot.handle({ userId: '5', text: 'ПИ25-2' });
  const [reply] = await bot.handle({ userId: '5', payload: 'role:freshman' });
  assert.equal(reply.kind, 'freshman-menu');
});

test('SQLite profile persists after repository restart', async (t) => {
  const filename = `./data/test-${Date.now()}-${Math.random()}.sqlite`;
  const first = new UserRepository(filename);
  const bot = new BotService(first);
  await bot.handle({ userId: '6', payload: 'role:freshman' });
  await bot.handle({ userId: '6', text: 'ПИ25-2' });
  first.close();
  const second = new UserRepository(filename);
  t.after(() => { second.close(); });
  assert.equal(second.get('6').studyGroup, 'ПИ25-2');
});
