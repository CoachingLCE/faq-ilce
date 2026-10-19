// Agrupa las escrituras de muchas personas en una sola llamada a Google Sheets (la cuota de escritura es de ~60 por minuto: con decenas de visitantes a la vez, escribir
// una fila por pedido la agotaría). Cada pedido espera a que su grupo se escriba (máx. ~1,5 s), así que no se pierde nada aunque el servidor se "enfríe" después.
import { appendRows } from './sheets';

const colas = new Map(); // pestaña -> { filas: [], waiters: [], timer }

export function encolarFilas(tab, filas, esperaMs = 1500) {
  if (!filas || !filas.length) return Promise.resolve();
  let q = colas.get(tab);
  if (!q) { q = { filas: [], waiters: [], timer: null }; colas.set(tab, q); }
  q.filas.push(...filas);
  const p = new Promise((resolve, reject) => q.waiters.push({ resolve, reject }));
  if (!q.timer) {
    q.timer = setTimeout(async () => {
      const lote = q.filas; const ws = q.waiters;
      q.filas = []; q.waiters = []; q.timer = null;
      try { await appendRows(tab, lote); ws.forEach((w) => w.resolve()); }
      catch (e) { console.error('[cola] no se pudo escribir en', tab, e?.message || e); ws.forEach((w) => w.reject(e)); }
    }, esperaMs);
  }
  return p;
}
