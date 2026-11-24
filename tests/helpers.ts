import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { bootstrap } from '../src/bootstrap.js';
import type { Role } from '../src/domain/models.js';

export async function fixture() {
  const context = bootstrap(':memory:', () => {});
  const api = request(context.app);
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  for (const [username, role] of [['admin', 'ADMIN'], ['recepcion', 'RECEPTIONIST'], ['mecanico', 'MECHANIC'], ['otro', 'MECHANIC']] as [string, Role][]) {
    const password = randomUUID();
    const user = await context.services.auth.provision(username, role, password);
    const response = await api.post('/api/auth/login').send({ username, password }).expect(200);
    tokens[username] = response.body.token;
    ids[username] = user.id;
  }
  const bearer = (username = 'admin') => `Bearer ${tokens[username]}`;
  const client = (await api.post('/api/clients').set('Authorization', bearer('recepcion')).send({ name: 'Cliente ficticio', phone: '0000000000' }).expect(201)).body;
  const vehicle = (await api.post('/api/vehicles').set('Authorization', bearer('recepcion')).send({ clientId: client.id, plate: 'DEM-0001', brand: 'Marca demo', model: 'Modelo demo' }).expect(201)).body;
  const order = (await api.post('/api/orders').set('Authorization', bearer('recepcion')).send({ vehicleId: vehicle.id, mechanicId: ids.mecanico, reason: 'Revisar frenos' }).expect(201)).body;
  const diagnose = () => api.put(`/api/orders/${order.id}/diagnosis`).set('Authorization', bearer('mecanico')).send({ findings: 'Pastillas desgastadas', recommendedWork: 'Sustituir pastillas', complete: true }).expect(200);
  const approve = () => api.post(`/api/orders/${order.id}/authorization`).set('Authorization', bearer()).send({ decision: 'APPROVED', evidence: 'Aceptación ficticia de prueba' }).expect(200);
  const start = () => api.post(`/api/orders/${order.id}/repair/start`).set('Authorization', bearer('mecanico')).expect(200);
  return { ...context, api, tokens, ids, bearer, client, vehicle, order, diagnose, approve, start };
}
