import type { StoredUser, User } from '../domain/models.js';
import { Database } from './database.js';

export class IdentityRepository {
  constructor(private readonly db: Database) {}
  findByUsername(username: string) { return this.db.get<StoredUser>('SELECT * FROM users WHERE username = ?', username); }
  findById(id: string) { return this.db.get<User>('SELECT id, username, role FROM users WHERE id = ?', id); }
  listMechanics() { return this.db.all<User>("SELECT id, username, role FROM users WHERE role = 'MECHANIC' ORDER BY username"); }
  insert(user: StoredUser) {
    this.db.run('INSERT INTO users VALUES (?, ?, ?, ?)', user.id, user.username, user.passwordHash, user.role);
  }
  createSession(tokenHash: string, userId: string, expiresAt: string) {
    this.db.run('DELETE FROM sessions WHERE expiresAt <= ?', new Date().toISOString());
    this.db.run('INSERT INTO sessions VALUES (?, ?, ?)', tokenHash, userId, expiresAt);
  }
  getSession(tokenHash: string, now: string) {
    return this.db.get<User>('SELECT u.id, u.username, u.role FROM sessions s JOIN users u ON u.id = s.userId WHERE s.tokenHash = ? AND s.expiresAt > ?', tokenHash, now);
  }
  deleteSession(tokenHash: string) { this.db.run('DELETE FROM sessions WHERE tokenHash = ?', tokenHash); }
}
