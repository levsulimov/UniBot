/** Thin adapter for the MAX Bot API `POST /messages` endpoint. */
export class MaxClient {
  constructor({ token, baseUrl, fetchImpl = fetch }) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  async send(chatId, message) {
    if (!this.token) throw new Error('MAX_BOT_TOKEN is not configured.');
    const body = { chat_id: chatId, text: message.text };
    if (message.keyboard) {
      body.attachments = [{
        type: 'inline_keyboard',
        payload: { buttons: message.keyboard.map((row) => row.map((button) => ({
          type: 'callback', text: button.text, payload: button.payload,
        }))) },
      }];
    }
    const response = await this.fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`MAX API responded with HTTP ${response.status}.`);
  }
}

/** Extracts only the fields needed by the workflow from MAX message/callback updates. */
export function parseMaxUpdate(update) {
  const message = update.message ?? update.callback?.message;
  const userId = update.message?.sender?.user_id ?? update.callback?.user?.user_id;
  const chatId = message?.recipient?.chat_id ?? message?.chat_id;
  const text = message?.body?.text ?? message?.text;
  const payload = update.callback?.payload;
  if (!userId || !chatId) return null;
  return { userId: String(userId), chatId, text, payload };
}
