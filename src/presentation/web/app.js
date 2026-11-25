import { escapeHtml as esc, icon, badge, statusNames, roleNames, date, empty, input, textarea, select } from './ui.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#form-dialog');
const notifications = document.querySelector('#notifications');
const sessionKey = 'mecagest.session';
const state = { token: sessionStorage.getItem(sessionKey), user: null, clients: [], vehicles: [], mechanics: [], orders: [], search: '', filter: '', revision: 0 };
let toastTimer;
const isReception = () => ['ADMIN', 'RECEPTIONIST'].includes(state.user?.role);
const canHistory = () => ['ADMIN', 'MECHANIC'].includes(state.user?.role);
const canWork = order => state.user.role === 'ADMIN' || (state.user.role === 'MECHANIC' && state.user.id === order.mechanicId);
const route = () => location.hash.slice(1) || 'inicio';
const vehicleFor = id => state.vehicles.find(v => v.id === id);
const clientName = id => state.clients.find(c => c.id === id)?.name ?? 'Cliente del taller';
const mechanicName = id => state.mechanics.find(m => m.id === id)?.username ?? (id === state.user?.id ? state.user.username : 'Mecánico asignado');
const orderCode = id => `OT-${id.slice(0, 6).toUpperCase()}`;
const actionButton = (action, label, symbol = 'plus', kind = 'primary') => `<button class="btn ${kind}" data-action="${action}">${icon(symbol)}${label}</button>`;
const openOrder = id => `<a class="order-link" href="#orden/${esc(id)}">Ver orden</a>`;

function notify(message, error = false) {
  clearTimeout(toastTimer);
  notifications.innerHTML = `<div class="toast ${error ? 'error' : ''}">${icon(error ? 'alert' : 'checkCircle')}<span>${esc(message)}</span></div>`;
  toastTimer = setTimeout(() => { notifications.replaceChildren(); }, 5500);
}

function clearSession() {
  state.revision++;
  state.token = null; state.user = null;
  state.clients = []; state.vehicles = []; state.orders = []; state.mechanics = [];
  sessionStorage.removeItem(sessionKey);
  if (dialog.open) dialog.close();
  renderLogin();
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: { ...(auth && state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new Error('No se pudo conectar con el taller. Comprueba que el servidor esté encendido e inténtalo de nuevo.'); }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && auth && state.token) {
      clearSession(); notify('Tu sesión terminó. Vuelve a iniciar sesión.', true);
    }
    const messages = {
      VALIDATION_ERROR: 'Revisa los campos: no deben estar vacíos y deben respetar el formato indicado.',
      INVALID_CREDENTIALS: 'El usuario o la contraseña no coinciden. Revisa tus datos.',
      INVALID_STATE: 'La orden cambió de estado. Actualiza la página antes de continuar.',
      TOO_MANY_ATTEMPTS: 'Has realizado varios intentos seguidos. Espera un minuto e inténtalo de nuevo.',
    };
    throw new Error(messages[data.error?.code] ?? data.error?.message ?? 'No se pudo completar la operación.');
  }
  return data;
}

async function loadData() {
  const revision = state.revision;
  const [orders, vehicles, clients, mechanics] = await Promise.all([
    api('/orders'), api('/vehicles'),
    isReception() ? api('/clients') : Promise.resolve([]),
    isReception() ? api('/mechanics') : Promise.resolve([]),
  ]);
  if (!state.user || revision !== state.revision) return false;
  Object.assign(state, { orders, vehicles, clients, mechanics });
  return true;
}

function renderLogin() {
  document.title = 'MecaGest · Iniciar sesión';
  root.innerHTML = `<div class="login-layout">
    <section class="login-story" aria-label="MecaGest">
      <div class="brand"><img src="/assets/logo.svg" alt=""><strong>MecaGest</strong></div>
      <div class="login-copy"><div class="eyebrow">Gestión para tu taller</div><h1>Cada vehículo.<br>Cada servicio.<br><em>Todo en orden.</em></h1><p>Del primer diagnóstico a la entrega final, acompaña cada trabajo desde un solo lugar.</p>
        <svg class="workshop-drawing" viewBox="0 0 440 180" fill="none" aria-hidden="true"><path d="M15 151h410M65 145V30h9v115M363 145V30h9v115M61 29h17M359 29h17" stroke="#467180" stroke-width="2"/><path d="m105 92 24-43h169l30 43M107 92h220l18 18v25H91v-25l16-18Z" fill="#153f4d" stroke="#78bdc1" stroke-width="2"/><path d="m145 62-13 29h165l-20-29H145Z" fill="#255665" stroke="#78bdc1" stroke-width="2"/><rect x="107" y="135" width="29" height="17" rx="4" fill="#102b39" stroke="#78bdc1" stroke-width="2"/><rect x="301" y="135" width="29" height="17" rx="4" fill="#102b39" stroke="#78bdc1" stroke-width="2"/><path d="M108 110h39M291 110h39M188 118h58" stroke="#6dd5c2" stroke-width="5"/><path d="M73 133h17M345 133h19M172 49l9 43M253 49l-4 43" stroke="#78bdc1" stroke-width="2"/><circle cx="402" cy="60" r="17" fill="#174d50"/><path d="m394 60 5 5 10-11" stroke="#65dbc2" stroke-width="2"/></svg>
      </div><div class="story-footer">${icon('shield')}<span>Un espacio de trabajo para cada rol del taller.</span></div>
    </section>
    <main class="login-panel" id="main-content"><div class="login-card"><div class="welcome-icon">${icon('wrench')}</div><h2>Bienvenido a MecaGest</h2><p class="muted">Ingresa a tu espacio de trabajo.</p>
      <form id="login-form"><div class="login-error" role="alert"></div>
        ${input('username', 'Usuario', { placeholder: 'Tu nombre de usuario', autocomplete: 'username', max: 80 })}
        <div class="field"><label for="password">Contraseña</label><div class="password-wrap"><input type="password" name="password" id="password" autocomplete="current-password" required maxlength="128" placeholder="Ingresa tu contraseña"><button type="button" class="icon-button" data-action="toggle-password" aria-label="Mostrar contraseña" aria-pressed="false">${icon('eye')}</button></div></div>
        <button class="btn primary full" type="submit">Ingresar al taller</button>
      </form><p class="login-footnote">Usa la cuenta asignada por el administrador. Tus permisos se aplican automáticamente al iniciar sesión.</p>
    </div></main></div>`;
}

function renderShell() {
  const navigation = [['inicio', 'Resumen', 'grid'], ['ordenes', 'Órdenes de trabajo', 'orders'], ['vehiculos', 'Vehículos', 'car'], ...(isReception() ? [['clientes', 'Clientes', 'people']] : []), ...(canHistory() ? [['historial', 'Historial', 'history']] : [])];
  root.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#inicio"><img src="/assets/logo.svg" alt=""><span><strong>MecaGest</strong><span class="brand-caption">GESTIÓN DEL TALLER</span></span></a>
    <p class="eyebrow nav-caption">Espacio de trabajo</p><nav aria-label="Navegación principal">${navigation.map(([path, label, symbol]) => `<a class="nav-item" href="#${path}" data-nav="${path}">${icon(symbol)}${label}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="workshop-note">${icon('building')}<div><strong>Mi taller</strong><span>Servicios y mantenimiento</span></div></div></div>
  </aside><div class="main-area"><header class="topbar"><span class="topbar-label">${icon('building')}Panel del taller</span><div class="account"><div class="avatar" aria-hidden="true">${esc(state.user.username.slice(0, 2).toUpperCase())}</div><div><div class="account-name">${esc(state.user.username)}</div><div class="account-role">${roleNames[state.user.role]}</div></div><button class="icon-button" data-action="logout" title="Cerrar sesión o cambiar de usuario" aria-label="Cerrar sesión">${icon('logout')}</button></div></header><main id="main-content" class="main-content" tabindex="-1"></main></div></div>`;
}

function heading(title, subtitle, actions = '', eyebrow = '') {
  return `<div class="page-heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}

function orderTable(orders, compact = false) {
  if (!orders.length) return empty('No hay órdenes para mostrar', 'Las órdenes aparecerán aquí cuando registres un ingreso.', 'orders', isReception() ? actionButton('new-order', 'Nueva orden') : '');
  return `<div class="table-scroll"><table><thead><tr><th>Vehículo / orden</th>${compact ? '' : '<th>Motivo de ingreso</th>'}<th>Estado</th><th class="hide-mobile">Fecha de ingreso</th><th><span class="sr-only">Detalle</span></th></tr></thead><tbody>${orders.map(order => {
    const vehicle = vehicleFor(order.vehicleId);
    return `<tr><td><div class="vehicle-cell"><span class="plate-icon">${icon('car')}</span><div><span class="plate">${esc(vehicle?.plate ?? 'Vehículo')}</span><span class="secondary-line">${esc(compact ? `${vehicle?.brand ?? ''} ${vehicle?.model ?? ''}` : orderCode(order.id))}</span></div></div></td>${compact ? '' : `<td><span>${esc(order.reason.length > 64 ? order.reason.slice(0, 64) + '…' : order.reason)}</span><span class="secondary-line">${esc(mechanicName(order.mechanicId))}</span></td>`}<td>${badge(order.status)}</td><td class="hide-mobile">${date(order.createdAt)}</td><td>${openOrder(order.id)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function renderDashboard() {
  const orders = state.orders;
  const active = orders.filter(o => !['COMPLETED', 'REJECTED'].includes(o.status));
  const waiting = orders.filter(o => o.status === 'AWAITING_AUTHORIZATION');
  const repairing = orders.filter(o => ['IN_REPAIR', 'BLOCKED'].includes(o.status));
  const completed = orders.filter(o => o.status === 'COMPLETED');
  const queue = orders.filter(o => ['AWAITING_AUTHORIZATION', 'BLOCKED'].includes(o.status)).slice(0, 3);
  const stats = [['Órdenes activas', active.length, 'Servicios en seguimiento', 'orders'], ['Por autorizar', waiting.length, 'Pendientes de una decisión', 'clock'], ['En reparación', repairing.length, 'Incluye trabajos en espera', 'wrench'], ['Finalizadas', completed.length, 'Servicios completados', 'checkCircle']];
  const counts = ['RECEIVED', 'DIAGNOSING', 'AUTHORIZED'].map(s => [s, orders.filter(o => o.status === s).length]);
  return heading('Tu taller, en orden.', 'Consulta el avance de los servicios y organiza el siguiente paso.', isReception() ? actionButton('new-order', 'Nueva orden') : actionButton('refresh', 'Actualizar', 'refresh', 'secondary'), 'Resumen del taller') +
    `<section class="stats" aria-label="Resumen de órdenes">${stats.map(([label, count, hint, symbol]) => `<div class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><div class="stat-value">${count}</div><div class="stat-sub">${hint}</div></div>`).join('')}</section>
    <div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Órdenes recientes</h2><p>El movimiento más reciente de tu taller.</p></div><a class="btn quiet" href="#ordenes">Ver todas</a></div>${orderTable(orders.slice(0, 6), true)}<div class="panel-footer">${state.vehicles.length} ${state.vehicles.length === 1 ? 'vehículo registrado' : 'vehículos registrados'} · ${orders.length} ${orders.length === 1 ? 'orden en total' : 'órdenes en total'}</div></section>
    <aside class="dashboard-side"><section class="panel"><div class="panel-heading"><h2 class="queue-heading">${icon('alert')}Requieren atención</h2><span class="count-pill">${orders.filter(o => ['AWAITING_AUTHORIZATION', 'BLOCKED'].includes(o.status)).length}</span></div>${queue.length ? `<div class="queue">${queue.map(o => `<div class="queue-item"><div class="queue-head"><strong class="plate">${esc(vehicleFor(o.vehicleId)?.plate)}</strong>${badge(o.status)}</div><p>${o.status === 'BLOCKED' ? 'Hay una incidencia pendiente de resolver.' : 'El diagnóstico está listo para la decisión del cliente.'}</p>${openOrder(o.id)}</div>`).join('')}</div>` : empty('Todo al día', 'No hay autorizaciones o incidencias pendientes.', 'checkCircle')}</section>
    <section class="panel process-panel"><div class="panel-heading"><h2>Próximos pasos</h2></div><div class="process-list">${counts.map(([s, n], i) => `<div class="process-row"><span class="process-label"><span class="process-icon">${icon(['car', 'search', 'shield'][i])}</span>${['Ingresos por revisar', 'Diagnósticos en curso', 'Listas para reparar'][i]}</span><strong>${n}</strong></div>`).join('')}</div></section></aside></div>`;
}

function renderOrders() {
  return heading('Órdenes de trabajo', 'Sigue cada servicio desde el ingreso hasta su finalización.', isReception() ? actionButton('new-order', 'Nueva orden') : '') + `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon('search')}<input id="list-search" aria-label="Buscar órdenes" placeholder="Buscar por placa, motivo o código…" value="${esc(state.search)}"></div><select id="status-filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${Object.entries(statusNames).map(([key, name]) => `<option value="${key}" ${state.filter === key ? 'selected' : ''}>${name}</option>`).join('')}</select><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`;
}

function renderClients() {
  return heading('Clientes', 'Mantén a mano la información de contacto del taller.', actionButton('new-client', 'Nuevo cliente')) + `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon('search')}<input id="list-search" aria-label="Buscar clientes" placeholder="Buscar por nombre o teléfono…" value="${esc(state.search)}"></div><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`;
}

function renderVehicles() {
  return heading('Vehículos', 'Identifica cada vehículo y consulta sus servicios.', isReception() ? actionButton('new-vehicle', 'Nuevo vehículo') : '') + `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon('search')}<input id="list-search" aria-label="Buscar vehículos" placeholder="Buscar por placa, marca o modelo…" value="${esc(state.search)}"></div><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`;
}

function fillList() {
  const target = document.querySelector('#list-content');
  if (!target) return;
  const query = state.search.trim().toLocaleLowerCase('es');
  let items;
  if (route() === 'ordenes') {
    items = state.orders.filter(o => (!state.filter || o.status === state.filter) && `${vehicleFor(o.vehicleId)?.plate} ${o.reason} ${orderCode(o.id)}`.toLocaleLowerCase('es').includes(query));
    target.innerHTML = items.length ? orderTable(items) : empty('No se encontraron órdenes', query || state.filter ? 'Prueba con otra búsqueda o selecciona todos los estados.' : 'Registra un vehículo y crea su primera orden.', 'orders');
  } else if (route() === 'clientes') {
    items = state.clients.filter(c => `${c.name} ${c.phone}`.toLocaleLowerCase('es').includes(query));
    target.innerHTML = items.length ? `<div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Teléfono</th><th>Vehículos</th><th class="hide-mobile">Registrado</th></tr></thead><tbody>${items.map(c => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone)}</td><td>${state.vehicles.filter(v => v.clientId === c.id).length}</td><td class="hide-mobile">${date(c.createdAt)}</td></tr>`).join('')}</tbody></table></div>` : empty('No hay clientes para mostrar', 'Registra el primer cliente o ajusta tu búsqueda.', 'people');
  } else {
    items = state.vehicles.filter(v => `${v.plate} ${v.brand} ${v.model}`.toLocaleLowerCase('es').includes(query));
    target.innerHTML = items.length ? `<div class="table-scroll"><table><thead><tr><th>Vehículo</th>${isReception() ? '<th>Cliente</th>' : ''}<th>Órdenes</th>${canHistory() ? '<th>Servicios</th>' : ''}</tr></thead><tbody>${items.map(v => `<tr><td><div class="vehicle-cell"><span class="plate-icon">${icon('car')}</span><div><span class="plate">${esc(v.plate)}</span><span class="secondary-line">${esc(v.brand)} ${esc(v.model)}</span></div></div></td>${isReception() ? `<td>${esc(clientName(v.clientId))}</td>` : ''}<td>${state.orders.filter(o => o.vehicleId === v.id).length}</td>${canHistory() ? `<td><a class="order-link" href="#historial/${encodeURIComponent(v.plate)}">Ver historial</a></td>` : ''}</tr>`).join('')}</tbody></table></div>` : empty('No hay vehículos para mostrar', 'Registra un vehículo para iniciar su seguimiento.', 'car');
  }
  document.querySelector('#result-count').textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'}`;
}

function renderHistory(plate = '') {
  return heading('Historial del vehículo', 'Consulta diagnósticos, decisiones y reparaciones en un solo lugar.') + `<section class="panel"><form class="history-search" id="history-form">${input('history-plate', 'Placa del vehículo', { value: plate, max: 14, placeholder: 'Ej. DEM-0001' })}<button type="submit" class="btn primary">${icon('search')}Buscar historial</button></form></section><div id="history-result" class="history-result">${empty('Los antecedentes, siempre a mano', 'Busca una placa para consultar todos sus servicios.', 'history')}</div>`;
}

async function searchHistory(plate, revision) {
  const target = document.querySelector('#history-result');
  if (!target) return;
  target.innerHTML = '<div class="loading"><span class="spinner"></span>Buscando historial…</div>';
  try {
    const history = await api(`/vehicles/by-plate/${encodeURIComponent(plate)}/history`);
    if (state.revision !== revision || !target.isConnected) return;
    const v = history.vehicle;
    target.innerHTML = `<div class="history-vehicle"><span class="order-car-icon">${icon('car')}</span><div><h2>${esc(v.plate)}</h2><p class="muted">${esc(v.brand)} ${esc(v.model)} · ${history.orders.length} servicios</p></div></div><section class="panel">${history.orders.length ? orderTable(history.orders) : empty('Este vehículo aún no tiene servicios', 'Su historial aparecerá cuando se registre la primera orden.', 'history')}</section>`;
  } catch (error) {
    if (state.revision === revision && target.isConnected) target.innerHTML = `<div class="content-error" role="alert">${esc(error.message)}</div>`;
  }
}

function actionPanel(order) {
  let content = '';
  const form = (name, body, button) => `<form id="${name}" data-order-id="${esc(order.id)}">${body}<div class="form-error" role="alert"></div><button class="btn primary full" type="submit">${button}</button></form>`;
  if (['COMPLETED', 'REJECTED'].includes(order.status)) {
    return `<section class="panel"><div class="closed-message">${icon(order.status === 'COMPLETED' ? 'checkCircle' : 'file')}<h2>${order.status === 'COMPLETED' ? 'Servicio finalizado' : 'Servicio rechazado'}</h2><p>Esta orden está cerrada. Sus registros permanecen disponibles para consulta.</p></div></section>`;
  }
  if (['RECEIVED', 'DIAGNOSING'].includes(order.status) && canWork(order)) {
    content = `<div class="panel-heading"><div><h2>Registrar diagnóstico</h2><p>Documenta lo que necesita el vehículo.</p></div></div><div class="panel-body">${form('diagnosis-form', textarea('findings', 'Hallazgos', order.diagnosis?.findings) + textarea('recommendedWork', 'Trabajo recomendado', order.diagnosis?.recommendedWork) + select('complete', 'Estado del diagnóstico', [['true', 'Completo · solicitar autorización'], ['false', 'Pendiente · continuar revisión']], 'true', 'Un diagnóstico completo pasa a autorización y ya no se edita.'), 'Guardar diagnóstico')}</div>`;
  } else if (order.status === 'AWAITING_AUTHORIZATION' && state.user.role === 'ADMIN') {
    content = `<div class="panel-heading"><div><h2>Decisión del cliente</h2><p>Confirma su decisión antes de reparar.</p></div></div><div class="panel-body">${form('authorization-form', select('decision', 'Decisión', [['', 'Selecciona una decisión'], ['APPROVED', 'Autorizar reparación'], ['REJECTED', 'Rechazar servicio']]) + textarea('evidence', 'Constancia de la decisión', '', 'Indica cómo se recibió la aceptación o el rechazo. La decisión registrada es definitiva.'), 'Registrar decisión')}</div>`;
  } else if (order.status === 'AUTHORIZED' && canWork(order)) {
    content = `<div class="panel-heading"><h2>Lista para trabajar</h2></div><div class="panel-body"><div class="callout">${icon('shield')}<p>El cliente autorizó el servicio. Puedes iniciar la reparación.</p></div>${form('start-form', '', 'Iniciar reparación')}</div>`;
  } else if (['IN_REPAIR', 'BLOCKED'].includes(order.status) && canWork(order)) {
    content = `<div class="panel-heading"><div><h2>Actualizar reparación</h2><p>Deja constancia de cada actividad.</p></div></div><div class="panel-body">${order.status === 'BLOCKED' ? `<div class="callout warn">${icon('clock')}<p>La orden está en espera. Registra la resolución para continuar el trabajo autorizado.</p></div>` : ''}${form('repair-form', textarea('activity', 'Actividad o resultado') + select('outcome', 'Resultado de la actualización', [['PROGRESS', 'En progreso · continuar reparación'], ['BLOCKED', 'En espera · registrar incidencia'], ['COMPLETED', 'Finalizada · cerrar orden']], 'PROGRESS', 'Al finalizar, describe el trabajo realizado y las comprobaciones. La orden quedará cerrada.'), 'Guardar actividad')}</div>`;
  } else {
    const message = order.status === 'AWAITING_AUTHORIZATION' ? 'El encargado debe registrar la decisión del cliente antes de continuar.' : 'El mecánico asignado o el administrador puede continuar esta orden. Tu cuenta tiene acceso de consulta.';
    return `<section class="panel"><div class="panel-heading"><h2>Siguiente paso</h2></div><div class="read-only">${icon('lock')}<p>${message}</p></div></section>`;
  }
  return `<section class="panel action-panel">${content}</section>`;
}

function renderOrder(order) {
  const v = vehicleFor(order.vehicleId);
  const stage = { RECEIVED: 0, DIAGNOSING: 1, AWAITING_AUTHORIZATION: 2, AUTHORIZED: 2, IN_REPAIR: 3, BLOCKED: 3, COMPLETED: 4, REJECTED: 2 }[order.status];
  const diagnosis = order.diagnosis;
  const authorization = order.authorization;
  return `<a class="back-link" href="#ordenes">Todas las órdenes</a>` +
    heading(`<span class="order-heading"><span class="order-car-icon">${icon('car')}</span><span>${esc(v?.plate ?? 'Vehículo')}<span class="muted small" style="display:block;font-weight:400;letter-spacing:0;margin-top:6px">${esc(v?.brand)} ${esc(v?.model)} · ${esc(orderCode(order.id))}</span></span></span>`, '', badge(order.status)) +
    `<div class="stepper" aria-label="Etapa actual: ${esc(statusNames[order.status])}">${[['Ingreso', 'car'], ['Diagnóstico', 'search'], ['Autorización', 'shield'], ['Reparación', 'wrench'], ['Finalización', 'checkCircle']].map(([title, symbol], index) => `<div class="step ${index < stage ? 'done' : index === stage ? 'current' : ''}"><span class="step-symbol">${icon(index < stage ? 'check' : symbol)}</span>${title}</div>`).join('')}</div>
    <div class="detail-grid"><div class="detail-stack"><section class="panel"><div class="panel-heading"><h2>Información del ingreso</h2></div><div class="panel-body"><div class="details-meta"><div><span class="meta-label">Fecha de ingreso</span><span class="meta-value">${date(order.createdAt, true)}</span></div><div><span class="meta-label">Responsable</span><span class="meta-value">${esc(mechanicName(order.mechanicId))}</span></div>${isReception() ? `<div><span class="meta-label">Cliente</span><span class="meta-value">${esc(clientName(v?.clientId))}</span></div>` : ''}<div><span class="meta-label">Última actualización</span><span class="meta-value">${date(order.updatedAt, true)}</span></div></div><span class="meta-label">Motivo de ingreso</span><p class="text-block">${esc(order.reason)}</p></div></section>
    <section class="panel"><div class="panel-heading"><h2>Diagnóstico</h2>${diagnosis ? `<span class="badge ${diagnosis.complete ? 'AUTHORIZED' : 'DIAGNOSING'}">${diagnosis.complete ? 'Completo' : 'Pendiente'}</span>` : ''}</div>${diagnosis ? `<div class="panel-body"><div class="diagnosis-block"><span class="meta-label">Hallazgos</span><p class="text-block">${esc(diagnosis.findings)}</p></div><div class="diagnosis-block"><span class="meta-label">Trabajo recomendado</span><p class="text-block">${esc(diagnosis.recommendedWork)}</p></div></div>` : empty('Pendiente de revisión', 'El diagnóstico del mecánico aparecerá aquí.', 'search')}</section>
    ${authorization ? `<section class="panel"><div class="panel-heading"><h2>Autorización del cliente</h2>${badge(authorization.decision === 'APPROVED' ? 'AUTHORIZED' : 'REJECTED')}</div><div class="panel-body"><span class="meta-label">Constancia · ${date(authorization.createdAt, true)}</span><p class="text-block">${esc(authorization.evidence)}</p></div></section>` : ''}
    <section class="panel"><div class="panel-heading"><h2>Registro de reparación</h2><span class="count-pill">${order.repairs.length} actividades</span></div>${order.repairs.length ? `<div class="panel-body"><ol class="timeline">${order.repairs.map(r => `<li><div class="timeline-top">${badge(r.outcome === 'PROGRESS' ? 'IN_REPAIR' : r.outcome)}<time datetime="${esc(r.createdAt)}">${date(r.createdAt, true)}</time></div><p>${esc(r.activity)}</p></li>`).join('')}</ol></div>` : empty('Aún no hay actividades', 'El registro comienza cuando la reparación está autorizada.', 'wrench')}</section></div>${actionPanel(order)}</div>`;
}

async function renderRoute() {
  if (!state.user) return;
  const revision = ++state.revision;
  const current = route();
  if ((current === 'clientes' && !isReception()) || (current.startsWith('historial') && !canHistory())) { location.hash = 'inicio'; return; }
  const activeNav = current.startsWith('orden/') ? 'ordenes' : current.split('/')[0];
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === activeNav);
    if (link.dataset.nav === activeNav) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  const main = document.querySelector('#main-content');
  const titles = { inicio: 'Resumen', ordenes: 'Órdenes de trabajo', clientes: 'Clientes', vehiculos: 'Vehículos', historial: 'Historial', orden: 'Detalle de orden' };
  document.title = `MecaGest · ${titles[current.split('/')[0]] ?? 'Taller'}`;
  if (current.startsWith('orden/')) {
    main.innerHTML = '<div class="loading"><span class="spinner"></span>Cargando orden…</div>';
    try {
      const order = await api(`/orders/${encodeURIComponent(current.slice(6))}`);
      if (revision !== state.revision || !main.isConnected) return;
      main.innerHTML = renderOrder(order);
    } catch (error) {
      if (revision === state.revision && main.isConnected) main.innerHTML = `<div class="content-error" role="alert"><h2>No se pudo abrir la orden</h2><p>${esc(error.message)}</p><a href="#ordenes">Volver a órdenes</a></div>`;
    }
  } else if (current.startsWith('historial')) {
    let plate = '';
    try { plate = decodeURIComponent(current.split('/')[1] ?? ''); } catch { /* Una ruta inválida vuelve a búsqueda vacía. */ }
    main.innerHTML = renderHistory(plate);
    if (plate) await searchHistory(plate, revision);
  } else {
    main.innerHTML = ({ ordenes: renderOrders, clientes: renderClients, vehiculos: renderVehicles }[current] ?? renderDashboard)();
    fillList();
  }
}

async function synchronize() {
  if (await loadData()) await renderRoute();
}

function showDialog(title, subtitle, name, fields, submitLabel) {
  dialog.innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Cerrar formulario">${icon('close')}</button></div><div class="dialog-body"><form id="${name}">${fields}<div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn secondary" data-action="close-dialog">Cancelar</button><button type="submit" class="btn primary">${submitLabel}</button></div></form></div>`;
  dialog.showModal();
}

function newClient() {
  showDialog('Nuevo cliente', 'Registra sus datos de contacto.', 'client-form', input('name', 'Nombre del cliente', { min: 2, max: 100, autocomplete: 'name', placeholder: 'Nombre y apellido' }) + input('phone', 'Teléfono', { type: 'tel', min: 5, max: 25, autocomplete: 'tel', placeholder: 'Número de contacto' }), 'Guardar cliente');
}

function newVehicle() {
  if (!state.clients.length) { notify('Primero registra un cliente para asociar el vehículo.'); newClient(); return; }
  showDialog('Nuevo vehículo', 'Asocia el vehículo con su propietario.', 'vehicle-form', select('clientId', 'Cliente', [['', 'Selecciona un cliente'], ...state.clients.map(c => [c.id, c.name])]) + input('plate', 'Placa', { max: 14, placeholder: 'Ej. DEM-0001', hint: 'Se guarda en mayúsculas, sin espacios ni guiones.' }) + `<div class="form-row">${input('brand', 'Marca', { max: 80, placeholder: 'Ej. Chevrolet' })}${input('model', 'Modelo', { max: 80, placeholder: 'Ej. Aveo' })}</div>`, 'Guardar vehículo');
}

function newOrder() {
  if (!state.vehicles.length) { notify('Primero registra el vehículo que ingresará al taller.'); newVehicle(); return; }
  const available = state.vehicles.filter(v => !state.orders.some(o => o.vehicleId === v.id && !['COMPLETED', 'REJECTED'].includes(o.status)));
  if (!available.length) { notify('Todos los vehículos registrados tienen una orden abierta. Registra otro vehículo o finaliza un servicio.', true); return; }
  if (!state.mechanics.length) { notify('No hay mecánicos disponibles para asignar. Contacta al administrador.', true); return; }
  showDialog('Nueva orden de trabajo', 'Registra la solicitud y asigna un responsable.', 'order-form', select('vehicleId', 'Vehículo', [['', 'Selecciona un vehículo'], ...available.map(v => [v.id, `${v.plate} · ${v.brand} ${v.model}`])], '', 'Solo aparecen vehículos sin una orden abierta.') + select('mechanicId', 'Mecánico responsable', [['', 'Selecciona un mecánico'], ...state.mechanics.map(m => [m.id, m.username])]) + textarea('reason', 'Motivo de ingreso', '', 'Describe la solicitud del cliente o el problema observado.'), 'Crear orden');
}

async function handleAction(action, button) {
  if (action === 'toggle-password') {
    const password = document.querySelector('#password');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    button.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.setAttribute('aria-pressed', String(visible));
  } else if (action === 'close-dialog') dialog.close();
  else if (action === 'logout') {
    button.disabled = true;
    try { await api('/auth/session', { method: 'DELETE' }); clearSession(); }
    catch (error) { button.disabled = false; notify(error.message, true); }
  } else if (action === 'refresh') {
    button.disabled = true;
    try { await synchronize(); notify('Información actualizada.'); } finally { button.disabled = false; }
  } else if (isReception()) {
    if (action === 'new-client') newClient();
    if (action === 'new-vehicle') newVehicle();
    if (action === 'new-order') newOrder();
  }
}

async function submitForm(form, values) {
  if (form.id === 'login-form') {
    const session = await api('/auth/login', { method: 'POST', body: values, auth: false });
    state.token = session.token; state.user = session.user;
    sessionStorage.setItem(sessionKey, session.token);
    renderShell();
    document.querySelector('#main-content').innerHTML = '<div class="loading"><span class="spinner"></span>Preparando tu taller…</div>';
    try { await synchronize(); }
    catch (error) { clearSession(); document.querySelector('.login-error').textContent = error.message; }
    return;
  }
  if (form.id === 'history-form') {
    const next = `historial/${encodeURIComponent(String(values['history-plate']).trim())}`;
    if (route() === next) await searchHistory(String(values['history-plate']), ++state.revision); else location.hash = next;
    return;
  }
  const id = form.dataset.orderId;
  let result, message;
  switch (form.id) {
    case 'client-form': result = await api('/clients', { method: 'POST', body: values }); message = 'Cliente registrado.'; break;
    case 'vehicle-form': result = await api('/vehicles', { method: 'POST', body: values }); message = 'Vehículo registrado.'; break;
    case 'order-form': result = await api('/orders', { method: 'POST', body: values }); message = 'Orden creada y asignada al mecánico.'; break;
    case 'diagnosis-form': result = await api(`/orders/${id}/diagnosis`, { method: 'PUT', body: { ...values, complete: values.complete === 'true' } }); message = result.diagnosis.complete ? 'Diagnóstico guardado. La orden espera autorización.' : 'Diagnóstico pendiente guardado.'; break;
    case 'authorization-form': result = await api(`/orders/${id}/authorization`, { method: 'POST', body: values }); message = result.status === 'REJECTED' ? 'Rechazo registrado. La orden quedó cerrada.' : 'Autorización registrada. La reparación puede comenzar.'; break;
    case 'start-form': result = await api(`/orders/${id}/repair/start`, { method: 'POST' }); message = 'Reparación iniciada.'; break;
    case 'repair-form': result = await api(`/orders/${id}/repairs`, { method: 'POST', body: values }); message = result.status === 'COMPLETED' ? 'Trabajo finalizado. El historial quedó actualizado.' : 'Actividad registrada.'; break;
    default: return;
  }
  if (dialog.open) dialog.close();
  // La escritura ya se confirmó: un fallo al refrescar no debe provocar un segundo envío.
  notify(message);
  try {
    if (await loadData()) {
      if (form.id === 'order-form') location.hash = `orden/${result.id}`;
      else await renderRoute();
    }
  } catch { notify('Los cambios se guardaron. Recarga la página para actualizar la vista.', true); }
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    const main = document.querySelector('#main-content');
    main.setAttribute('tabindex', '-1');
    main.focus();
    return;
  }
  const button = event.target.closest('[data-action]');
  if (button && !button.disabled) handleAction(button.dataset.action, button).catch(error => notify(error.message, true));
});
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.busy === 'true') return;
  form.dataset.busy = 'true';
  const errorBox = form.querySelector('[role="alert"]');
  if (errorBox) errorBox.textContent = '';
  const values = Object.fromEntries(new FormData(form));
  const controls = [...form.querySelectorAll('button, input, select, textarea')];
  const disabledBefore = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  form.setAttribute('aria-busy', 'true');
  try { await submitForm(form, values); }
  catch (error) {
    if (errorBox?.isConnected) { errorBox.textContent = error.message; errorBox.scrollIntoView({ block: 'nearest' }); }
    else notify(error.message, true);
  } finally { form.dataset.busy = 'false'; form.removeAttribute('aria-busy'); controls.forEach((control, index) => { control.disabled = disabledBefore[index]; }); }
});
document.addEventListener('input', event => { if (event.target.id === 'list-search') { state.search = event.target.value; fillList(); } });
document.addEventListener('change', event => { if (event.target.id === 'status-filter') { state.filter = event.target.value; fillList(); } });
window.addEventListener('hashchange', () => {
  state.search = ''; state.filter = '';
  if (dialog.open) dialog.close();
  if (state.user) renderRoute().then(() => { document.querySelector('#main-content')?.focus({ preventScroll: true }); window.scrollTo(0, 0); });
});
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

async function boot() {
  if (!state.token) { renderLogin(); return; }
  try {
    state.user = await api('/me');
    renderShell(); await synchronize();
  } catch (error) { clearSession(); document.querySelector('.login-error').textContent = error.message; }
}
boot();
