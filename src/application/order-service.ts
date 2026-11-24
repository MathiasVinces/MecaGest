import { randomUUID } from 'node:crypto';
import type { Order, OrderStatus, User } from '../domain/models.js';
import { WorkshopRepository } from '../persistence/workshop-repository.js';
import { IdentityRepository } from '../persistence/identity-repository.js';
import { allow } from './auth-service.js';
import { AppError, requireValue } from './errors.js';
import { authorizationSchema, diagnosisSchema, idSchema, orderSchema, plateSchema, repairSchema } from './validation.js';

export class OrderService {
  constructor(private readonly repo: WorkshopRepository, private readonly identities: IdentityRepository) {}

  create(user: User, input: unknown) {
    allow(user, ['ADMIN', 'RECEPTIONIST']);
    const data = orderSchema.parse(input);
    return this.repo.transaction(() => {
      requireValue(this.repo.vehicle(data.vehicleId), 'Vehículo');
      const mechanic = requireValue(this.identities.findById(data.mechanicId), 'Mecánico');
      if (mechanic.role !== 'MECHANIC') throw new AppError(422, 'INVALID_MECHANIC', 'El responsable debe tener rol de mecánico');
      if (this.repo.openOrder(data.vehicleId)) throw new AppError(409, 'OPEN_ORDER_EXISTS', 'El vehículo ya tiene una orden abierta');
      const now = new Date().toISOString();
      const order: Order = { id: randomUUID(), ...data, status: 'RECEIVED', createdAt: now, updatedAt: now };
      this.repo.insertOrder(order);
      return this.repo.detail(order.id)!;
    });
  }

  list(user: User) { allow(user, ['ADMIN', 'RECEPTIONIST', 'MECHANIC']); return this.repo.orders(); }
  detail(user: User, id: string) {
    allow(user, ['ADMIN', 'RECEPTIONIST', 'MECHANIC']);
    return requireValue(this.repo.detail(idSchema.parse(id)), 'Orden');
  }

  diagnose(user: User, id: string, input: unknown) {
    allow(user, ['ADMIN', 'MECHANIC']);
    const data = diagnosisSchema.parse(input);
    return this.change(id, order => {
      this.assigned(user, order);
      this.inState(order, ['RECEIVED', 'DIAGNOSING']);
      const now = new Date().toISOString();
      this.repo.saveDiagnosis({ orderId: order.id, ...data, recordedBy: user.id, updatedAt: now });
      this.repo.setStatus(order.id, data.complete ? 'AWAITING_AUTHORIZATION' : 'DIAGNOSING', now);
    });
  }

  authorize(user: User, id: string, input: unknown) {
    allow(user, ['ADMIN']);
    const data = authorizationSchema.parse(input);
    return this.change(id, order => {
      this.inState(order, ['AWAITING_AUTHORIZATION']);
      const now = new Date().toISOString();
      this.repo.insertAuthorization({ orderId: order.id, ...data, recordedBy: user.id, createdAt: now });
      this.repo.setStatus(order.id, data.decision === 'APPROVED' ? 'AUTHORIZED' : 'REJECTED', now);
    });
  }

  startRepair(user: User, id: string) {
    allow(user, ['ADMIN', 'MECHANIC']);
    return this.change(id, order => {
      this.assigned(user, order);
      this.inState(order, ['AUTHORIZED']);
      this.repo.setStatus(order.id, 'IN_REPAIR', new Date().toISOString());
    });
  }

  recordRepair(user: User, id: string, input: unknown) {
    allow(user, ['ADMIN', 'MECHANIC']);
    const data = repairSchema.parse(input);
    return this.change(id, order => {
      this.assigned(user, order);
      this.inState(order, ['IN_REPAIR', 'BLOCKED']);
      const now = new Date().toISOString();
      this.repo.insertRepair({ id: randomUUID(), orderId: order.id, ...data, recordedBy: user.id, createdAt: now });
      this.repo.setStatus(order.id, data.outcome === 'PROGRESS' ? 'IN_REPAIR' : data.outcome, now);
    });
  }

  history(user: User, plate: string) {
    allow(user, ['ADMIN', 'MECHANIC']);
    const vehicle = requireValue(this.repo.vehicleByPlate(plateSchema.parse(plate)), 'Vehículo');
    const orders = this.repo.orders(vehicle.id).map(order => this.repo.detail(order.id)!);
    return { vehicle, orders, message: orders.length ? 'Historial encontrado' : 'El vehículo todavía no tiene servicios registrados' };
  }

  private change(id: string, work: (order: Order) => void) {
    const validId = idSchema.parse(id);
    return this.repo.transaction(() => {
      const order = requireValue(this.repo.order(validId), 'Orden');
      work(order);
      return this.repo.detail(validId)!;
    });
  }

  private assigned(user: User, order: Order) {
    if (user.role === 'MECHANIC' && user.id !== order.mechanicId) throw new AppError(403, 'NOT_ASSIGNED', 'La orden está asignada a otro mecánico');
  }

  private inState(order: Order, allowed: OrderStatus[]) {
    if (!allowed.includes(order.status)) throw new AppError(409, 'INVALID_STATE', `La operación no se permite en estado ${order.status}`);
  }
}
