import { parseMaxUpdate } from './max-client.js';

/**
 * Connects one MAX update to the bot workflow and sends every resulting reply.
 * This function is used by both long polling and the optional webhook endpoint.
 */
export async function processUpdate({ update, service, client }) {
  const event = parseMaxUpdate(update);
  if (!event) return false;

  const replies = await service.handle(event);
  for (const reply of replies) await client.send(event.chatId, reply);
  return true;
}
