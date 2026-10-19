// Formato de fechas para el panel (siempre hora de Argentina para lo registrado por el servidor).
const TZ = 'America/Argentina/Buenos_Aires';
export const fechaHora = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };
export const soloFecha = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }); };
export const diaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "2026-10-20" -> "martes 20/10"
export function diaLegible(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); if (!m) return String(ymd || '');
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}
export const horario = (s) => `${diaLegible(s.fecha)} · ${s.desde} a ${s.hasta}`;
