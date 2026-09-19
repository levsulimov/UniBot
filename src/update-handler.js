import { parseMaxUpdate } from './max-client.js';

async function removePreviousBotMessages({ userId, users, client }) {
  for (const message of users.getBotMessages(userId)) {
    try {
      await client.deleteMessage(message.messageId);
      users.forgetBotMessage(message.messageId);
    } catch (error) {
      // A deleted/expired message must not prevent the user from receiving a new menu.
      console.error(`Could not delete MAX message ${message.messageId}:`, error);
    }
  }
}

function restoreFreshmanContextForPendingGroup(event, users) {
  if (event.isCallback || typeof event.text !== 'string' || event.text === '/start') return;
  const pending = users.getPendingGroupChat(event.chatId);
  if (!pending) return;

  // A callback and a regular message may expose different user IDs in MAX updates.
  // The pending chat is the reliable link for the group-input step.
  const user = users.get(event.userId);
  if (user?.role !== 'freshman' || user.studyGroup) users.setRole(event.userId, 'freshman');
}

/**
 * Connects one MAX update to the bot workflow and sends every resulting reply.
 * This function is used by both long polling and the optional webhook endpoint.
 */
export async function processUpdate({ update, service, users, client }) {
  const event = parseMaxUpdate(update);
  if (!event) return false;

  if (event.isCallback) await removePreviousBotMessages({ userId: event.userId, users, client });
  restoreFreshmanContextForPendingGroup(event, users);

  const replies = await service.handle(event);
  for (const reply of replies) {
    const messageId = await client.send(event.chatId, reply);
    users.rememberBotMessage({ messageId, maxUserId: event.userId, chatId: event.chatId });
    if (reply.kind === 'group-prompt') users.expectGroupInChat({ chatId: event.chatId, maxUserId: event.userId });
    if (reply.kind === 'group-saved') users.clearPendingGroupChat(event.chatId);
  }
  return true;
}
