import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fixture } from './helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => { f = await fixture(); });
afterEach(() => f.db.close());

it('QA-02: bloquea 20 intentos restringidos y conserva intactos los datos', async () => {
  await f.diagnose(); await f.approve();
  const snapshot = JSON.stringify(f.db.all('SELECT * FROM authorizations'));
  for (let i = 0; i < 20; i++) {
    const response = await f.api.post(`/api/orders/${f.order.id}/authorization`)
      .set('Authorization', f.bearer(i % 2 ? 'mecanico' : 'recepcion'))
      .send({ decision: i % 3 ? 'REJECTED' : 'APPROVED', evidence: `Intento restringido de prueba ${i + 1}` }).expect(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(JSON.stringify(f.db.all('SELECT * FROM authorizations'))).toBe(snapshot);
    expect(f.db.get<{ status: string }>('SELECT status FROM orders WHERE id = ?', f.order.id)!.status).toBe('AUTHORIZED');
  }
});

describe('QA-03: 30 interrupciones SQL controladas', () => {
  it.each([
    ['antes de guardar actividad', 'BEFORE INSERT ON repairs'],
    ['después de guardar actividad', 'AFTER INSERT ON repairs'],
    ['después de cambiar estado', 'AFTER UPDATE ON orders'],
  ])('revierte 10 fallos %s', async (_label, trigger) => {
    await f.diagnose(); await f.approve(); await f.start();
    const before = (await f.api.get(`/api/orders/${f.order.id}`).set('Authorization', f.bearer()).expect(200)).body;
    // Fallos del motor real, no mocks de persistencia ni un parámetro de fallo expuesto por HTTP.
    f.db.connection.exec(`CREATE TEMP TRIGGER fail_save ${trigger} BEGIN SELECT RAISE(ABORT, 'Interrupción de prueba'); END;`);
    for (let i = 0; i < 10; i++) {
      const result = await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico'))
        .send({ activity: `Trabajo simulado ${i + 1}`, outcome: 'COMPLETED' }).expect(500);
      expect(result.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(result.body)).not.toContain('SQLITE');
      const after = (await f.api.get(`/api/orders/${f.order.id}`).set('Authorization', f.bearer()).expect(200)).body;
      expect(after).toEqual(before);
    }
    f.db.connection.exec('DROP TRIGGER fail_save');
    const retry = await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico'))
      .send({ activity: 'Reintento sin interrupción', outcome: 'COMPLETED' }).expect(200);
    expect(retry.body.status).toBe('COMPLETED');
    expect(retry.body.repairs).toHaveLength(1);
  });
});
