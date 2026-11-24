import type { Authorization, Client, Diagnosis, Order, OrderDetail, OrderStatus, Repair, Vehicle } from '../domain/models.js';
import { Database } from './database.js';

export class WorkshopRepository {
  constructor(private readonly db: Database) {}
  transaction<T>(work: () => T) { return this.db.transaction(work); }
  client(id: string) { return this.db.get<Client>('SELECT * FROM clients WHERE id = ?', id); }
  clients() { return this.db.all<Client>('SELECT * FROM clients ORDER BY createdAt DESC'); }
  insertClient(c: Client) { this.db.run('INSERT INTO clients VALUES (?, ?, ?, ?)', c.id, c.name, c.phone, c.createdAt); }
  vehicle(id: string) { return this.db.get<Vehicle>('SELECT * FROM vehicles WHERE id = ?', id); }
  vehicleByPlate(plate: string) { return this.db.get<Vehicle>('SELECT * FROM vehicles WHERE plate = ?', plate); }
  vehicles() { return this.db.all<Vehicle>('SELECT * FROM vehicles ORDER BY createdAt DESC'); }
  insertVehicle(v: Vehicle) { this.db.run('INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?)', v.id, v.clientId, v.plate, v.brand, v.model, v.createdAt); }
  order(id: string) { return this.db.get<Order>('SELECT * FROM orders WHERE id = ?', id); }
  orders(vehicleId?: string) {
    return vehicleId
      ? this.db.all<Order>('SELECT * FROM orders WHERE vehicleId = ? ORDER BY createdAt DESC, id', vehicleId)
      : this.db.all<Order>('SELECT * FROM orders ORDER BY createdAt DESC, id');
  }
  openOrder(vehicleId: string) { return this.db.get<Order>("SELECT * FROM orders WHERE vehicleId = ? AND status NOT IN ('COMPLETED','REJECTED')", vehicleId); }
  insertOrder(o: Order) { this.db.run('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)', o.id, o.vehicleId, o.mechanicId, o.reason, o.status, o.createdAt, o.updatedAt); }
  setStatus(id: string, status: OrderStatus, now: string) { this.db.run('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?', status, now, id); }
  saveDiagnosis(d: Diagnosis) {
    this.db.run(`INSERT INTO diagnoses VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(orderId) DO UPDATE SET findings=excluded.findings, recommendedWork=excluded.recommendedWork,
      complete=excluded.complete, recordedBy=excluded.recordedBy, updatedAt=excluded.updatedAt`,
    d.orderId, d.findings, d.recommendedWork, Number(d.complete), d.recordedBy, d.updatedAt);
  }
  insertAuthorization(a: Authorization) { this.db.run('INSERT INTO authorizations VALUES (?, ?, ?, ?, ?)', a.orderId, a.decision, a.evidence, a.recordedBy, a.createdAt); }
  insertRepair(r: Repair) { this.db.run('INSERT INTO repairs VALUES (?, ?, ?, ?, ?, ?)', r.id, r.orderId, r.activity, r.outcome, r.recordedBy, r.createdAt); }
  detail(id: string): OrderDetail | undefined {
    const order = this.order(id);
    if (!order) return undefined;
    const row = this.db.get<Omit<Diagnosis, 'complete'> & { complete: number }>('SELECT * FROM diagnoses WHERE orderId = ?', id);
    return {
      ...order,
      diagnosis: row ? { ...row, complete: Boolean(row.complete) } : null,
      authorization: this.db.get<Authorization>('SELECT * FROM authorizations WHERE orderId = ?', id) ?? null,
      repairs: this.db.all<Repair>('SELECT * FROM repairs WHERE orderId = ? ORDER BY createdAt, rowid', id),
    };
  }
}
