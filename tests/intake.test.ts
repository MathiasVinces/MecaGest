import { afterEach, beforeEach, expect, it } from 'vitest';
import { fixture } from './helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(() => f.db.close());
const body = () => ({ plate: 'NEW-2026', reason: 'Ruido al frenar', mechanicId: f.ids.mecanico,
  newVehicle: { brand: 'Toyota', model: 'Corolla', owner: { name: 'Cliente nuevo', phone: '0000000000' } } });
const receive = (data: object, actor = 'admin') => f.api.post('/api/intakes').set('Authorization', f.bearer(actor)).send(data);

it('recibe cliente, vehículo y orden en una sola solicitud', async () => {
  const result = await receive(body(), 'recepcion').expect(201);
  expect(result.body.status).toBe('RECEIVED');
  expect(f.db.all('SELECT * FROM clients')).toHaveLength(2);
  expect(f.db.get<{plate: string}>('SELECT plate FROM vehicles WHERE id = ?', result.body.vehicleId)?.plate).toBe('NEW2026');
});

it('reutiliza propietarios y vehículos existentes sin duplicarlos', async () => {
  const data = { ...body(), newVehicle: { brand: 'Toyota', model: 'Corolla', owner: { clientId: f.client.id } } };
  const first = await receive(data).expect(201);
  await f.api.put(`/api/orders/${first.body.id}/diagnosis`).set('Authorization', f.bearer()).send({ findings: 'Revisión', recommendedWork: 'Reparar', complete: true }).expect(200);
  await f.api.post(`/api/orders/${first.body.id}/authorization`).set('Authorization', f.bearer()).send({ decision: 'REJECTED', evidence: 'Decisión de prueba' }).expect(200);
  const second = await receive({ plate: 'new 2026', reason: 'Nueva visita', mechanicId: f.ids.mecanico }).expect(201);
  expect(second.body.vehicleId).toBe(first.body.vehicleId);
  expect(f.db.all('SELECT * FROM clients')).toHaveLength(1);
  expect(f.db.all('SELECT * FROM vehicles')).toHaveLength(2);
});

it('rechaza permisos, datos faltantes y otra orden abierta', async () => {
  await receive(body(), 'mecanico').expect(403);
  await receive({ plate: 'NEW2026', reason: 'Revisar', mechanicId: f.ids.mecanico }).expect(422);
  await receive({ plate: 'DEM0001', reason: 'Revisar', mechanicId: f.ids.mecanico }).expect(409);
  await receive({ ...body(), mechanicId: f.ids.admin }).expect(422);
  expect(f.db.all('SELECT * FROM clients')).toHaveLength(1);
  expect(f.db.all('SELECT * FROM vehicles')).toHaveLength(1);
});

it('revierte también cliente y vehículo si falla la inserción final de la orden', async () => {
  f.db.connection.exec("CREATE TEMP TRIGGER fail_intake BEFORE INSERT ON orders BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
  await receive(body()).expect(500);
  for (const table of ['clients', 'vehicles', 'orders']) expect(f.db.all(`SELECT * FROM ${table}`)).toHaveLength(1);
  f.db.connection.exec('DROP TRIGGER fail_intake');
  await receive(body()).expect(201);
  for (const table of ['clients', 'vehicles', 'orders']) expect(f.db.all(`SELECT * FROM ${table}`)).toHaveLength(2);
});

it('rechaza un reenvío sin crear registros adicionales', async () => {
  await receive(body()).expect(201);
  await receive(body()).expect(409);
  for (const table of ['clients', 'vehicles', 'orders']) expect(f.db.all(`SELECT * FROM ${table}`)).toHaveLength(2);
});
