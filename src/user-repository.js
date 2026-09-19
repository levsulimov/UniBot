import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class UserRepository {
  constructor(filename) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        max_user_id TEXT PRIMARY KEY,
        role TEXT CHECK (role IN ('applicant', 'freshman')),
        study_group TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bot_messages (
        message_id TEXT PRIMARY KEY,
        max_user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS bot_messages_user_idx ON bot_messages(max_user_id);
    `);
  }

  get(maxUserId) {
    return this.db.prepare(`
      SELECT max_user_id AS maxUserId, role, study_group AS studyGroup,
             created_at AS createdAt, updated_at AS updatedAt
      FROM users WHERE max_user_id = ?
    `).get(String(maxUserId)) ?? null;
  }

  setRole(maxUserId, role) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO users (max_user_id, role, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(max_user_id) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at
    `).run(String(maxUserId), role, now, now);
    return this.get(maxUserId);
  }

  saveGroup(maxUserId, studyGroup) {
    const now = new Date().toISOString();
    const result = this.db.prepare(`
      UPDATE users SET study_group = ?, updated_at = ?
      WHERE max_user_id = ? AND role = 'freshman'
    `).run(studyGroup, now, String(maxUserId));
    if (result.changes !== 1) throw new Error('Freshman profile was not found.');
    return this.get(maxUserId);
  }

  touch(maxUserId) {
    this.db.prepare('UPDATE users SET updated_at = ? WHERE max_user_id = ?')
      .run(new Date().toISOString(), String(maxUserId));
  }

  rememberBotMessage({ messageId, maxUserId, chatId }) {
    if (!messageId) return;
    this.db.prepare(`
      INSERT OR IGNORE INTO bot_messages (message_id, max_user_id, chat_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(String(messageId), String(maxUserId), String(chatId), new Date().toISOString());
  }

  getBotMessages(maxUserId) {
    return this.db.prepare(`
      SELECT message_id AS messageId, chat_id AS chatId
      FROM bot_messages WHERE max_user_id = ? ORDER BY created_at
    `).all(String(maxUserId));
  }

  forgetBotMessage(messageId) {
    this.db.prepare('DELETE FROM bot_messages WHERE message_id = ?').run(String(messageId));
  }

  close() { this.db.close(); }
}
