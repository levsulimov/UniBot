/** Thin adapter for the MAX Bot API. */
export class MaxClient {
  constructor({ token, baseUrl, fetchImpl = fetch }) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  get headers() {
    if (!this.token) throw new Error('MAX_BOT_TOKEN is not configured.');
    return { Authorization: `Bearer ${this.token}` };
  }

  async send(chatId, message) {
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
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`MAX API responded with HTTP ${response.status}.`);
  }

  /** Requests the next MAX updates batch. `marker` makes processing resumable. */
  async getUpdates({ marker, timeout = 30, limit = 100, signal } = {}) {
    const query = new URLSearchParams({ timeout: String(timeout), limit: String(limit) });
    if (marker !== undefined && marker !== null) query.set('marker', String(marker));
    const response = await this.fetch(`${this.baseUrl}/updates?${query}`, {
      headers: this.headers,
      signal,
    });
    if (!response.ok) throw new Error(`MAX API updates responded with HTTP ${response.status}.`);
    return response.json();
  }
}

/** Extracts only the fields needed by the workflow from MAX message/callback updates. */
export function parseMaxUpdate(update) {
  const message = update.message ?? update.callback?.message;
  const userId = update.message?.sender?.user_id ?? update.callback?.user?.user_id ?? update.callback?.user_id;
  const chatId = message?.recipient?.chat_id ?? message?.chat_id;
  const text = message?.body?.text ?? message?.text;
  const payload = update.callback?.payload;
  if (!userId || !chatId) return null;
  return { userId: String(userId), chatId, text, payload };
}

/**
 * Continuously receives MAX events using long polling. It retries transient API
 * failures instead of terminating the bot process.
 */
export async function runPolling({ client, onUpdate, signal, timeout = 30, retryDelay = 1_000 }) {
  let marker;
  while (!signal?.aborted) {
    try {
      const batch = await client.getUpdates({ marker, timeout, signal });
      for (const update of batch.updates ?? []) await onUpdate(update);
      if (batch.marker !== undefined && batch.marker !== null) marker = batch.marker;
    } catch (error) {
      if (signal?.aborted) return;
      console.error('MAX polling error:', error);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}
