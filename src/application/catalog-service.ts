import { randomUUID } from 'node:crypto';
import type { User } from '../domain/models.js';
import { WorkshopRepository } from '../persistence/workshop-repository.js';
import { IdentityRepository } from '../persistence/identity-repository.js';
import { allow } from './auth-service.js';
import { AppError, requireValue } from './errors.js';
import { clientSchema, vehicleSchema } from './validation.js';

export class CatalogService {
  constructor(private readonly repo: WorkshopRepository, private readonly identities: IdentityRepository) {}

  createClient(user: User, input: unknown) {
    allow(user, ['ADMIN', 'RECEPTIONIST']);
    const client = { id: randomUUID(), ...clientSchema.parse(input), createdAt: new Date().toISOString() };
    this.repo.insertClient(client);
    return client;
  }

  createVehicle(user: User, input: unknown) {
    allow(user, ['ADMIN', 'RECEPTIONIST']);
    const data = vehicleSchema.parse(input);
    return this.repo.transaction(() => {
      requireValue(this.repo.client(data.clientId), 'Cliente');
      if (this.repo.vehicleByPlate(data.plate)) throw new AppError(409, 'DUPLICATE_PLATE', 'Ya existe un vehículo con esta placa');
      const vehicle = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
      this.repo.insertVehicle(vehicle);
      return vehicle;
    });
  }

  clients(user: User) { allow(user, ['ADMIN', 'RECEPTIONIST']); return this.repo.clients(); }
  vehicles(user: User) { allow(user, ['ADMIN', 'RECEPTIONIST', 'MECHANIC']); return this.repo.vehicles(); }
  mechanics(user: User) { allow(user, ['ADMIN', 'RECEPTIONIST']); return this.identities.listMechanics(); }
}
