import {
  escapeHtml as esc,
  icon,
  badge,
  statusNames,
  roleNames,
  date,
  empty,
  input,
  textarea,
  select,
} from "./ui.js";

const root = document.querySelector("#app");
const dialog = document.querySelector("#form-dialog");
const notifications = document.querySelector("#notifications");
const sessionKey = "mecagest.session";
const state = {
  token: sessionStorage.getItem(sessionKey),
  user: null,
  clients: [],
  vehicles: [],
  mechanics: [],
  orders: [],
  search: "",
  filter: "",
  revision: 0,
};
let toastTimer;
const isReception = () => ["ADMIN", "RECEPTIONIST"].includes(state.user?.role);
const canHistory = () => ["ADMIN", "MECHANIC"].includes(state.user?.role);
const canWork = (order) =>
  state.user.role === "ADMIN" ||
  (state.user.role === "MECHANIC" && state.user.id === order.mechanicId);
const route = () => location.hash.slice(1) || "inicio";
const vehicleFor = (id) => state.vehicles.find((v) => v.id === id);
const clientName = (id) =>
  state.clients.find((c) => c.id === id)?.name ?? "Cliente del taller";
const mechanicName = (id) =>
  state.mechanics.find((m) => m.id === id)?.username ??
  (id === state.user?.id ? state.user.username : "Mecánico asignado");
const orderCode = (id) => `OT-${id.slice(0, 6).toUpperCase()}`;
const actionButton = (action, label, symbol = "plus", kind = "primary") =>
  `<button class="btn ${kind}" data-action="${action}">${icon(symbol)}${label}</button>`;
const openOrder = (id) =>
  `<a class="order-link" href="#orden/${esc(id)}">Ver orden</a>`;

function notify(message, error = false) {
  clearTimeout(toastTimer);
  notifications.innerHTML = `<div class="toast ${error ? "error" : ""}">${icon(error ? "alert" : "checkCircle")}<span>${esc(message)}</span></div>`;
  toastTimer = setTimeout(() => {
    notifications.replaceChildren();
  }, 5500);
}

function clearSession() {
  state.revision++;
  state.token = null;
  state.user = null;
  state.clients = [];
  state.vehicles = [];
  state.orders = [];
  state.mechanics = [];
  sessionStorage.removeItem(sessionKey);
  if (dialog.open) dialog.close();
  renderLogin();
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(auth && state.token
          ? { Authorization: `Bearer ${state.token}` }
          : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con el taller. Comprueba que el servidor esté encendido e inténtalo de nuevo.",
    );
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && auth && state.token) {
      clearSession();
      notify("Tu sesión terminó. Vuelve a iniciar sesión.", true);
    }
    const messages = {
      VALIDATION_ERROR:
        "Revisa los campos: no deben estar vacíos y deben respetar el formato indicado.",
      INVALID_CREDENTIALS:
        "El usuario o la contraseña no coinciden. Revisa tus datos.",
      INVALID_STATE:
        "La orden cambió de estado. Actualiza la página antes de continuar.",
      TOO_MANY_ATTEMPTS:
        "Has realizado varios intentos seguidos. Espera un minuto e inténtalo de nuevo.",
    };
    throw new Error(
      messages[data.error?.code] ??
        data.error?.message ??
        "No se pudo completar la operación.",
    );
  }
  return data;
}

async function loadData() {
  const revision = state.revision;
  const [orders, vehicles, clients, mechanics] = await Promise.all([
    api("/orders"),
    api("/vehicles"),
    isReception() ? api("/clients") : Promise.resolve([]),
    isReception() ? api("/mechanics") : Promise.resolve([]),
  ]);
  if (!state.user || revision !== state.revision) return false;
  Object.assign(state, { orders, vehicles, clients, mechanics });
  return true;
}

function renderLogin() {
  document.title = "MecaGest · Iniciar sesión";
  root.innerHTML = `<main class="login-layout" id="main-content"><section class="login-story"><div class="brand"><img src="/assets/logo.svg" alt=""><strong>MecaGest<span>EL CUADERNO DE TU TALLER</span></strong></div><div class="login-copy"><p class="eyebrow">Menos papeles. Más taller.</p><h1>Un trabajo<br>bien llevado.</h1><p>Recibe el vehículo. Sigue la reparación.<br>Encuentra lo que hiciste.</p></div><div class="shop-sign"><span>RECEPCIÓN</span><span>REVISIÓN</span><span>REPARACIÓN</span></div></section><section class="login-panel"><div class="login-card"><p class="eyebrow">Vamos al trabajo</p><h2>Bienvenido a MecaGest</h2><p class="muted">Entra con tu cuenta del taller.</p><form id="login-form"><div class="login-error" role="alert"></div>${input("username", "Usuario", { autocomplete: "username", max: 80 })}<div class="field"><label for="password">Contraseña</label><div class="password-wrap"><input type="password" name="password" id="password" autocomplete="current-password" required maxlength="128"><button type="button" class="icon-button" data-action="toggle-password" aria-label="Mostrar contraseña" aria-pressed="false">${icon("eye")}</button></div></div><button class="btn primary full" type="submit">Ingresar al taller</button></form><p class="login-footnote">¿No recuerdas tu acceso? Pide ayuda al encargado.</p></div></section></main>`;
}

function renderShell() {
  root.innerHTML = `<div class="shell"><header class="masthead"><a class="brand" href="#inicio"><img src="/assets/logo.svg" alt=""><strong>MecaGest<span>EL CUADERNO DE TU TALLER</span></strong></a><nav aria-label="Navegación principal"><a class="nav-item" href="#inicio" data-nav="inicio">Taller</a>${canHistory() ? '<a class="nav-item" href="#historial" data-nav="historial">Historial</a>' : ""}<a class="nav-item" href="#archivo" data-nav="archivo">Archivo</a></nav><div class="account"><span>${esc(state.user.username)}<small>${roleNames[state.user.role]}</small></span><button class="btn exit-button" data-action="logout" aria-label="Cerrar sesión">Salir</button></div></header><main id="main-content" class="main-content" tabindex="-1"></main><footer class="site-footer"><strong>MecaGest</strong><span>Cada trabajo tiene su historia.</span></footer></div>`;
}

function heading(title, subtitle, actions = "", eyebrow = "") {
  return `<div class="page-heading"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}<h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}

function orderTable(orders, compact = false) {
  if (!orders.length)
    return empty(
      "No hay órdenes para mostrar",
      "Las órdenes aparecerán aquí cuando registres un ingreso.",
      "orders",
      isReception() ? actionButton("new-order", "Recibir vehículo") : "",
    );
  return `<div class="table-scroll"><table><thead><tr><th>Vehículo / orden</th>${compact ? "" : "<th>Motivo de ingreso</th>"}<th>Estado</th><th class="hide-mobile">Fecha de ingreso</th><th><span class="sr-only">Detalle</span></th></tr></thead><tbody>${orders
    .map((order) => {
      const vehicle = vehicleFor(order.vehicleId);
      return `<tr><td><div class="vehicle-cell"><span class="plate-icon">${icon("car")}</span><div><span class="plate">${esc(vehicle?.plate ?? "Vehículo")}</span><span class="secondary-line">${esc(compact ? `${vehicle?.brand ?? ""} ${vehicle?.model ?? ""}` : orderCode(order.id))}</span></div></div></td>${compact ? "" : `<td><span>${esc(order.reason.length > 64 ? order.reason.slice(0, 64) + "…" : order.reason)}</span><span class="secondary-line">${esc(mechanicName(order.mechanicId))}</span></td>`}<td>${badge(order.status)}</td><td class="hide-mobile">${date(order.createdAt)}</td><td>${openOrder(order.id)}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function renderDashboard() {
  const active = state.orders.filter(
    (o) => !["COMPLETED", "REJECTED"].includes(o.status),
  );
  return `<div class="workbench"><section class="welcome-board"><p class="eyebrow">Tu jornada, sin enredos</p><h1>El taller,<br>a la vista.</h1><p>Recibe un vehículo o continúa<br>un trabajo pendiente.</p>${isReception() ? actionButton("new-order", "Recibir vehículo", "plus") : actionButton("refresh", "Actualizar trabajos", "refresh")}<div class="board-count"><strong>${active.length}</strong><span>${active.length === 1 ? "vehículo en el taller" : "vehículos en el taller"}</span></div></section><section class="work-list"><div class="list-heading"><h2>Trabajos en curso</h2><a class="text-link" href="#ordenes">Ver todos</a></div><div class="search-wrap">${icon("search")}<input id="work-search" aria-label="Buscar trabajo por placa" placeholder="Escribe una placa para encontrarla"></div><div id="work-items">${workTickets(active)}</div></section></div>`;
}

function nextTask(order) {
  return {
    RECEIVED: "Revisar vehículo",
    DIAGNOSING: "Continuar revisión",
    AWAITING_AUTHORIZATION: "Consultar al cliente",
    AUTHORIZED: "Comenzar reparación",
    IN_REPAIR: "Continuar trabajo",
    BLOCKED: "Resolver demora",
    COMPLETED: "Ver trabajo terminado",
    REJECTED: "Ver decisión",
  }[order.status];
}

function workTickets(orders) {
  if (!orders.length)
    return empty(
      "No hay trabajos pendientes",
      "Cuando recibas un vehículo, lo encontrarás aquí.",
      "wrench",
    );
  return orders
    .map((o) => {
      const v = vehicleFor(o.vehicleId);
      return `<article class="work-ticket"><div class="ticket-head"><strong class="license">${esc(v?.plate)}</strong>${badge(o.status)}</div><p class="vehicle-name">${esc(v?.brand)} ${esc(v?.model)}</p><p class="ticket-reason">${esc(o.reason)}</p><div class="ticket-bottom"><span>${esc(mechanicName(o.mechanicId))}</span><a class="btn secondary" href="#orden/${o.id}">${nextTask(o)}</a></div></article>`;
    })
    .join("");
}

function renderArchive() {
  return (
    heading(
      "Archivo del taller",
      "Los datos guardados, cuando los necesites.",
    ) +
    `<div class="archive-links"><a href="#vehiculos">${icon("car")}<span><strong>Vehículos</strong><small>Placas y datos del vehículo</small></span></a>${isReception() ? `<a href="#clientes">${icon("people")}<span><strong>Clientes</strong><small>Nombres y teléfonos de contacto</small></span></a>` : ""}<a href="#ordenes">${icon("orders")}<span><strong>Todos los trabajos</strong><small>En curso, terminados y rechazados</small></span></a></div>`
  );
}

function renderOrders() {
  return (
    heading(
      "Órdenes de trabajo",
      "Sigue cada servicio desde el ingreso hasta su finalización.",
      isReception() ? actionButton("new-order", "Recibir vehículo") : "",
    ) +
    `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon("search")}<input id="list-search" aria-label="Buscar órdenes" placeholder="Buscar por placa, motivo o código…" value="${esc(state.search)}"></div><select id="status-filter" aria-label="Filtrar por estado"><option value="">Todos los estados</option>${Object.entries(
      statusNames,
    )
      .map(
        ([key, name]) =>
          `<option value="${key}" ${state.filter === key ? "selected" : ""}>${name}</option>`,
      )
      .join(
        "",
      )}</select><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`
  );
}

function renderClients() {
  return (
    heading(
      "Clientes",
      "Mantén a mano la información de contacto del taller.",
      actionButton("new-client", "Nuevo cliente"),
    ) +
    `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon("search")}<input id="list-search" aria-label="Buscar clientes" placeholder="Buscar por nombre o teléfono…" value="${esc(state.search)}"></div><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`
  );
}

function renderVehicles() {
  return (
    heading(
      "Vehículos",
      "Identifica cada vehículo y consulta sus servicios.",
      isReception() ? actionButton("new-vehicle", "Nuevo vehículo") : "",
    ) +
    `<section class="panel"><div class="toolbar"><div class="search-wrap">${icon("search")}<input id="list-search" aria-label="Buscar vehículos" placeholder="Buscar por placa, marca o modelo…" value="${esc(state.search)}"></div><span class="result-count" id="result-count"></span></div><div id="list-content"></div></section>`
  );
}

function fillList() {
  const target = document.querySelector("#list-content");
  if (!target) return;
  const query = state.search.trim().toLocaleLowerCase("es");
  let items;
  if (route() === "ordenes") {
    items = state.orders.filter(
      (o) =>
        (!state.filter || o.status === state.filter) &&
        `${vehicleFor(o.vehicleId)?.plate} ${o.reason} ${orderCode(o.id)}`
          .toLocaleLowerCase("es")
          .includes(query),
    );
    target.innerHTML = items.length
      ? orderTable(items)
      : empty(
          "No se encontraron órdenes",
          query || state.filter
            ? "Prueba con otra búsqueda o selecciona todos los estados."
            : "Registra un vehículo y crea su primera orden.",
          "orders",
        );
  } else if (route() === "clientes") {
    items = state.clients.filter((c) =>
      `${c.name} ${c.phone}`.toLocaleLowerCase("es").includes(query),
    );
    target.innerHTML = items.length
      ? `<div class="table-scroll"><table><thead><tr><th>Cliente</th><th>Teléfono</th><th>Vehículos</th><th class="hide-mobile">Registrado</th></tr></thead><tbody>${items.map((c) => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone)}</td><td>${state.vehicles.filter((v) => v.clientId === c.id).length}</td><td class="hide-mobile">${date(c.createdAt)}</td></tr>`).join("")}</tbody></table></div>`
      : empty(
          "No hay clientes para mostrar",
          "Registra el primer cliente o ajusta tu búsqueda.",
          "people",
        );
  } else {
    items = state.vehicles.filter((v) =>
      `${v.plate} ${v.brand} ${v.model}`
        .toLocaleLowerCase("es")
        .includes(query),
    );
    target.innerHTML = items.length
      ? `<div class="table-scroll"><table><thead><tr><th>Vehículo</th>${isReception() ? "<th>Cliente</th>" : ""}<th>Órdenes</th>${canHistory() ? "<th>Servicios</th>" : ""}</tr></thead><tbody>${items.map((v) => `<tr><td><div class="vehicle-cell"><span class="plate-icon">${icon("car")}</span><div><span class="plate">${esc(v.plate)}</span><span class="secondary-line">${esc(v.brand)} ${esc(v.model)}</span></div></div></td>${isReception() ? `<td>${esc(clientName(v.clientId))}</td>` : ""}<td>${state.orders.filter((o) => o.vehicleId === v.id).length}</td>${canHistory() ? `<td><a class="order-link" href="#historial/${encodeURIComponent(v.plate)}">Ver historial</a></td>` : ""}</tr>`).join("")}</tbody></table></div>`
      : empty(
          "No hay vehículos para mostrar",
          "Registra un vehículo para iniciar su seguimiento.",
          "car",
        );
  }
  document.querySelector("#result-count").textContent =
    `${items.length} ${items.length === 1 ? "registro" : "registros"}`;
}

function renderHistory(plate = "") {
  return (
    heading(
      "Historial del vehículo",
      "Consulta diagnósticos, decisiones y reparaciones en un solo lugar.",
    ) +
    `<section class="panel"><form class="history-search" id="history-form">${input("history-plate", "Placa del vehículo", { value: plate, max: 14, placeholder: "Ej. DEM-0001" })}<button type="submit" class="btn primary">${icon("search")}Buscar historial</button></form></section><div id="history-result" class="history-result">${empty("Los antecedentes, siempre a mano", "Busca una placa para consultar todos sus servicios.", "history")}</div>`
  );
}

async function searchHistory(plate, revision) {
  const target = document.querySelector("#history-result");
  if (!target) return;
  target.innerHTML =
    '<div class="loading"><span class="spinner"></span>Buscando historial…</div>';
  try {
    const history = await api(
      `/vehicles/by-plate/${encodeURIComponent(plate)}/history`,
    );
    if (state.revision !== revision || !target.isConnected) return;
    const v = history.vehicle;
    target.innerHTML = `<div class="history-vehicle"><span class="order-car-icon">${icon("car")}</span><div><h2>${esc(v.plate)}</h2><p class="muted">${esc(v.brand)} ${esc(v.model)} · ${history.orders.length} servicios</p></div></div><section class="panel">${history.orders.length ? orderTable(history.orders) : empty("Este vehículo aún no tiene servicios", "Su historial aparecerá cuando se registre la primera orden.", "history")}</section>`;
  } catch (error) {
    if (state.revision === revision && target.isConnected)
      target.innerHTML = `<div class="content-error" role="alert">${esc(error.message)}</div>`;
  }
}

function actionPanel(order) {
  let content = "";
  const form = (name, body, button) =>
    `<form id="${name}" data-order-id="${esc(order.id)}">${body}<div class="form-error" role="alert"></div><button class="btn primary full" type="submit">${button}</button></form>`;
  if (["COMPLETED", "REJECTED"].includes(order.status)) {
    return `<section class="panel"><div class="closed-message">${icon(order.status === "COMPLETED" ? "checkCircle" : "file")}<h2>${order.status === "COMPLETED" ? "Servicio finalizado" : "Servicio rechazado"}</h2><p>Esta orden está cerrada. Sus registros permanecen disponibles para consulta.</p></div></section>`;
  }
  if (["RECEIVED", "DIAGNOSING"].includes(order.status) && canWork(order)) {
    content = `<div class="panel-heading"><div><h2>¿Qué necesita el vehículo?</h2><p>Revisa y deja claro qué se debe hacer.</p></div></div><div class="panel-body">${form("diagnosis-form", textarea("findings", "Qué encontraste", order.diagnosis?.findings) + textarea("recommendedWork", "Qué hay que hacer", order.diagnosis?.recommendedWork) + `<label class="check-option"><input type="checkbox" name="complete" value="true" checked> Revisión terminada. Consultar al cliente.</label><p class="field-note">Desmarca si necesitas seguir revisando. Al terminar, el diagnóstico queda guardado y no se edita.</p>`, "Guardar revisión")}</div>`;
  } else if (
    order.status === "AWAITING_AUTHORIZATION" &&
    state.user.role === "ADMIN"
  ) {
    content = `<div class="panel-heading"><div><h2>¿El cliente acepta el trabajo?</h2><p>Consulta al cliente antes de continuar.</p></div></div><div class="panel-body">${form("authorization-form", `<fieldset class="choice-group"><legend>Decisión del cliente</legend><label><input type="radio" name="decision" value="APPROVED" required> Sí, acepta la reparación</label><label><input type="radio" name="decision" value="REJECTED" required> No, rechaza el servicio</label></fieldset>` + textarea("evidence", "Cómo te confirmó su decisión", "", "Indica cómo se recibió la aceptación o el rechazo. La decisión registrada es definitiva."), "Guardar decisión")}</div>`;
  } else if (order.status === "AUTHORIZED" && canWork(order)) {
    content = `<div class="panel-heading"><h2>Ya puedes reparar.</h2></div><div class="panel-body"><div class="callout">${icon("shield")}<p>El cliente autorizó el servicio. Puedes iniciar la reparación.</p></div>${form("start-form", "", "Iniciar reparación")}</div>`;
  } else if (
    ["IN_REPAIR", "BLOCKED"].includes(order.status) &&
    canWork(order)
  ) {
    content = `<div class="panel-heading"><div><h2>¿Cómo va el trabajo?</h2><p>Cuenta qué hiciste y si el vehículo está listo.</p></div></div><div class="panel-body">${order.status === "BLOCKED" ? `<div class="callout warn">${icon("clock")}<p>La orden está en espera. Registra la resolución para continuar el trabajo autorizado.</p></div>` : ""}${form("repair-form", textarea("activity", "Actividad o resultado") + `<fieldset class="choice-group"><legend>¿En qué estado queda?</legend><label><input type="radio" name="outcome" value="PROGRESS" checked> Sigue en reparación</label><label><input type="radio" name="outcome" value="BLOCKED"> Hay una demora</label><label><input type="radio" name="outcome" value="COMPLETED"> Trabajo terminado</label></fieldset><p class="field-note">«Trabajo terminado» cierra la ficha. Describe antes el resultado y las comprobaciones realizadas.</p>`, "Guardar actividad")}</div>`;
  } else {
    const message =
      order.status === "AWAITING_AUTHORIZATION"
        ? "El encargado debe registrar la decisión del cliente antes de continuar."
        : "El mecánico asignado o el administrador puede continuar esta orden. Tu cuenta tiene acceso de consulta.";
    return `<section class="panel"><div class="panel-heading"><h2>Siguiente paso</h2></div><div class="read-only">${icon("lock")}<p>${message}</p></div></section>`;
  }
  return `<section class="panel action-panel">${content}</section>`;
}

function renderOrder(order) {
  const v = vehicleFor(order.vehicleId),
    d = order.diagnosis,
    a = order.authorization;
  const stage = {
    RECEIVED: 0,
    DIAGNOSING: 0,
    AWAITING_AUTHORIZATION: 1,
    AUTHORIZED: 2,
    IN_REPAIR: 2,
    BLOCKED: 2,
    COMPLETED: 3,
    REJECTED: 1,
  }[order.status];
  return `<a class="back-link" href="#inicio">Volver al taller</a><div class="job-heading"><div><p class="eyebrow">Ficha de trabajo · ${esc(orderCode(order.id))}</p><h1 class="license">${esc(v?.plate)}</h1><p>${esc(v?.brand)} ${esc(v?.model)}</p></div>${badge(order.status)}</div><ol class="job-progress" aria-label="Etapa actual: ${esc(statusNames[order.status])}">${["Revisión", "Permiso del cliente", "Reparación", "Terminado"].map((label, i) => `<li class="${i < stage ? "done" : i === stage ? "current" : ""}">${i < stage ? icon("check") : ""}${label}</li>`).join("")}</ol><div class="job-workspace"><div>${actionPanel(order)}</div><aside class="job-slip"><p class="eyebrow">Lo que nos pidieron</p><h2>${esc(order.reason)}</h2><dl><dt>Mecánico responsable</dt><dd>${esc(mechanicName(order.mechanicId))}</dd>${isReception() ? `<dt>Cliente</dt><dd>${esc(clientName(v?.clientId))}</dd>` : ""}<dt>Ingresó al taller</dt><dd>${date(order.createdAt, true)}</dd></dl>${d ? `<div class="slip-note"><strong>Trabajo recomendado</strong><p>${esc(d.recommendedWork)}</p></div>` : ""}</aside></div><details class="record-folder"><summary>Ver lo registrado <span>${order.repairs.length} actividades</span></summary><div class="record-body">${d ? `<section><h2>Diagnóstico</h2><h3>Qué encontramos</h3><p>${esc(d.findings)}</p><h3>Trabajo recomendado</h3><p>${esc(d.recommendedWork)}</p></section>` : "<p>La revisión todavía no se ha registrado.</p>"}${a ? `<section><h2>Decisión del cliente</h2>${badge(a.decision === "APPROVED" ? "AUTHORIZED" : "REJECTED")}<p>${esc(a.evidence)}</p><time>${date(a.createdAt, true)}</time></section>` : ""}<section><h2>Registro de reparación</h2>${order.repairs.length ? `<ol class="timeline">${order.repairs.map((r) => `<li><div class="timeline-top">${badge(r.outcome === "PROGRESS" ? "IN_REPAIR" : r.outcome)}<time>${date(r.createdAt, true)}</time></div><p>${esc(r.activity)}</p></li>`).join("")}</ol>` : "<p>Aún no se han registrado actividades.</p>"}</section></div></details>`;
}

async function renderRoute() {
  if (!state.user) return;
  const revision = ++state.revision;
  const current = route();
  if (
    (["clientes", "recibir"].includes(current) && !isReception()) ||
    (current.startsWith("historial") && !canHistory())
  ) {
    location.hash = "inicio";
    return;
  }
  const activeNav = ["archivo", "clientes", "vehiculos", "ordenes"].includes(
    current,
  )
    ? "archivo"
    : current.startsWith("historial")
      ? "historial"
      : "inicio";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === activeNav);
    if (link.dataset.nav === activeNav)
      link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  const main = document.querySelector("#main-content");
  const titles = {
    inicio: "Resumen",
    ordenes: "Órdenes de trabajo",
    clientes: "Clientes",
    vehiculos: "Vehículos",
    historial: "Historial",
    orden: "Detalle de orden",
  };
  document.title = `MecaGest · ${titles[current.split("/")[0]] ?? "Taller"}`;
  if (current.startsWith("orden/")) {
    main.innerHTML =
      '<div class="loading"><span class="spinner"></span>Cargando orden…</div>';
    try {
      const order = await api(
        `/orders/${encodeURIComponent(current.slice(6))}`,
      );
      if (revision !== state.revision || !main.isConnected) return;
      main.innerHTML = renderOrder(order);
    } catch (error) {
      if (revision === state.revision && main.isConnected)
        main.innerHTML = `<div class="content-error" role="alert"><h2>No se pudo abrir la orden</h2><p>${esc(error.message)}</p><a href="#ordenes">Volver a órdenes</a></div>`;
    }
  } else if (current.startsWith("historial")) {
    let plate = "";
    try {
      plate = decodeURIComponent(current.split("/")[1] ?? "");
    } catch {
      /* Una ruta inválida vuelve a búsqueda vacía. */
    }
    main.innerHTML = renderHistory(plate);
    if (plate) await searchHistory(plate, revision);
  } else {
    main.innerHTML = (
      {
        archivo: renderArchive,
        recibir: renderIntake,
        ordenes: renderOrders,
        clientes: renderClients,
        vehiculos: renderVehicles,
      }[current] ?? renderDashboard
    )();
    fillList();
    if (current === "recibir") updateIntake();
  }
}

async function synchronize() {
  if (await loadData()) await renderRoute();
}

function showDialog(title, subtitle, name, fields, submitLabel) {
  dialog.innerHTML = `<div class="dialog-header"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-dialog" aria-label="Cerrar formulario">${icon("close")}</button></div><div class="dialog-body"><form id="${name}">${fields}<div class="form-error" role="alert"></div><div class="form-actions"><button type="button" class="btn secondary" data-action="close-dialog">Cancelar</button><button type="submit" class="btn primary">${submitLabel}</button></div></form></div>`;
  dialog.showModal();
}

function newClient() {
  showDialog(
    "Nuevo cliente",
    "Registra sus datos de contacto.",
    "client-form",
    input("name", "Nombre del cliente", {
      min: 2,
      max: 100,
      autocomplete: "name",
      placeholder: "Nombre y apellido",
    }) +
      input("phone", "Teléfono", {
        type: "tel",
        min: 5,
        max: 25,
        autocomplete: "tel",
        placeholder: "Número de contacto",
      }),
    "Guardar cliente",
  );
}

function newVehicle() {
  if (!state.clients.length) {
    notify("Primero registra un cliente para asociar el vehículo.");
    newClient();
    return;
  }
  showDialog(
    "Nuevo vehículo",
    "Asocia el vehículo con su propietario.",
    "vehicle-form",
    select("clientId", "Cliente", [
      ["", "Selecciona un cliente"],
      ...state.clients.map((c) => [c.id, c.name]),
    ]) +
      input("plate", "Placa", {
        max: 14,
        placeholder: "Ej. DEM-0001",
        hint: "Se guarda en mayúsculas, sin espacios ni guiones.",
      }) +
      `<div class="form-row">${input("brand", "Marca", { max: 80, placeholder: "Ej. Chevrolet" })}${input("model", "Modelo", { max: 80, placeholder: "Ej. Aveo" })}</div>`,
    "Guardar vehículo",
  );
}

function newOrder() {
  location.hash = "recibir";
}

function renderIntake() {
  return (
    `<a class="back-link" href="#inicio">Volver al taller</a>` +
    heading(
      "Recibir vehículo",
      "Escribe la placa. Si ya vino antes, usamos sus datos.",
    ) +
    `<div class="intake-layout"><form id="intake-form" class="intake-paper"><section><h2>¿Qué vehículo llegó?</h2>${input("intake-plate", "Placa", { max: 14, placeholder: "Ej. ABC-1234", hint: "Con o sin guiones." })}<div id="vehicle-match" aria-live="polite"></div><div id="new-vehicle-fields" hidden><div class="form-row">${input("intake-brand", "Marca", { max: 80, placeholder: "Ej. Toyota", required: false })}${input("intake-model", "Modelo", { max: 80, placeholder: "Ej. Corolla", required: false })}</div><h2>¿Quién lo trae?</h2>${select("intake-owner", "Cliente", [["new", "Registrar un cliente nuevo"], ...state.clients.map((c) => [c.id, c.name])])}<div id="new-owner-fields"><div class="form-row">${input("intake-name", "Nombre del cliente", { min: 2, max: 100, required: false })}${input("intake-phone", "Teléfono", { type: "tel", min: 5, max: 25, required: false })}</div></div></div></section><section><h2>¿En qué podemos ayudar?</h2>${textarea("intake-reason", "Motivo de ingreso", "", "Por ejemplo: hace ruido al frenar.")}${select("intake-mechanic", "Mecánico responsable", [...(state.mechanics.length === 1 ? [] : [["", "Elige quién lo revisará"]]), ...state.mechanics.map((m) => [m.id, m.username])], state.mechanics.length === 1 ? state.mechanics[0].id : "")}</section><div class="form-error" role="alert"></div><div class="form-actions"><button class="btn primary" type="submit">Guardar ingreso</button></div></form><aside class="intake-help"><span class="big-mark">${icon("car")}</span><h2>Todo en una ficha.</h2><p>El cliente, el vehículo y su primer trabajo se guardan juntos.</p><p>Después te mostraremos el siguiente paso.</p></aside></div>`
  );
}

const normalizePlate = (value) => value.replace(/[ -]/g, "").toUpperCase();
function updateIntake() {
  const plate = document.querySelector("#intake-plate");
  if (!plate) return;
  const value = normalizePlate(plate.value),
    vehicle = state.vehicles.find((v) => v.plate === value);
  const valid = /^[A-Z0-9]{5,10}$/.test(value),
    fresh = valid && !vehicle;
  const section = document.querySelector("#new-vehicle-fields");
  section.hidden = !fresh;
  for (const name of ["brand", "model"]) {
    const el = document.querySelector("#intake-" + name);
    el.disabled = !fresh;
    el.required = fresh;
  }
  const owner = document.querySelector("#intake-owner");
  owner.disabled = !fresh;
  const newOwner = fresh && owner.value === "new";
  document.querySelector("#new-owner-fields").hidden = !newOwner;
  for (const name of ["name", "phone"]) {
    const el = document.querySelector("#intake-" + name);
    el.disabled = !newOwner;
    el.required = newOwner;
  }
  const active =
    vehicle &&
    state.orders.find(
      (o) =>
        o.vehicleId === vehicle.id &&
        !["COMPLETED", "REJECTED"].includes(o.status),
    );
  document.querySelector("#vehicle-match").innerHTML = active
    ? `<div class="callout warn"><p>Este vehículo ya tiene un trabajo en curso.</p><a class="btn secondary" href="#orden/${active.id}">Abrir trabajo existente</a></div>`
    : vehicle
      ? `<div class="match-card"><strong>${esc(vehicle.brand)} ${esc(vehicle.model)}</strong><span>Cliente: ${esc(clientName(vehicle.clientId))}</span><p>Ya tenemos sus datos. No tienes que escribirlos de nuevo.</p></div>`
      : fresh
        ? '<p class="field-note">Primera visita. Completa estos datos una sola vez.</p>'
        : "";
  document.querySelector('#intake-form button[type="submit"]').disabled =
    !!active || !state.mechanics.length;
}

async function saveIntake(form, values) {
  const plate = normalizePlate(String(values["intake-plate"])),
    vehicle = state.vehicles.find((v) => v.plate === plate);
  const body = {
    plate,
    mechanicId: values["intake-mechanic"],
    reason: values["intake-reason"],
  };
  if (!vehicle)
    body.newVehicle = {
      brand: values["intake-brand"],
      model: values["intake-model"],
      owner:
        values["intake-owner"] === "new"
          ? { name: values["intake-name"], phone: values["intake-phone"] }
          : { clientId: values["intake-owner"] },
    };
  const order = await api("/intakes", { method: "POST", body });
  // La escritura ya terminó: no volver a enviar si falla la actualización de la lista.
  form.querySelector('button[type="submit"]').textContent = "Ingreso guardado";
  form.dataset.saved = "true";
  try {
    await loadData();
  } catch {
    notify("Ingreso guardado. Recarga para consultar todos los datos.", true);
  }
  location.hash = `orden/${order.id}`;
}

async function handleAction(action, button) {
  if (action === "toggle-password") {
    const password = document.querySelector("#password");
    const visible = password.type === "password";
    password.type = visible ? "text" : "password";
    button.setAttribute(
      "aria-label",
      visible ? "Ocultar contraseña" : "Mostrar contraseña",
    );
    button.setAttribute("aria-pressed", String(visible));
  } else if (action === "close-dialog") dialog.close();
  else if (action === "logout") {
    button.disabled = true;
    try {
      await api("/auth/session", { method: "DELETE" });
      clearSession();
    } catch (error) {
      button.disabled = false;
      notify(error.message, true);
    }
  } else if (action === "refresh") {
    button.disabled = true;
    try {
      await synchronize();
      notify("Información actualizada.");
    } finally {
      button.disabled = false;
    }
  } else if (isReception()) {
    if (action === "new-client") newClient();
    if (action === "new-vehicle") newVehicle();
    if (action === "new-order") newOrder();
  }
}

async function submitForm(form, values) {
  if (form.id === "intake-form") return saveIntake(form, values);
  if (form.id === "login-form") {
    const session = await api("/auth/login", {
      method: "POST",
      body: values,
      auth: false,
    });
    state.token = session.token;
    state.user = session.user;
    sessionStorage.setItem(sessionKey, session.token);
    renderShell();
    document.querySelector("#main-content").innerHTML =
      '<div class="loading"><span class="spinner"></span>Preparando tu taller…</div>';
    try {
      await synchronize();
    } catch (error) {
      clearSession();
      document.querySelector(".login-error").textContent = error.message;
    }
    return;
  }
  if (form.id === "history-form") {
    const next = `historial/${encodeURIComponent(String(values["history-plate"]).trim())}`;
    if (route() === next)
      await searchHistory(String(values["history-plate"]), ++state.revision);
    else location.hash = next;
    return;
  }
  const id = form.dataset.orderId;
  let result, message;
  switch (form.id) {
    case "client-form":
      result = await api("/clients", { method: "POST", body: values });
      message = "Cliente registrado.";
      break;
    case "vehicle-form":
      result = await api("/vehicles", { method: "POST", body: values });
      message = "Vehículo registrado.";
      break;
    case "order-form":
      result = await api("/orders", { method: "POST", body: values });
      message = "Orden creada y asignada al mecánico.";
      break;
    case "diagnosis-form":
      result = await api(`/orders/${id}/diagnosis`, {
        method: "PUT",
        body: { ...values, complete: values.complete === "true" },
      });
      message = result.diagnosis.complete
        ? "Diagnóstico guardado. La orden espera autorización."
        : "Diagnóstico pendiente guardado.";
      break;
    case "authorization-form":
      result = await api(`/orders/${id}/authorization`, {
        method: "POST",
        body: values,
      });
      message =
        result.status === "REJECTED"
          ? "Rechazo registrado. La orden quedó cerrada."
          : "Autorización registrada. La reparación puede comenzar.";
      break;
    case "start-form":
      result = await api(`/orders/${id}/repair/start`, { method: "POST" });
      message = "Reparación iniciada.";
      break;
    case "repair-form":
      result = await api(`/orders/${id}/repairs`, {
        method: "POST",
        body: values,
      });
      message =
        result.status === "COMPLETED"
          ? "Trabajo finalizado. El historial quedó actualizado."
          : "Actividad registrada.";
      break;
    default:
      return;
  }
  if (dialog.open) dialog.close();
  // La escritura ya se confirmó: un fallo al refrescar no debe provocar un segundo envío.
  notify(message);
  try {
    if (await loadData()) {
      if (form.id === "order-form") location.hash = `orden/${result.id}`;
      else await renderRoute();
    }
  } catch {
    notify(
      "Los cambios se guardaron. Recarga la página para actualizar la vista.",
      true,
    );
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    const main = document.querySelector("#main-content");
    main.setAttribute("tabindex", "-1");
    main.focus();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (button && !button.disabled)
    handleAction(button.dataset.action, button).catch((error) =>
      notify(error.message, true),
    );
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.busy === "true" || form.dataset.saved === "true") return;
  form.dataset.busy = "true";
  const errorBox = form.querySelector('[role="alert"]');
  if (errorBox) errorBox.textContent = "";
  const values = Object.fromEntries(new FormData(form));
  const controls = [
    ...form.querySelectorAll("button, input, select, textarea"),
  ];
  const disabledBefore = controls.map((control) => control.disabled);
  controls.forEach((control) => {
    control.disabled = true;
  });
  form.setAttribute("aria-busy", "true");
  try {
    await submitForm(form, values);
  } catch (error) {
    if (errorBox?.isConnected) {
      errorBox.textContent = error.message;
      errorBox.scrollIntoView({ block: "nearest" });
    } else notify(error.message, true);
  } finally {
    form.dataset.busy = "false";
    form.removeAttribute("aria-busy");
    controls.forEach((control, index) => {
      control.disabled = form.dataset.saved === "true" || disabledBefore[index];
    });
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "intake-plate") updateIntake();
  if (event.target.id === "work-search") {
    const q = normalizePlate(event.target.value);
    document.querySelector("#work-items").innerHTML = workTickets(
      state.orders.filter(
        (o) =>
          !["COMPLETED", "REJECTED"].includes(o.status) &&
          vehicleFor(o.vehicleId)?.plate.includes(q),
      ),
    );
  }
  if (event.target.id === "list-search") {
    state.search = event.target.value;
    fillList();
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "intake-owner") updateIntake();
  if (event.target.id === "status-filter") {
    state.filter = event.target.value;
    fillList();
  }
});
window.addEventListener("hashchange", () => {
  state.search = "";
  state.filter = "";
  if (dialog.open) dialog.close();
  if (state.user)
    renderRoute().then(() => {
      document.querySelector("#main-content")?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    });
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  }
});

async function boot() {
  if (!state.token) {
    renderLogin();
    return;
  }
  try {
    state.user = await api("/me");
    renderShell();
    await synchronize();
  } catch (error) {
    clearSession();
    document.querySelector(".login-error").textContent = error.message;
  }
}
boot();
