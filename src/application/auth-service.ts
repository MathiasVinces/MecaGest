import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Role, User } from '../domain/models.js';
import { IdentityRepository } from '../persistence/identity-repository.js';
import { AppError } from './errors.js';

const loginSchema = z.strictObject({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(128) });
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key));
});
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export function allow(user: User, roles: Role[]): void {
  if (!roles.includes(user.role)) throw new AppError(403, 'FORBIDDEN', 'Tu rol no permite esta operación');
}

export class AuthService {
  constructor(private readonly identities: IdentityRepository) {}

  // Solo se llama desde el script local de preparación; no existe registro público de usuarios.
  async provision(username: string, role: Role, password: string): Promise<User> {
    if (password.length < 12 || password.length > 128) throw new Error('La contraseña debe tener entre 12 y 128 caracteres');
    const existing = this.identities.findByUsername(username);
    if (existing) return { id: existing.id, username: existing.username, role: existing.role };
    const salt = randomBytes(16).toString('hex');
    const user = { id: randomUUID(), username, role };
    this.identities.insert({ ...user, passwordHash: `${salt}:${(await derive(password, salt)).toString('hex')}` });
    return user;
  }

  async login(input: unknown) {
    const { username, password } = loginSchema.parse(input);
    const stored = this.identities.findByUsername(username);
    // También se calcula scrypt cuando el usuario no existe, evitando una salida rápida distintiva.
    const [salt, expected] = stored?.passwordHash.split(':') ?? ['unknown-user-salt', '00'.repeat(64)];
    const actual = await derive(password, salt);
    if (!stored || !timingSafeEqual(actual, Buffer.from(expected, 'hex'))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    this.identities.createSession(tokenHash(token), stored.id, expiresAt);
    return { token, expiresAt, user: { id: stored.id, username: stored.username, role: stored.role } };
  }

  authenticate(token?: string): User {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AppError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar');
    const user = this.identities.getSession(tokenHash(token), new Date().toISOString());
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'La sesión no existe o ha caducado');
    return user;
  }

  logout(token: string) { this.identities.deleteSession(tokenHash(token)); }
}
