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
      )
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

  close() { this.db.close(); }
}
