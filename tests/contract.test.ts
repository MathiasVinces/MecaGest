import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { fixture } from './helpers.js';

let f: Awaited<ReturnType<typeof fixture>>;
// El documento desreferenciado se usa solo en pruebas de contrato.
let spec: any;
const ajv = new Ajv({ strict: false });
addFormats.default(ajv);
beforeAll(async () => {
  spec = await SwaggerParser.validate('docs/openapi.yaml');
});
beforeEach(async () => { f = await fixture(); });
afterEach(() => f?.db.close());

function conforms(path: string, method: string, response: { status: number; body: unknown }) {
  const definition = spec.paths[path][method].responses[response.status];
  expect(definition, `${method} ${path}: HTTP ${response.status} debe estar documentado`).toBeDefined();
  const schema = definition.content?.['application/json']?.schema;
  if (schema) {
    const validate = ajv.compile(schema);
    const valid = validate(response.body);
    expect(valid, JSON.stringify(validate.errors)).toBe(true);
  }
}

it('el contrato es válido y cubre exactamente todas las rutas de negocio', () => {
  const raw = parse(readFileSync('docs/openapi.yaml', 'utf8'));
  const actual = [...readFileSync('src/presentation/app.ts', 'utf8').matchAll(/app\.(get|post|put|delete)\('([^']+)'/g)]
    .filter(match => match[2].startsWith('/api/') || match[2] === '/health')
    .map(match => `${match[1]} ${match[2].replace(/:([a-z]+)/g, '{$1}')}`).sort();
  const documented = Object.entries(raw.paths).flatMap(([path, methods]) => Object.keys(methods as object).map(method => `${method} ${path}`)).sort();
  expect(actual).toEqual(documented);
});

it('las respuestas reales del recorrido completo cumplen los esquemas OpenAPI', async () => {
  conforms('/api/clients', 'post', { status: 201, body: f.client });
  conforms('/api/vehicles', 'post', { status: 201, body: f.vehicle });
  conforms('/api/orders', 'post', { status: 201, body: f.order });
  conforms('/api/intakes', 'post', await f.api.post('/api/intakes').set('Authorization', f.bearer()).send({ plate: 'NEW2026', reason: 'Revisar ruido', mechanicId: f.ids.mecanico, newVehicle: { brand: 'Toyota', model: 'Corolla', owner: { clientId: f.client.id } } }).expect(201));
  conforms('/api/orders/{id}', 'get', await f.api.get(`/api/orders/${f.order.id}`).set('Authorization', f.bearer()).expect(200));
  conforms('/api/orders/{id}/diagnosis', 'put', await f.diagnose());
  conforms('/api/orders/{id}/authorization', 'post', await f.approve());
  conforms('/api/orders/{id}/repair/start', 'post', await f.start());
  conforms('/api/orders/{id}/repairs', 'post', await f.api.post(`/api/orders/${f.order.id}/repairs`).set('Authorization', f.bearer('mecanico')).send({ activity: 'Trabajo terminado', outcome: 'COMPLETED' }).expect(200));
  conforms('/api/vehicles/by-plate/{plate}/history', 'get', await f.api.get('/api/vehicles/by-plate/DEM0001/history').set('Authorization', f.bearer()).expect(200));
  for (const path of ['/api/clients', '/api/vehicles', '/api/mechanics', '/api/orders', '/api/me', '/health']) {
    conforms(path, 'get', await f.api.get(path).set('Authorization', f.bearer()).expect(200));
  }
});

it('los errores de autenticación, validación, permisos y estado cumplen el contrato', async () => {
  conforms('/api/orders', 'get', await f.api.get('/api/orders').expect(401));
  conforms('/api/orders', 'post', await f.api.post('/api/orders').set('Authorization', f.bearer()).send({}).expect(422));
  conforms('/api/intakes', 'post', await f.api.post('/api/intakes').set('Authorization', f.bearer()).send({}).expect(422));
  conforms('/api/orders/{id}/authorization', 'post', await f.api.post(`/api/orders/${f.order.id}/authorization`).set('Authorization', f.bearer('mecanico')).send({ decision: 'APPROVED', evidence: 'Prueba' }).expect(403));
  conforms('/api/orders/{id}/repair/start', 'post', await f.api.post(`/api/orders/${f.order.id}/repair/start`).set('Authorization', f.bearer()).expect(409));
});
