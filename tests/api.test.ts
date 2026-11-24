import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fixture } from './helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(() => f.db.close());

describe('CU-01 ingreso HTTP', () => {
  it('persiste cliente, vehículo y orden con ID y estado inicial', async () => {
    expect(f.vehicle.plate).toBe('DEM0001');
    expect(f.order.status).toBe('RECEIVED');
    const saved = await f.api.get(`/api/orders/${f.order.id}`).set('Authorization', f.bearer()).expect(200);
    expect(saved.body.vehicleId).toBe(f.vehicle.id);
  });
  it('rechaza datos incompletos sin crear órdenes', async () => {
    await f.api.post('/api/orders').set('Authorization', f.bearer()).send({ vehicleId: f.vehicle.id }).expect(422);
    expect(f.db.all('SELECT * FROM orders')).toHaveLength(1);
  });
  it('rechaza una placa duplicada incluso con formato diferente', async () => {
    await f.api.post('/api/vehicles').set('Authorization', f.bearer()).send({ clientId: f.client.id, plate: 'dem 0001', brand: 'Marca', model: 'Modelo' }).expect(409);
  });
  it('rechaza un cliente o vehículo inexistente', async () => {
    await f.api.post('/api/vehicles').set('Authorization', f.bearer()).send({ clientId: randomUUID(), plate: 'DEM0002', brand: 'Marca', model: 'Modelo' }).expect(404);
    await f.api.post('/api/orders').set('Authorization', f.bearer()).send({ vehicleId: randomUUID(), mechanicId: f.ids.mecanico, reason: 'Prueba' }).expect(404);
  });
  it('rechaza otra orden abierta para el mismo vehículo', async () => {
    await f.api.post('/api/orders').set('Authorization', f.bearer()).send({ vehicleId: f.vehicle.id, mechanicId: f.ids.mecanico, reason: 'Duplicada' }).expect(409);
  });
  it('rechaza asignación a un usuario sin rol mecánico', async () => {
    await f.api.post('/api/orders').set('Authorization', f.bearer()).send({ vehicleId: f.vehicle.id, mechanicId: f.ids.admin, reason: 'Prueba' }).expect(422);
  });
});

describe('CU-02 diagnóstico HTTP', () => {
  it('guarda borrador y luego diagnóstico completo', async () => {
    const draft = await f.api.put(`/api/orders/${f.order.id}/diagnosis`).set('Authorization', f.bearer('mecanico')).send({ findings: 'En revisión', recommendedWork: 'Continuar revisión', complete: false }).expect(200);
    expect(draft.body.status).toBe('DIAGNOSING');
    expect((await f.diagnose()).body.status).toBe('AWAITING_AUTHORIZATION');
  });
  it('rechaza diagnóstico vacío', async () => {
    await f.api.put(`/api/orders/${f.order.id}/diagnosis`).set('Authorization', f.bearer('mecanico')).send({ findings: ' ', recommendedWork: 'Revisar', complete: true }).expect(422);
  });
  it('rechaza a otro mecánico y al recepcionista', async () => {
    for (const actor of ['otro', 'recepcion']) await f.api.put(`/api/orders/${f.order.id}/diagnosis`).set('Authorization', f.bearer(actor)).send({ findings: 'Falla', recommendedWork: 'Revisar', complete: true }).expect(403);
  });
  it('rechaza una orden inexistente y la modificación posterior al diagnóstico completo', async () => {
    await f.api.put(`/api/orders/${randomUUID()}/diagnosis`).set('Authorization', f.bearer()).send({ findings: 'Falla', recommendedWork: 'Revisar', complete: true }).expect(404);
    await f.diagnose();
    await f.api.put(`/api/orders/${f.order.id}/diagnosis`).set('Authorization', f.bearer()).send({ findings: 'Falla', recommendedWork: 'Revisar', complete: true }).expect(409);
  });
});

describe('CU-03 autorización HTTP', () => {
  it('registra aprobación y responsable', async () => {
    await f.diagnose();
    const result = await f.approve();
    expect(result.body.status).toBe('AUTHORIZED');
    expect(result.body.authorization.recordedBy).toBe(f.ids.admin);
  });
  it('registra rechazo y bloquea reparación', async () => {
    await f.diagnose();
    const result = await f.api.post(`/api/orders/${f.order.id}/authorization`).set('Authorization', f.bearer()).send({ decision: 'REJECTED', evidence: 'Rechazo ficticio' }).expect(200);
    expect(result.body.status).toBe('REJECTED');
    await f.api.post(`/api/orders/${f.order.id}/repair/start`).set('Authorization', f.bearer('mecanico')).expect(409);
  });
  it('exige diagnóstico completo y constancia no vacía', async () => {
    await f.api.post(`/api/orders/${f.order.id}/authorization`).set('Authorization', f.bearer()).send({ decision: 'APPROVED', evidence: 'Prueba' }).expect(409);
    await f.diagnose();
    await f.api.post(`/api/orders/${f.order.id}/authorization`).set('Authorization', f.bearer()).send({ decision: 'APPROVED', evidence: '' }).expect(422);
  });
  it('conserva una autorización ya registrada', async () => {
    await f.diagnose(); await f.approve();
    await f.api.post(`/api/orders/${f.order.id}/authorization`).set('Authorization', f.bearer()).send({ decision: 'REJECTED', evidence: 'Cambio' }).expect(409);
    expect(f.services.orders.detail(f.services.auth.authenticate(f.tokens.admin), f.order.id).authorization?.decision).toBe('APPROVED');
  });
});

describe('CU-04 reparación HTTP', () => {
  it('inicia, registra incidencia, reanuda y cierra', async () => {
    await f.diagnose(); await f.approve(); await f.start();
    for (const outcome of ['BLOCKED', 'PROGRESS', 'COMPLETED']) {
      const result = await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: `Actividad ficticia: ${outcome}`, outcome }).expect(200);
      expect(result.body.status).toBe(outcome === 'PROGRESS' ? 'IN_REPAIR' : outcome);
    }
    const saved = await f.api.get(`/api/orders/${f.order.id}`).set('Authorization', f.bearer()).expect(200);
    expect(saved.body.repairs).toHaveLength(3);
  });
  it('impide reparar sin aprobación y registrar actividad vacía', async () => {
    await f.api.post(`/api/orders/${f.order.id}/repair/start`).set('Authorization', f.bearer('mecanico')).expect(409);
    await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: 'Intento', outcome: 'COMPLETED' }).expect(409);
    await f.diagnose(); await f.approve(); await f.start();
    await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: ' ', outcome: 'COMPLETED' }).expect(422);
  });
  it('no permite modificar una reparación cerrada y admite una nueva orden', async () => {
    await f.diagnose(); await f.approve(); await f.start();
    await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: 'Trabajo terminado', outcome: 'COMPLETED' }).expect(200);
    await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: 'Otro trabajo', outcome: 'PROGRESS' }).expect(409);
    await f.api.post('/api/orders').set('Authorization', f.bearer('recepcion')).send({ vehicleId: f.vehicle.id, mechanicId: f.ids.mecanico, reason: 'Nuevo ingreso' }).expect(201);
  });
});

describe('CU-05 historial HTTP', () => {
  it('incluye diagnóstico, decisión, actividades y fechas', async () => {
    await f.diagnose(); await f.approve(); await f.start();
    await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: 'Servicio completado', outcome: 'COMPLETED' }).expect(200);
    const result = await f.api.get('/api/vehicles/by-plate/dem-0001/history').set('Authorization', f.bearer('mecanico')).expect(200);
    expect(result.body.orders[0]).toMatchObject({ status: 'COMPLETED', diagnosis: { complete: true }, authorization: { decision: 'APPROVED' } });
    expect(result.body.orders[0].repairs[0].createdAt).toBeTruthy();
  });
  it('informa expresamente cuando un vehículo no tiene historial', async () => {
    const v = await f.api.post('/api/vehicles').set('Authorization', f.bearer()).send({ clientId: f.client.id, plate: 'DEM0002', brand: 'Marca', model: 'Modelo' }).expect(201);
    const result = await f.api.get(`/api/vehicles/by-plate/${v.body.plate}/history`).set('Authorization', f.bearer()).expect(200);
    expect(result.body.orders).toEqual([]);
    expect(result.body.message).toContain('todavía no');
  });
  it('rechaza vehículo inexistente, placa inválida y rol no autorizado', async () => {
    await f.api.get('/api/vehicles/by-plate/DEM9999/history').set('Authorization', f.bearer()).expect(404);
    await f.api.get('/api/vehicles/by-plate/x/history').set('Authorization', f.bearer()).expect(422);
    await f.api.get('/api/vehicles/by-plate/DEM0001/history').set('Authorization', f.bearer('recepcion')).expect(403);
  });
});

describe('Protocolo y sesión', () => {
  it('rechaza solicitudes sin sesión y datos JSON malformados', async () => {
    await f.api.get('/api/orders').expect(401);
    const malformed = await f.api.post('/api/orders').set('Authorization', f.bearer()).set('Content-Type', 'application/json').send('{').expect(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
  });
  it('devuelve 422 para UUID inválido y 404 para orden ausente', async () => {
    await f.api.get('/api/orders/no-id').set('Authorization', f.bearer()).expect(422);
    await f.api.get(`/api/orders/${randomUUID()}`).set('Authorization', f.bearer()).expect(404);
  });
  it('limita el tamaño de cuerpos y los intentos de login', async () => {
    await f.api.post('/api/clients').set('Authorization', f.bearer()).send({ name: 'x'.repeat(40000) }).expect(413);
    for (let i = 0; i < 6; i++) await f.api.post('/api/auth/login').send({ username: 'nadie', password: randomUUID() }).expect(401);
    await f.api.post('/api/auth/login').send({ username: 'nadie', password: randomUUID() }).expect(429);
  });
  it('revoca sesión y no expone el hash de contraseña', async () => {
    const me = await f.api.get('/api/me').set('Authorization', f.bearer()).expect(200);
    expect(me.body.passwordHash).toBeUndefined();
    await f.api.delete('/api/auth/session').set('Authorization', f.bearer()).expect(204);
    await f.api.get('/api/me').set('Authorization', f.bearer()).expect(401);
  });
});
