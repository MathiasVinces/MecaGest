import { Database } from './persistence/database.js';
import { IdentityRepository } from './persistence/identity-repository.js';
import { WorkshopRepository } from './persistence/workshop-repository.js';
import { AuthService } from './application/auth-service.js';
import { CatalogService } from './application/catalog-service.js';
import { OrderService } from './application/order-service.js';
import { createApp } from './presentation/app.js';

// Único punto que conecta todas las capas. Los controladores nunca instancian repositorios.
export function bootstrap(path: string, reportError?: (error: unknown) => void) {
  const db = new Database(path);
  const identities = new IdentityRepository(db), workshop = new WorkshopRepository(db);
  const services = {
    auth: new AuthService(identities),
    catalog: new CatalogService(workshop, identities),
    orders: new OrderService(workshop, identities),
  };
  return { app: createApp(services, reportError), services, db };
}
