import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { resolve } from 'node:path';
import { ZodError } from 'zod';
import type { AuthService } from '../application/auth-service.js';
import type { CatalogService } from '../application/catalog-service.js';
import type { OrderService } from '../application/order-service.js';
import { AppError } from '../application/errors.js';
import type { User } from '../domain/models.js';

export interface Services { auth: AuthService; catalog: CatalogService; orders: OrderService }

export function createApp(services: Services, reportError: (error: unknown) => void = console.error) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '32kb' }));
  app.get('/', (_req, res) => res.sendFile(resolve('src/presentation/web/index.html')));
  app.use('/assets', express.static(resolve('src/presentation/web'), { index: false, dotfiles: 'deny' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'MecaGest' }));
  app.get('/openapi.yaml', (_req, res) => res.sendFile(resolve('docs/openapi.yaml')));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(null, {
    swaggerOptions: { url: '/openapi.yaml', persistAuthorization: false },
    customSiteTitle: 'MecaGest | API del taller',
  }));

  const attempts = new Map<string, { count: number; until: number }>();
  const loginLimit: RequestHandler = (req, _res, next) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const ip = req.ip ?? 'unknown';
    const entry = attempts.get(ip) ?? { count: 0, until: now + 60_000 };
    attempts.set(ip, entry);
    entry.count++;
    if (entry.count > 10) return next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Máximo 10 intentos de inicio de sesión por minuto'));
    next();
  };

  app.post('/api/auth/login', loginLimit, async (req, res) => res.json(await services.auth.login(req.body)));
  app.use('/api', (req, res, next) => {
    const header = req.get('Authorization');
    const token = header?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
    res.locals.user = services.auth.authenticate(token);
    res.locals.token = token;
    next();
  });
  app.delete('/api/auth/session', (_req, res) => { services.auth.logout(res.locals.token); res.sendStatus(204); });
  app.get('/api/me', (_req, res) => res.json(res.locals.user));

  // Los controladores solo traducen HTTP a llamadas de aplicación; no contienen SQL ni reglas de estado.
  app.get('/api/mechanics', (_req, res) => res.json(services.catalog.mechanics(res.locals.user as User)));
  app.get('/api/clients', (_req, res) => res.json(services.catalog.clients(res.locals.user as User)));
  app.post('/api/clients', (req, res) => res.status(201).json(services.catalog.createClient(res.locals.user as User, req.body)));
  app.get('/api/vehicles', (_req, res) => res.json(services.catalog.vehicles(res.locals.user as User)));
  app.post('/api/vehicles', (req, res) => res.status(201).json(services.catalog.createVehicle(res.locals.user as User, req.body)));
  app.get('/api/vehicles/by-plate/:plate/history', (req, res) => res.json(services.orders.history(res.locals.user as User, String(req.params.plate))));
  app.get('/api/orders', (_req, res) => res.json(services.orders.list(res.locals.user as User)));
  app.post('/api/orders', (req, res) => res.status(201).json(services.orders.create(res.locals.user as User, req.body)));
  app.get('/api/orders/:id', (req, res) => res.json(services.orders.detail(res.locals.user as User, String(req.params.id))));
  app.put('/api/orders/:id/diagnosis', (req, res) => res.json(services.orders.diagnose(res.locals.user as User, String(req.params.id), req.body)));
  app.post('/api/orders/:id/authorization', (req, res) => res.json(services.orders.authorize(res.locals.user as User, String(req.params.id), req.body)));
  app.post('/api/orders/:id/repair/start', (req, res) => res.json(services.orders.startRepair(res.locals.user as User, String(req.params.id))));
  app.post('/api/orders/:id/repairs', (req, res) => res.json(services.orders.recordRepair(res.locals.user as User, String(req.params.id), req.body)));
  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Ruta no encontrada')));

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los campos de la solicitud', details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) } });
    } else if (error instanceof AppError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
    } else if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo no contiene JSON válido' } });
    } else if (error?.type === 'entity.too.large') {
      res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'El cuerpo excede 32 KB' } });
    } else {
      reportError(error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación' } });
    }
  };
  app.use(errors);
  return app;
}
