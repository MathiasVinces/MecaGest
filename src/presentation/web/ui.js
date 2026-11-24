export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const statusNames = {
  RECEIVED: 'Recibida', DIAGNOSING: 'En diagnóstico', AWAITING_AUTHORIZATION: 'Por autorizar',
  AUTHORIZED: 'Autorizada', IN_REPAIR: 'En reparación', BLOCKED: 'En espera', COMPLETED: 'Finalizada', REJECTED: 'Rechazada',
};
export const roleNames = { ADMIN: 'Administrador', RECEPTIONIST: 'Recepción', MECHANIC: 'Mecánico' };
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
  car: '<path d="m4 10 2-6h12l2 6M3 10h18v8H3zM5 18v3M19 18v3M6 14h2M16 14h2M9 14h6"/>',
  people: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/>',
  history: '<path d="M3 10a9 9 0 1 1 0 5M3 4v6h6M12 7v5l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  wrench: '<path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 3-3-3 3-4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17v1"/>',
  shield: '<path d="m12 2 8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
  logout: '<path d="M9 4H4v16h5M8 12h13m-4-4 4 4-4 4"/>',
  refresh: '<path d="M20 10a8 8 0 0 0-14-5L3 8M3 3v5h5M4 14a8 8 0 0 0 14 5l3-3M16 16h5v5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  building: '<path d="M3 21V6l9-4 9 4v15M7 21V11h10v10M7 15h10M7 18h10M9 7h6"/>',
  file: '<path d="M5 3h9l5 5v13H5V3ZM14 3v6h5M9 13h6M9 17h6"/>',
};
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.file}</svg>`;
export const badge = status => `<span class="badge ${escapeHtml(status)}">${escapeHtml(statusNames[status] ?? status)}</span>`;
export function date(value, withTime = false) {
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value));
}
export const empty = (title, message, symbol = 'orders', action = '') => `<div class="empty">${icon(symbol)}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action}</div>`;
export const field = (name, label, control, hint = '') => `<div class="field"><label for="${name}">${label}</label>${control}${hint ? `<small>${hint}</small>` : ''}</div>`;
export const input = (name, label, options = {}) => field(name, label, `<input id="${name}" name="${name}" type="${options.type ?? 'text'}" value="${escapeHtml(options.value ?? '')}" ${options.required === false ? '' : 'required'} ${options.min ? `minlength="${options.min}"` : ''} maxlength="${options.max ?? 100}" ${options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : ''} ${options.autocomplete ? `autocomplete="${options.autocomplete}"` : ''}>`, options.hint);
export const textarea = (name, label, value = '', hint = '') => field(name, label, `<textarea id="${name}" name="${name}" rows="3" maxlength="2000" required>${escapeHtml(value)}</textarea>`, hint);
export const select = (name, label, items, current = '', hint = '') => field(name, label, `<select id="${name}" name="${name}" required>${items.map(([value, text]) => `<option value="${escapeHtml(value)}" ${current === value ? 'selected' : ''}>${escapeHtml(text)}</option>`).join('')}</select>`, hint);
