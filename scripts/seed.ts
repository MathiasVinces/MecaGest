import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Database } from '../src/persistence/database.js';
import { IdentityRepository } from '../src/persistence/identity-repository.js';
import { AuthService } from '../src/application/auth-service.js';
import type { Role } from '../src/domain/models.js';

const db = new Database(process.env.DATABASE_PATH ?? 'data/mecagest.sqlite');
try {
  const identities = new IdentityRepository(db);
  const auth = new AuthService(identities);
  const credentials = [];
  for (const [username, role] of [['admin', 'ADMIN'], ['recepcion', 'RECEPTIONIST'], ['mecanico', 'MECHANIC']] as [string, Role][]) {
    if (identities.findByUsername(username)) continue;
    const password = randomBytes(18).toString('base64url');
    const user = await auth.provision(username, role, password);
    credentials.push({ ...user, password });
  }
  if (credentials.length) {
    mkdirSync('.local', { recursive: true });
    const file = resolve('.local', `credenciales-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(`Usuarios creados: ${credentials.map(c => c.username).join(', ')}. Credenciales SOLO locales: ${file}`);
  } else console.log('Los usuarios ya existen; se conservaron sus contraseñas y datos.');
} finally { db.close(); }
