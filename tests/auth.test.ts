import { afterEach, beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Database } from '../src/persistence/database.js';
import { IdentityRepository } from '../src/persistence/identity-repository.js';
import { AuthService, allow } from '../src/application/auth-service.js';

let db: Database, auth: AuthService;
const password = randomUUID();
beforeEach(async () => {
  db = new Database(':memory:');
  auth = new AuthService(new IdentityRepository(db));
  await auth.provision('mecanico', 'MECHANIC', password);
});
afterEach(() => db.close());
it('autentica y revoca una sesión sin almacenar el token en claro', async () => {
  const session = await auth.login({ username: 'mecanico', password });
  expect(auth.authenticate(session.token).role).toBe('MECHANIC');
  expect(db.get<{ tokenHash: string }>('SELECT tokenHash FROM sessions')!.tokenHash).not.toBe(session.token);
  auth.logout(session.token);
  expect(() => auth.authenticate(session.token)).toThrow('caducado');
});
it('rechaza credenciales incorrectas y usuarios inexistentes', async () => {
  await expect(auth.login({ username: 'mecanico', password: randomUUID() })).rejects.toMatchObject({ status: 401 });
  await expect(auth.login({ username: 'ausente', password })).rejects.toMatchObject({ status: 401 });
});
it('rechaza sesiones vencidas y tokens ausentes', async () => {
  const session = await auth.login({ username: 'mecanico', password });
  db.run("UPDATE sessions SET expiresAt = '2000-01-01T00:00:00.000Z'");
  expect(() => auth.authenticate(session.token)).toThrow('caducado');
  expect(() => auth.authenticate()).toThrow('Inicia sesión');
});
it('impide al mecánico realizar operaciones administrativas', async () => {
  const session = await auth.login({ username: 'mecanico', password });
  expect(() => allow(session.user, ['ADMIN'])).toThrow('Tu rol');
});
