// Resumen semanal de lo que pasó en Preguntas frecuentes: calcula los números de los últimos 7 días (contra los 7 anteriores) con lo registrado en Visitantes, Eventos y Solicitudes,
// y arma el mail. Es una función pura (no lee planillas ni manda nada): la tarea programada le pasa los datos.
import { normalizar } from './buscador';

const TZ = 'America/Argentina/Buenos_Aires';
const DIA = 86400000;
const fechaAR = (ms) => new Date(ms).toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'long' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function calcularResumen({ vis = [], evs = [], sols = [], preguntas = [], ahora = new Date() }) {
  const fin = ahora.getTime(), ini = fin - 7 * DIA, iniPrev = ini - 7 * DIA;
  const enRango = (iso, a, b) => { const t = new Date(iso).getTime(); return !isNaN(t) && t >= a && t < b; };
  const medir = (a, b) => {
    const V = vis.filter((v) => v['Sesión'] && enRango(v.Fecha, a, b));
    const E = evs.filter((e) => e.Tipo && enRango(e.Fecha, a, b));
    const busq = E.filter((e) => e.Tipo === 'busqueda' && normalizar(e['Término']));
    return {
      V, E, busq,
      visitas: new Set(V.map((v) => v['Sesión'])).size,
      personas: new Set(V.map((v) => v.Email || v['Sesión'])).size,
      consultas: busq.length,
      sinResultado: busq.filter((e) => String(e.Resultados) === '0').length,
      aperturas: E.filter((e) => e.Tipo === 'abrir_pregunta').length,
      utilSi: E.filter((e) => e.Tipo === 'util_si').length,
      utilNo: E.filter((e) => e.Tipo === 'util_no').length,
      clics: E.filter((e) => e.Tipo === 'clic').length,
      videollamadas: sols.filter((s) => s.ID && enRango(s.Fecha, a, b)).length
    };
  };
  const act = medir(ini, fin + 1), prev = medir(iniPrev, ini);
  const top = (mapa, n) => [...mapa.values()].sort((x, y) => y.veces - x.veces || String(x.termino).localeCompare(String(y.termino))).slice(0, n);
  const agrupar = (lista) => {
    const m = new Map();
    lista.forEach((e) => {
      const k = normalizar(e['Término']); const x = m.get(k) || { termino: e['Término'], veces: 0 }; x.veces++; m.set(k, x);
    });
    return m;
  };
  const porId = new Map((preguntas || []).map((p) => [p.id, p]));
  const contarPreg = (tipo) => {
    const m = new Map();
    act.E.filter((e) => e.Tipo === tipo && e['Pregunta ID']).forEach((e) => {
      const p = porId.get(e['Pregunta ID']); const x = m.get(e['Pregunta ID']) || { termino: p ? p.pregunta : '(pregunta eliminada)', veces: 0 }; x.veces++; m.set(e['Pregunta ID'], x);
    });
    return m;
  };
  const porCurso = new Map();
  act.busq.forEach((e) => { const c = e.Curso || '(sin curso)'; const x = porCurso.get(c) || { termino: c, veces: 0 }; x.veces++; porCurso.set(c, x); });
  return {
    desde: fechaAR(ini), hasta: fechaAR(fin),
    actual: { visitas: act.visitas, personas: act.personas, consultas: act.consultas, sinResultado: act.sinResultado, aperturas: act.aperturas, utilSi: act.utilSi, utilNo: act.utilNo, clics: act.clics, videollamadas: act.videollamadas },
    anterior: { visitas: prev.visitas, consultas: prev.consultas, sinResultado: prev.sinResultado, videollamadas: prev.videollamadas },
    sinAtender: sols.filter((s) => s.ID && (!s.Estado || s.Estado === 'Nueva')).length,
    noEncontrados: top(agrupar(act.busq.filter((e) => String(e.Resultados) === '0')), 5),
    masBuscados: top(agrupar(act.busq), 5),
    masAbiertas: top(contarPreg('abrir_pregunta'), 5),
    noAyudaron: top(contarPreg('util_no'), 3),
    porCurso: top(porCurso, 3),
    hayActividad: act.visitas + act.consultas + act.videollamadas + act.aperturas + act.clics > 0
  };
}

export const asuntoResumen = (r) => `Resumen semanal de preguntas frecuentes · ${r.desde} al ${r.hasta}`;

const variacion = (a, b) => (b === 0 ? (a === 0 ? '' : 'nuevo esta semana') : `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs. semana anterior`);

export function htmlResumenSemanal(r, { panelUrl = '' } = {}) {
  const kpi = (n, l, v, malo) => `<td style="padding:6px"><div style="background:#f4f5fb;border-radius:10px;padding:12px 10px;text-align:center"><div style="font-size:24px;font-weight:700;color:${malo ? '#b91c1c' : '#1e1b4b'}">${esc(n)}</div><div style="font-size:12px;color:#555">${esc(l)}</div><div style="font-size:11px;color:#777;margin-top:2px">${esc(v)}</div></div></td>`;
  const lista = (titulo, items, vacio) => `<h3 style="font-size:15px;margin:20px 0 6px;color:#1e1b4b">${esc(titulo)}</h3>` + (items.length
    ? `<ol style="margin:0;padding-left:20px;color:#333;font-size:14px;line-height:1.6">${items.map((x) => `<li>${esc(x.termino)} <span style="color:#777">(${x.veces} ${x.veces === 1 ? 'vez' : 'veces'})</span></li>`).join('')}</ol>`
    : `<p style="margin:0;color:#777;font-size:14px">${esc(vacio)}</p>`);
  const a = r.actual, p = r.anterior;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#222">
<div style="background:linear-gradient(135deg,#1e1b4b,#7c3aed);color:#fff;padding:22px 24px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:1px;opacity:.85">INSTITUTO ILCE</div><div style="font-size:21px;font-weight:700;margin-top:2px">Resumen semanal · Preguntas frecuentes</div><div style="font-size:13px;opacity:.9;margin-top:4px">Del ${esc(r.desde)} al ${esc(r.hasta)}</div></div>
<div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 14px 14px;padding:18px 20px">
${r.hayActividad ? '' : '<p style="color:#777;font-size:14px">Esta semana no hubo actividad registrada en las páginas de preguntas frecuentes.</p>'}
<table role="presentation" width="100%" style="border-collapse:collapse"><tr>${kpi(a.visitas, 'Visitas', variacion(a.visitas, p.visitas))}${kpi(a.consultas, 'Consultas', variacion(a.consultas, p.consultas))}</tr><tr>${kpi(a.sinResultado, 'Sin resultado', variacion(a.sinResultado, p.sinResultado), a.sinResultado > 0)}${kpi(a.videollamadas, 'Videollamadas pedidas', variacion(a.videollamadas, p.videollamadas))}</tr></table>
<p style="font-size:13px;color:#555;margin:10px 0 0">${esc(a.personas)} personas distintas · ${esc(a.aperturas)} preguntas abiertas · ${esc(a.utilSi)} respuestas que ayudaron y ${esc(a.utilNo)} que no · ${esc(a.clics)} clics.</p>
${r.sinAtender > 0 ? `<p style="background:#fef2f2;color:#b91c1c;border-radius:8px;padding:10px 12px;font-size:14px;margin:14px 0 0"><b>${esc(r.sinAtender)}</b> ${r.sinAtender === 1 ? 'videollamada sin atender' : 'videollamadas sin atender'} en total.</p>` : ''}
${lista('Lo que se buscó y no se encontró', r.noEncontrados, 'Ninguna consulta quedó sin resultado.')}
${lista('Lo más buscado', r.masBuscados, 'Todavía no hubo búsquedas.')}
${lista('Preguntas más abiertas', r.masAbiertas, 'Todavía no se abrió ninguna pregunta.')}
${r.noAyudaron.length ? lista('Respuestas que no ayudaron', r.noAyudaron, '') : ''}
${r.porCurso.length ? lista('Consultas por curso', r.porCurso, '') : ''}
${panelUrl ? `<p style="margin:22px 0 0"><a href="${esc(panelUrl)}#reportes" style="background:#7c3aed;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Ver los Reportes completos</a></p>` : ''}
</div></div>`;
}
