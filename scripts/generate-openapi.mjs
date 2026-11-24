import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const str = (minLength = 1, maxLength = 2000) => ({ type: 'string', minLength, maxLength });
const uuid = { type: 'string', format: 'uuid' };
const date = { type: 'string', format: 'date-time' };
const enumeration = values => ({ type: 'string', enum: values.split('|') });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties });
const array = name => ({ type: 'array', items: ref(name) });
const states = 'RECEIVED|DIAGNOSING|AWAITING_AUTHORIZATION|AUTHORIZED|REJECTED|IN_REPAIR|BLOCKED|COMPLETED';
const sampleId = '11111111-1111-4111-8111-111111111111';
const sampleDate = '2026-11-24T12:00:00.000Z';
const orderProperties = { id: uuid, vehicleId: uuid, mechanicId: uuid, reason: str(), status: enumeration(states), createdAt: date, updatedAt: date };
const schemas = {
  User: object({ id: uuid, username: str(1, 80), role: enumeration('ADMIN|RECEPTIONIST|MECHANIC') }),
  LoginInput: object({ username: str(1, 80), password: { ...str(1, 128), writeOnly: true } }),
  Session: object({ token: { type: 'string', pattern: '^[a-f0-9]{64}$' }, expiresAt: date, user: ref('User') }),
  ClientInput: object({ name: str(2, 100), phone: { type: 'string', pattern: '^[+0-9 ()-]{5,25}$' } }),
  Client: object({ id: uuid, name: str(2, 100), phone: str(5, 25), createdAt: date }),
  VehicleInput: object({ clientId: uuid, plate: { type: 'string', maxLength: 14, pattern: '^[a-zA-Z0-9 -]+$', description: 'Se eliminan espacios y guiones y se convierte a mayúsculas. El resultado debe tener entre 5 y 10 letras o dígitos.' }, brand: str(1, 80), model: str(1, 80) }),
  Vehicle: object({ id: uuid, clientId: uuid, plate: { type: 'string', pattern: '^[A-Z0-9]{5,10}$' }, brand: str(1, 80), model: str(1, 80), createdAt: date }),
  OrderInput: object({ vehicleId: uuid, mechanicId: uuid, reason: str() }),
  Order: object(orderProperties),
  DiagnosisInput: object({ findings: str(), recommendedWork: str(), complete: { type: 'boolean' } }),
  Diagnosis: object({ orderId: uuid, findings: str(), recommendedWork: str(), complete: { type: 'boolean' }, recordedBy: uuid, updatedAt: date }),
  AuthorizationInput: object({ decision: enumeration('APPROVED|REJECTED'), evidence: str() }),
  Authorization: object({ orderId: uuid, decision: enumeration('APPROVED|REJECTED'), evidence: str(), recordedBy: uuid, createdAt: date }),
  RepairInput: object({ activity: str(), outcome: enumeration('PROGRESS|BLOCKED|COMPLETED') }),
  Repair: object({ id: uuid, orderId: uuid, activity: str(), outcome: enumeration('PROGRESS|BLOCKED|COMPLETED'), recordedBy: uuid, createdAt: date }),
  Health: object({ status: enumeration('ok'), service: enumeration('MecaGest') }),
  Error: object({ error: object({ code: str(), message: str(), details: { type: 'array', items: object({ field: { type: 'string' }, message: str() }) } }, ['code', 'message']) }),
};
schemas.OrderDetail = object({ ...orderProperties, diagnosis: { ...schemas.Diagnosis, nullable: true }, authorization: { ...schemas.Authorization, nullable: true }, repairs: array('Repair') });
schemas.History = object({ vehicle: ref('Vehicle'), orders: array('OrderDetail'), message: str() });

const examples = {
  ClientInput: { name: 'Cliente de demostración', phone: '0000000000' },
  VehicleInput: { clientId: sampleId, plate: 'DEM-0001', brand: 'Marca demo', model: 'Modelo demo' },
  OrderInput: { vehicleId: sampleId, mechanicId: sampleId, reason: 'Ruido al frenar' },
  DiagnosisInput: { findings: 'Pastillas desgastadas', recommendedWork: 'Cambiar pastillas y comprobar frenos', complete: true },
  AuthorizationInput: { decision: 'APPROVED', evidence: 'Constancia ficticia para demostración académica' },
  RepairInput: { activity: 'Pastillas sustituidas y frenos comprobados', outcome: 'COMPLETED' },
};
schemas.OrderDetail.example = { id: sampleId, vehicleId: sampleId, mechanicId: sampleId, reason: 'Ruido al frenar', status: 'RECEIVED', createdAt: sampleDate, updatedAt: sampleDate, diagnosis: null, authorization: null, repairs: [] };
const codes = {
  400: ['INVALID_JSON', 'El cuerpo no contiene JSON válido'],
  401: ['UNAUTHENTICATED', 'Inicia sesión para continuar'],
  403: ['FORBIDDEN', 'Tu rol no permite esta operación'],
  404: ['NOT_FOUND', 'Orden no encontrada'],
  409: ['INVALID_STATE', 'La operación no se permite en el estado actual'],
  413: ['BODY_TOO_LARGE', 'El cuerpo excede 32 KB'],
  422: ['VALIDATION_ERROR', 'Revisa los campos de la solicitud'],
  429: ['TOO_MANY_ATTEMPTS', 'Máximo 10 intentos de inicio de sesión por minuto'],
  500: ['INTERNAL_ERROR', 'No se pudo completar la operación'],
};
const errorResponse = status => ({
  description: codes[status][1],
  content: { 'application/json': { schema: ref('Error'), example: { error: { code: codes[status][0], message: codes[status][1] } } } },
});
const paths = {};
function route(method, path, operationId, summary, tag, responseSchema, options = {}) {
  const { input, status = 200, errors = [], description = '', public: isPublic = false } = options;
  const responses = {
    [status]: status === 204 ? { description: 'Sesión revocada, sin cuerpo' } : { description: 'Operación completada', content: { 'application/json': { schema: typeof responseSchema === 'string' ? ref(responseSchema) : responseSchema } } },
  };
  for (const code of new Set([400, 413, 500, ...(!isPublic ? [401] : []), ...errors])) responses[code] = errorResponse(code);
  const operation = { operationId, summary, description, tags: [tag], responses };
  if (isPublic) operation.security = [];
  if (input) operation.requestBody = {
    required: true,
    content: { 'application/json': { schema: ref(input), ...(examples[input] ? { example: examples[input] } : {}) } },
  };
  if (path.includes('{id}')) operation.parameters = [{ name: 'id', in: 'path', required: true, description: 'UUID de la orden', schema: uuid }];
  if (path.includes('{plate}')) operation.parameters = [{ name: 'plate', in: 'path', required: true, description: 'Placa; se normaliza igual que al crear el vehículo', schema: schemas.VehicleInput.properties.plate, example: 'DEM-0001' }];
  paths[path] ??= {};
  paths[path][method] = operation;
}
route('get', '/health', 'health', 'Comprobar que responde el proceso HTTP', 'Sistema', 'Health', { public: true, description: 'No verifica servicios externos ni acredita disponibilidad de 8 horas.' });
route('post', '/api/auth/login', 'login', 'Iniciar sesión', 'Sesión', 'Session', { public: true, input: 'LoginInput', errors: [401, 422, 429], description: 'Credenciales generadas por npm run seed. Responde INVALID_CREDENTIALS (401) si no coinciden. Token Bearer opaco con vigencia de 8 horas. Máximo 10 intentos/IP/minuto.' });
route('delete', '/api/auth/session', 'logout', 'Cerrar la sesión actual', 'Sesión', null, { status: 204 });
route('get', '/api/me', 'currentUser', 'Consultar usuario autenticado', 'Sesión', 'User');
route('get', '/api/mechanics', 'listMechanics', 'Listar mecánicos para asignación', 'Catálogos', array('User'), { errors: [403], description: 'ADMIN o RECEPTIONIST.' });
route('get', '/api/clients', 'listClients', 'Listar clientes', 'Catálogos', array('Client'), { errors: [403], description: 'ADMIN o RECEPTIONIST.' });
route('post', '/api/clients', 'createClient', 'Registrar cliente', 'CU-01 Ingreso', 'Client', { status: 201, input: 'ClientInput', errors: [403, 422], description: 'ADMIN o RECEPTIONIST. Datos ficticios durante demostraciones.' });
route('get', '/api/vehicles', 'listVehicles', 'Listar vehículos', 'Catálogos', array('Vehicle'));
route('post', '/api/vehicles', 'createVehicle', 'Registrar vehículo de un cliente', 'CU-01 Ingreso', 'Vehicle', { status: 201, input: 'VehicleInput', errors: [403, 404, 409, 422], description: 'ADMIN o RECEPTIONIST. 404 si el cliente no existe; 409 DUPLICATE_PLATE si la placa normalizada ya está registrada.' });
route('get', '/api/orders', 'listOrders', 'Listar órdenes del taller', 'CU-01 Ingreso', array('Order'));
route('post', '/api/orders', 'createOrder', 'Crear orden y asignar mecánico', 'CU-01 Ingreso', 'OrderDetail', { status: 201, input: 'OrderInput', errors: [403, 404, 409, 422], description: 'ADMIN o RECEPTIONIST. Estado inicial RECEIVED. 404 si el vehículo o usuario no existe; 422 INVALID_MECHANIC si no es mecánico; 409 OPEN_ORDER_EXISTS si existe una orden abierta del vehículo.' });
route('get', '/api/orders/{id}', 'getOrder', 'Consultar detalle completo de la orden', 'CU-01 Ingreso', 'OrderDetail', { errors: [404, 422] });
route('put', '/api/orders/{id}/diagnosis', 'saveDiagnosis', 'Guardar diagnóstico borrador o completo', 'CU-02 Diagnóstico', 'OrderDetail', { input: 'DiagnosisInput', errors: [403, 404, 409, 422], description: 'ADMIN o mecánico asignado (403 NOT_ASSIGNED en otro caso). Desde RECEIVED/DIAGNOSING. complete=false deja DIAGNOSING; complete=true pasa a AWAITING_AUTHORIZATION y bloquea posteriores ediciones.' });
route('post', '/api/orders/{id}/authorization', 'authorizeOrder', 'Registrar aceptación o rechazo del cliente', 'CU-03 Autorización', 'OrderDetail', { input: 'AuthorizationInput', errors: [403, 404, 409, 422], description: 'Solo ADMIN (encargado). Requiere AWAITING_AUTHORIZATION. La constancia es obligatoria. APPROVED pasa a AUTHORIZED; REJECTED termina la orden. La decisión no puede sobrescribirse.' });
route('post', '/api/orders/{id}/repair/start', 'startRepair', 'Iniciar reparación autorizada', 'CU-04 Reparación', 'OrderDetail', { errors: [403, 404, 409, 422], description: 'ADMIN o mecánico asignado. Solo desde AUTHORIZED; pasa a IN_REPAIR. Sin cuerpo.' });
route('post', '/api/orders/{id}/repairs', 'recordRepair', 'Registrar avance, incidencia o finalización', 'CU-04 Reparación', 'OrderDetail', { input: 'RepairInput', errors: [403, 404, 409, 422], description: 'ADMIN o mecánico asignado. Desde IN_REPAIR/BLOCKED. PROGRESS pasa a IN_REPAIR, BLOCKED conserva pendiente por incidencia, COMPLETED cierra. Actividad y estado se guardan en la misma transacción. Un trabajo adicional no se considera aprobado automáticamente.' });
route('get', '/api/vehicles/by-plate/{plate}/history', 'getVehicleHistory', 'Consultar historial por placa', 'CU-05 Historial', 'History', { errors: [403, 404, 422], description: 'ADMIN o MECHANIC. Devuelve todas las órdenes, incluso abiertas/rechazadas, con diagnóstico, autorización y actividades. Un vehículo conocido sin órdenes devuelve 200, orders=[] y mensaje explícito. Vehículo inexistente: 404.' });

const document = {
  openapi: '3.0.3',
  info: { title: 'MecaGest API', version: '1.0.0', description: 'Monolito académico para un taller. Todos los textos se recortan y rechazan campos desconocidos. No se envían credenciales en la URL. Los ejemplos son ficticios. La autenticación habilita los permisos del rol, no el acceso a otros talleres. Despliegue local de evaluación; no incluye facturación, pagos ni multi-taller.' },
  servers: [{ url: '/', description: 'Mismo servidor que sirve este contrato' }],
  security: [{ bearerAuth: [] }],
  tags: ['Sistema', 'Sesión', 'Catálogos', 'CU-01 Ingreso', 'CU-02 Diagnóstico', 'CU-03 Autorización', 'CU-04 Reparación', 'CU-05 Historial'].map(name => ({ name })),
  paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'Token obtenido con POST /api/auth/login' } }, schemas },
};
writeFileSync('docs/openapi.yaml', '# Generado con npm run api:generate; editar scripts/generate-openapi.mjs\n' + stringify(document, { aliasDuplicateObjects: false, lineWidth: 110 }));
console.log(`OpenAPI generado: ${Object.values(paths).reduce((sum, methods) => sum + Object.keys(methods).length, 0)} operaciones.`);
