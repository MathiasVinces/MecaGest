import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const base = `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
type Credential = { username: string; password: string };
const credentials = new Map<string, Credential>();
try {
  for (const file of readdirSync('.local').filter(f => /^credenciales-\d+\.json$/.test(f)).sort()) {
    for (const credential of JSON.parse(readFileSync(join('.local', file), 'utf8')) as Credential[]) credentials.set(credential.username, credential);
  }
} catch { throw new Error('Ejecuta npm run seed y conserva el archivo de credenciales local'); }

async function call(method: string, path: string, token?: string, body?: unknown, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  const data = response.status === 204 ? null : await response.json();
  if (response.status !== expected) throw new Error(`${method} ${path}: HTTP ${response.status}, ${JSON.stringify(data)}`);
  return data;
}

const sessions: Record<string, string> = {};
try {
  for (const username of ['admin', 'recepcion', 'mecanico']) {
    const credential = credentials.get(username);
    if (!credential) throw new Error(`No se encuentra la credencial local de ${username}`);
    sessions[username] = (await call('POST', '/api/auth/login', undefined, { username: credential.username, password: credential.password })).token;
  }
  const mechanic = await call('GET', '/api/me', sessions.mecanico);
  const client = await call('POST', '/api/clients', sessions.recepcion, { name: 'Cliente ficticio de demostración', phone: '0000000000' }, 201);
  const plate = 'DM' + randomBytes(4).toString('hex').toUpperCase();
  const vehicle = await call('POST', '/api/vehicles', sessions.recepcion, { clientId: client.id, plate, brand: 'Marca demo', model: 'Modelo demo' }, 201);
  const order = await call('POST', '/api/orders', sessions.recepcion, { vehicleId: vehicle.id, mechanicId: mechanic.id, reason: 'Ruido al frenar' }, 201);
  console.log(`CU-01: orden ${order.id}; placa ${plate}; estado ${order.status}`);
  const diagnosis = await call('PUT', `/api/orders/${order.id}/diagnosis`, sessions.mecanico, { findings: 'Pastillas desgastadas', recommendedWork: 'Cambiar pastillas', complete: true });
  console.log(`CU-02: ${diagnosis.status}`);
  await call('POST', `/api/orders/${order.id}/authorization`, sessions.mecanico, { decision: 'APPROVED', evidence: 'Intento de prueba sin permiso' }, 403);
  console.log('QA-02: autorización del mecánico bloqueada (403)');
  const authorization = await call('POST', `/api/orders/${order.id}/authorization`, sessions.admin, { decision: 'APPROVED', evidence: 'Aceptación ficticia para demostración académica' });
  console.log(`CU-03: ${authorization.status}`);
  await call('POST', `/api/orders/${order.id}/repair/start`, sessions.mecanico);
  await call('POST', `/api/orders/${order.id}/repairs`, sessions.mecanico, { activity: 'Repuesto pendiente', outcome: 'BLOCKED' });
  await call('POST', `/api/orders/${order.id}/repairs`, sessions.mecanico, { activity: 'Repuesto recibido; instalación en curso', outcome: 'PROGRESS' });
  const finished = await call('POST', `/api/orders/${order.id}/repairs`, sessions.mecanico, { activity: 'Pastillas sustituidas y frenos comprobados', outcome: 'COMPLETED' });
  console.log(`CU-04: ${finished.status}; ${finished.repairs.length} actividades guardadas`);
  const history = await call('GET', `/api/vehicles/by-plate/${plate}/history`, sessions.mecanico);
  if (history.orders[0]?.status !== 'COMPLETED' || history.orders[0]?.repairs.length !== 3) throw new Error('Historial incompleto');
  console.log(`CU-05: historial de ${plate} verificado con diagnóstico, autorización y reparación.`);
  console.log('Demostración completada; los registros ficticios permanecen en la base local.');
} finally {
  for (const token of Object.values(sessions)) await call('DELETE', '/api/auth/session', token, undefined, 204).catch(() => {});
}
