import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const credentials = new Map();
try {
  for (const file of readdirSync('.local').filter(name => /^credenciales-\d+\.json$/.test(name)).sort()) {
    for (const item of JSON.parse(readFileSync(join('.local', file), 'utf8'))) credentials.set(item.username, item);
  }
  if (!credentials.size) throw new Error('No hay credenciales locales');
  console.log('Credenciales de tu instalación local. No publiques esta salida ni la incluyas en la exposición.');
  console.table([...credentials.values()].map(item => ({ Usuario: item.username, Rol: item.role, Contraseña: item.password })));
} catch {
  console.error('No se encontraron las credenciales locales. Ejecuta npm run seed; si ya existían usuarios, conserva su archivo original de .local.');
  process.exitCode = 1;
}
