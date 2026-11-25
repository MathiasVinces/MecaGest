import { test as base, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { bootstrap } from '../src/bootstrap.js';
import type { Role, User } from '../src/domain/models.js';

type Workshop = ReturnType<typeof bootstrap> & { url: string; password: string; users: Record<string, User> };
const test = base.extend<{ workshop: Workshop }>({
  workshop: async ({}, use) => {
    const context = bootstrap(':memory:', () => {});
    const users: Record<string, User> = {};
    const password = randomUUID();
    for (const [username, role] of [['admin', 'ADMIN'], ['recepcion', 'RECEPTIONIST'], ['mecanico', 'MECHANIC'], ['otro', 'MECHANIC']] as [string, Role][]) {
      users[username] = await context.services.auth.provision(username, role, password);
    }
    const server = context.app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    try { await use({ ...context, password, users, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }); }
    finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
      context.db.close();
    }
  },
});

async function login(page: Page, workshop: Workshop, username = 'admin') {
  await page.goto(workshop.url);
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(workshop.password);
  await page.getByRole('button', { name: 'Ingresar al taller' }).click();
  await expect(page.getByRole('heading', { name: 'Tu taller, en orden.' })).toBeVisible();
}

function seedOrder(workshop: Workshop, plate = 'DEM0001') {
  const { catalog, orders } = workshop.services;
  const client = catalog.createClient(workshop.users.admin, { name: 'Cliente ficticio', phone: '0000000000' });
  const vehicle = catalog.createVehicle(workshop.users.admin, { clientId: client.id, plate, brand: 'Marca demo', model: 'Modelo demo' });
  return orders.create(workshop.users.admin, { vehicleId: vehicle.id, mechanicId: workshop.users.mecanico.id, reason: 'Revisar frenos' });
}

test('completa ingreso, diagnóstico, autorización, reparación e historial usando formularios', async ({ page, workshop }, testInfo) => {
  await login(page, workshop);
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  await page.getByLabel('Nombre del cliente').fill('Cliente de presentación');
  await page.getByLabel('Teléfono').fill('0000000000');
  await page.getByRole('button', { name: 'Guardar cliente' }).click();
  await expect(page.getByRole('cell', { name: 'Cliente de presentación', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Vehículos', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo vehículo' }).click();
  await page.getByLabel('Cliente', { exact: true }).selectOption({ label: 'Cliente de presentación' });
  await page.getByLabel('Placa', { exact: true }).fill('DEM-2026');
  await page.getByLabel('Marca', { exact: true }).fill('Chevrolet');
  await page.getByLabel('Modelo', { exact: true }).fill('Aveo');
  await page.getByRole('button', { name: 'Guardar vehículo' }).click();
  await expect(page.getByText('DEM2026', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Órdenes de trabajo', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva orden', exact: true }).click();
  await page.getByLabel('Vehículo', { exact: true }).selectOption({ label: 'DEM2026 · Chevrolet Aveo' });
  await page.getByLabel('Mecánico responsable').selectOption({ label: 'mecanico' });
  await page.getByLabel('Motivo de ingreso', { exact: true }).fill('Ruido al frenar');
  await page.getByRole('button', { name: 'Crear orden' }).click();
  await expect(page.getByRole('heading', { name: 'Registrar diagnóstico' })).toBeVisible();
  const orderUrl = page.url();
  await page.getByLabel('Hallazgos', { exact: true }).fill('Pastillas desgastadas');
  await page.getByLabel('Trabajo recomendado', { exact: true }).fill('Sustituir pastillas de freno');
  await page.getByRole('button', { name: 'Guardar diagnóstico' }).click();
  await expect(page.getByRole('heading', { name: 'Decisión del cliente' })).toBeVisible();
  await page.getByLabel('Decisión', { exact: true }).selectOption('APPROVED');
  await page.getByLabel('Constancia de la decisión').fill('Aceptación ficticia registrada para la exposición');
  await page.getByRole('button', { name: 'Registrar decisión' }).click();
  await page.getByRole('button', { name: 'Iniciar reparación' }).click();
  await page.getByLabel('Actividad o resultado').fill('Repuesto pendiente');
  await page.getByLabel('Resultado de la actualización').selectOption('BLOCKED');
  await page.getByRole('button', { name: 'Guardar actividad' }).click();
  await expect(page.getByText('La orden está en espera.', { exact: false })).toBeVisible();
  await page.getByLabel('Actividad o resultado').fill('Repuesto recibido e instalado');
  await page.getByLabel('Resultado de la actualización').selectOption('PROGRESS');
  let releaseSave!: () => void;
  const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
  await page.route('**/api/orders/*/repairs', async route => { await saveGate; await route.continue(); }, { times: 1 });
  await page.getByRole('button', { name: 'Guardar actividad' }).click();
  try {
    await expect(page.getByLabel('Actividad o resultado')).toBeDisabled();
    await expect(page.getByLabel('Resultado de la actualización')).toBeDisabled();
  } finally { releaseSave(); }
  await page.getByLabel('Actividad o resultado').fill('Frenos comprobados; trabajo finalizado');
  await page.getByLabel('Resultado de la actualización').selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Guardar actividad' }).click();
  await expect(page.getByRole('heading', { name: 'Servicio finalizado' })).toBeVisible();
  await expect(page.getByText('3 actividades', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('orden-finalizada.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Servicio finalizado' })).toBeVisible();
  await page.getByRole('link', { name: 'Historial', exact: true }).click();
  await page.getByLabel('Placa del vehículo').fill('dem-2026');
  await page.getByRole('button', { name: 'Buscar historial' }).click();
  await expect(page.getByRole('heading', { name: 'DEM2026', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver orden', exact: true }).click();
  await expect(page).toHaveURL(orderUrl);
  expect(workshop.db.get<{ status: string }>('SELECT status FROM orders')?.status).toBe('COMPLETED');
  expect(workshop.db.all('SELECT * FROM repairs')).toHaveLength(3);
});

test('muestra errores de acceso y revoca la sesión al salir', async ({ page, workshop }) => {
  await page.goto(workshop.url);
  await page.getByLabel('Usuario', { exact: true }).fill('admin');
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar al taller' }).click();
  await expect(page.getByRole('alert')).toContainText('no coinciden');
  await page.getByLabel('Contraseña', { exact: true }).fill(workshop.password);
  await page.getByRole('button', { name: 'Ingresar al taller' }).click();
  await expect(page.getByRole('heading', { name: 'Tu taller, en orden.' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenido a MecaGest' })).toBeVisible();
  expect(workshop.db.all('SELECT * FROM sessions')).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('mecagest.session'))).toBeNull();
});

test('oculta acciones restringidas para recepción y para otro mecánico', async ({ page, workshop }) => {
  const order = seedOrder(workshop);
  await login(page, workshop, 'recepcion');
  await expect(page.getByRole('link', { name: 'Historial', exact: true })).toHaveCount(0);
  await page.goto(`${workshop.url}/#orden/${order.id}`);
  await expect(page.getByText('Tu cuenta tiene acceso de consulta.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar diagnóstico' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await login(page, workshop, 'otro');
  await expect(page.getByRole('link', { name: 'Clientes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nueva orden', exact: true })).toHaveCount(0);
  await page.goto(`${workshop.url}/#orden/${order.id}`);
  await expect(page.getByRole('button', { name: 'Guardar diagnóstico' })).toHaveCount(0);
});

test('mecánico asignado diagnostica pero no autoriza', async ({ page, workshop }) => {
  const order = seedOrder(workshop);
  await login(page, workshop, 'mecanico');
  await page.goto(`${workshop.url}/#orden/${order.id}`);
  await page.getByLabel('Hallazgos', { exact: true }).fill('Falla identificada');
  await page.getByLabel('Trabajo recomendado', { exact: true }).fill('Reparación de prueba');
  await page.getByRole('button', { name: 'Guardar diagnóstico' }).click();
  await expect(page.getByText('El encargado debe registrar la decisión', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar decisión' })).toHaveCount(0);
});

test('muestra validación de placa duplicada y mantiene los datos para corregir', async ({ page, workshop }) => {
  seedOrder(workshop);
  await login(page, workshop);
  await page.getByRole('link', { name: 'Vehículos', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo vehículo' }).click();
  await page.getByLabel('Cliente', { exact: true }).selectOption({ label: 'Cliente ficticio' });
  await page.getByLabel('Placa', { exact: true }).fill('dem-0001');
  await page.getByLabel('Marca', { exact: true }).fill('Marca');
  await page.getByLabel('Modelo', { exact: true }).fill('Modelo');
  await page.getByRole('button', { name: 'Guardar vehículo' }).click();
  await expect(page.getByRole('alert')).toContainText('Ya existe un vehículo');
  await expect(page.getByLabel('Placa', { exact: true })).toHaveValue('dem-0001');
  expect(workshop.db.all('SELECT * FROM vehicles')).toHaveLength(1);
});

test('filtra registros y muestra contenido ingresado como texto, sin ejecutar HTML', async ({ page, workshop }, testInfo) => {
  seedOrder(workshop);
  const name = '<img src=x onerror="window.inyectado=true">';
  workshop.services.catalog.createClient(workshop.users.admin, { name, phone: '0000000000' });
  await login(page, workshop);
  await page.screenshot({ path: testInfo.outputPath('resumen.png'), fullPage: true });
  await page.getByRole('link', { name: 'Clientes', exact: true }).click();
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => 'inyectado' in window)).toBe(false);
  await page.getByLabel('Buscar clientes').fill('inexistente');
  await expect(page.getByRole('heading', { name: 'No hay clientes para mostrar' })).toBeVisible();
  await page.getByLabel('Buscar clientes').fill('Cliente ficticio');
  await expect(page.getByRole('cell', { name: 'Cliente ficticio', exact: true })).toBeVisible();
  const currentUrl = page.url();
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(currentUrl);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recupera una sesión vencida y mantiene accesible la pantalla de ingreso', async ({ page, workshop }, testInfo) => {
  await login(page, workshop);
  workshop.db.run("UPDATE sessions SET expiresAt = '2000-01-01T00:00:00.000Z'");
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenido a MecaGest' })).toBeVisible();
  await expect(page.getByLabel('Usuario', { exact: true })).toBeEditable();
  await page.screenshot({ path: testInfo.outputPath('acceso.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
