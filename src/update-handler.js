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

/**
 * Connects one MAX update to the bot workflow and sends every resulting reply.
 * This function is used by both long polling and the optional webhook endpoint.
 */
export async function processUpdate({ update, service, users, client }) {
  const event = parseMaxUpdate(update);
  if (!event) return false;

  if (event.isCallback) await removePreviousBotMessages({ userId: event.userId, users, client });
  const replies = await service.handle(event);
  for (const reply of replies) {
    const messageId = await client.send(event.chatId, reply);
    users.rememberBotMessage({ messageId, maxUserId: event.userId, chatId: event.chatId });
  }
  return true;
}
