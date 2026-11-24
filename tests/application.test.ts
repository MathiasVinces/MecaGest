import { beforeEach, afterEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Database } from '../src/persistence/database.js';
import { IdentityRepository } from '../src/persistence/identity-repository.js';
import { WorkshopRepository } from '../src/persistence/workshop-repository.js';
import { AuthService } from '../src/application/auth-service.js';
import { CatalogService } from '../src/application/catalog-service.js';
import { OrderService } from '../src/application/order-service.js';
import type { User } from '../src/domain/models.js';

let db: Database, catalog: CatalogService, orders: OrderService, admin: User, mechanic: User, orderId: string;
beforeEach(async () => {
  db = new Database(':memory:');
  const identities = new IdentityRepository(db), repo = new WorkshopRepository(db), auth = new AuthService(identities);
  admin = await auth.provision('admin', 'ADMIN', randomUUID());
  mechanic = await auth.provision('mecanico', 'MECHANIC', randomUUID());
  catalog = new CatalogService(repo, identities);
  orders = new OrderService(repo, identities);
  const client = catalog.createClient(admin, { name: 'Cliente de prueba', phone: '0000000000' });
  const vehicle = catalog.createVehicle(admin, { clientId: client.id, plate: 'DEM-0001', brand: 'Marca de prueba', model: 'Modelo' });
  orderId = orders.create(admin, { vehicleId: vehicle.id, mechanicId: mechanic.id, reason: 'Revisar frenos' }).id;
});
afterEach(() => db.close());
it('completa los cinco casos de uso y conserva el detalle en historial', () => {
  expect(orders.diagnose(mechanic, orderId, { findings: 'Desgaste', recommendedWork: 'Cambiar pastillas', complete: false }).status).toBe('DIAGNOSING');
  orders.diagnose(mechanic, orderId, { findings: 'Desgaste confirmado', recommendedWork: 'Cambiar pastillas', complete: true });
  orders.authorize(admin, orderId, { decision: 'APPROVED', evidence: 'Aceptación simulada para esta prueba' });
  orders.startRepair(mechanic, orderId);
  expect(orders.recordRepair(mechanic, orderId, { activity: 'Falta repuesto', outcome: 'BLOCKED' }).status).toBe('BLOCKED');
  orders.recordRepair(mechanic, orderId, { activity: 'Repuesto recibido', outcome: 'PROGRESS' });
  orders.recordRepair(mechanic, orderId, { activity: 'Pastillas cambiadas y frenos comprobados', outcome: 'COMPLETED' });
  const history = orders.history(mechanic, 'dem-0001');
  expect(history.orders[0].status).toBe('COMPLETED');
  expect(history.orders[0].repairs).toHaveLength(3);
  expect(history.orders[0].authorization?.recordedBy).toBe(admin.id);
});
it('no inicia reparación ni autoriza sin diagnóstico completo', () => {
  expect(() => orders.startRepair(mechanic, orderId)).toThrow('RECEIVED');
  expect(() => orders.authorize(admin, orderId, { decision: 'APPROVED', evidence: 'Prueba' })).toThrow('RECEIVED');
});
it('conserva el rechazo y no permite repararlo ni cambiar la decisión', () => {
  orders.diagnose(mechanic, orderId, { findings: 'Falla', recommendedWork: 'Cambiar pieza', complete: true });
  expect(orders.authorize(admin, orderId, { decision: 'REJECTED', evidence: 'Cliente rechaza en simulación' }).status).toBe('REJECTED');
  expect(() => orders.startRepair(mechanic, orderId)).toThrow('REJECTED');
  expect(() => orders.authorize(admin, orderId, { decision: 'APPROVED', evidence: 'Prueba' })).toThrow('REJECTED');
});
