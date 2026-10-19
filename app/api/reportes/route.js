import { NextResponse } from 'next/server';
import { usuarioDeSolicitud, tienePermisoReportes } from '../../../lib/auth';
import { readSheet, asegurarPestana } from '../../../lib/sheets';
import { TABS, HEADERS } from '../../../lib/constants';
import { leerPreguntas } from '../../../lib/preguntas';
import { normalizar, buscar } from '../../../lib/buscador';

export const dynamic = 'force-dynamic';

const TZ = 'America/Argentina/Buenos_Aires';
const diaAR = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('sv-SE', { timeZone: TZ }); };
const sumar = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

// GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&publico=&curso=&edicion=
// Todo se calcula acá con lo registrado en Visitantes, Eventos y Solicitudes (nada se inventa ni se estima).
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const u = await usuarioDeSolicitud(req, sp.get('solicitanteEmail'));
  if (!u || !tienePermisoReportes(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const desde = sp.get('desde') || '', hasta = sp.get('hasta') || '';
  const fPub = sp.get('publico') || '', fCurso = sp.get('curso') || '', fEd = sp.get('edicion') || '';

  await Promise.all([TABS.VISITANTES, TABS.EVENTOS, TABS.SOLICITUDES].map((t) => asegurarPestana(t, HEADERS[t])));
  const [vis, evs, sols, preguntas] = await Promise.all([
    readSheet(TABS.VISITANTES, { noCache: true }), readSheet(TABS.EVENTOS, { noCache: true }),
    readSheet(TABS.SOLICITUDES, { noCache: true }), leerPreguntas()
  ]);
  const pasaSinFecha = (fechaIso, pub, curso, ed) => {
    if (!diaAR(fechaIso)) return false;
    if (fPub && pub !== fPub) return false; if (fCurso && curso !== fCurso) return false; if (fEd && ed !== fEd) return false;
    return true;
  };
  const pasa = (fechaIso, pub, curso, ed) => {
    if (!pasaSinFecha(fechaIso, pub, curso, ed)) return false;
    const d = diaAR(fechaIso);
    if (desde && d < desde) return false; if (hasta && d > hasta) return false;
    return true;
  };
  const V = vis.filter((v) => v['Sesión'] && pasa(v.Fecha, v['Público'], v.Curso, v['Edición']));
  const E = evs.filter((e) => e.Tipo && pasa(e.Fecha, e['Público'], e.Curso, e['Edición']));
  const S = sols.filter((s) => s.ID && pasa(s.Fecha, s['Público'], s.Curso, s['Edición']));

  const activas = preguntas.filter((p) => p.activa);
  const porId = new Map(preguntas.map((p) => [p.id, p]));

  // Búsquedas
  const busq = E.filter((e) => e.Tipo === 'busqueda' && normalizar(e['Término']));
  const terminos = new Map();
  busq.forEach((e) => {
    const k = normalizar(e['Término']);
    const t = terminos.get(k) || { clave: k, veces: 0, sinResultado: 0, personas: new Set(), ultima: '', crudos: new Map() };
    t.veces++; if (String(e.Resultados) === '0') t.sinResultado++;
    if (e.Email) t.personas.add(e.Email);
    if (e.Fecha > t.ultima) t.ultima = e.Fecha;
    sumar(t.crudos, e['Término']);
    terminos.set(k, t);
  });
  const listaTerm = [...terminos.values()].map((t) => ({
    termino: [...t.crudos.entries()].sort((a, b) => b[1] - a[1])[0][0], veces: t.veces, sinResultado: t.sinResultado,
    personas: t.personas.size, ultima: t.ultima, yaRespondida: buscar(activas, t.clave).length > 0
  }));
  const masBuscados = [...listaTerm].sort((a, b) => b.veces - a.veces || b.ultima.localeCompare(a.ultima)).slice(0, 50);
  // "Buscado y no encontrado": términos cuyas búsquedas dieron 0 resultados la mayoría de las veces.
  const noEncontrados = listaTerm.filter((t) => t.sinResultado > 0 && t.sinResultado >= t.veces / 2)
    .sort((a, b) => b.sinResultado - a.sinResultado || b.ultima.localeCompare(a.ultima)).slice(0, 100);

  // Preguntas abiertas y utilidad
  const abiertas = new Map(), si = new Map(), no = new Map();
  E.forEach((e) => {
    if (e.Tipo === 'abrir_pregunta') sumar(abiertas, e['Pregunta ID']);
    if (e.Tipo === 'util_si') sumar(si, e['Pregunta ID']);
    if (e.Tipo === 'util_no') sumar(no, e['Pregunta ID']);
  });
  const filaPreg = (id) => { const p = porId.get(id); return { id, pregunta: p ? p.pregunta : '(pregunta eliminada)', publico: p ? p.publico : '', abiertas: abiertas.get(id) || 0, utilSi: si.get(id) || 0, utilNo: no.get(id) || 0, destacada: !!(p && p.destacada) }; };
  const ids = new Set([...abiertas.keys(), ...si.keys(), ...no.keys()]);
  const preguntasMasAbiertas = [...ids].map(filaPreg).sort((a, b) => b.abiertas - a.abiertas).slice(0, 30);
  const peorValoradas = [...ids].map(filaPreg).filter((p) => p.utilNo > 0).sort((a, b) => b.utilNo - a.utilNo || (b.utilNo / (b.utilSi + b.utilNo)) - (a.utilNo / (a.utilSi + a.utilNo))).slice(0, 15);
  const sinVisitas = activas.filter((p) => !abiertas.get(p.id)).map((p) => ({ id: p.id, pregunta: p.pregunta, publico: p.publico })).slice(0, 30);

  // Clics (enlaces y botones)
  const clics = new Map();
  E.filter((e) => e.Tipo === 'clic').forEach((e) => {
    const k = (e['Término'] || '(sin nombre)') + '||' + (e.Destino || '');
    const c = clics.get(k) || { etiqueta: e['Término'] || '(sin nombre)', destino: e.Destino || '', veces: 0, personas: new Set() };
    c.veces++; if (e.Email) c.personas.add(e.Email); clics.set(k, c);
  });
  const clicsLista = [...clics.values()].map((c) => ({ etiqueta: c.etiqueta, destino: c.destino, veces: c.veces, personas: c.personas.size })).sort((a, b) => b.veces - a.veces).slice(0, 40);

  // Serie diaria
  const dias = new Map();
  const dia = (d) => { let x = dias.get(d); if (!x) { x = { dia: d, visitas: 0, busquedas: 0, sinResultado: 0, solicitudes: 0 }; dias.set(d, x); } return x; };
  V.forEach((v) => { dia(diaAR(v.Fecha)).visitas++; });
  busq.forEach((e) => { const x = dia(diaAR(e.Fecha)); x.busquedas++; if (String(e.Resultados) === '0') x.sinResultado++; });
  S.forEach((s) => { dia(diaAR(s.Fecha)).solicitudes++; });
  const serie = [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  // Por curso y edición
  const ce = new Map();
  const g = (curso, ed) => { const k = (curso || '(sin curso)') + '||' + (ed || ''); let x = ce.get(k); if (!x) { x = { curso: curso || '(sin curso)', edicion: ed || '', visitantes: new Set(), busquedas: 0, sinResultado: 0, aperturas: 0, solicitudes: 0 }; ce.set(k, x); } return x; };
  V.forEach((v) => g(v.Curso, v['Edición']).visitantes.add(v.Email || v['Sesión']));
  E.forEach((e) => { const x = g(e.Curso, e['Edición']); if (e.Tipo === 'busqueda') { x.busquedas++; if (String(e.Resultados) === '0') x.sinResultado++; } if (e.Tipo === 'abrir_pregunta') x.aperturas++; });
  S.forEach((s) => { g(s.Curso, s['Edición']).solicitudes++; });
  const porCurso = [...ce.values()].map((x) => ({ curso: x.curso, edicion: x.edicion, visitantes: x.visitantes.size, busquedas: x.busquedas, sinResultado: x.sinResultado, aperturas: x.aperturas, solicitudes: x.solicitudes }))
    .sort((a, b) => b.busquedas - a.busquedas || b.visitantes - a.visitantes);

  // Búsquedas recientes con la persona (para ver quién buscó qué y para exportar)
  const recientes = busq.map((e) => ({ fecha: e.Fecha, termino: e['Término'], resultados: e.Resultados === '' ? null : Number(e.Resultados), nombre: e.Nombre, email: e.Email, curso: e.Curso, edicion: e['Edición'], publico: e['Público'] }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 2000);

  const tBusq = busq.length, tSin = busq.filter((e) => String(e.Resultados) === '0').length;
  const tSi = E.filter((e) => e.Tipo === 'util_si').length, tNo = E.filter((e) => e.Tipo === 'util_no').length;
  const visitantesUnicos = new Set(V.map((v) => (v.Email || v['Sesión']))).size;
  // Consultas por mes: los últimos 12 meses con actividad (no depende del período elegido, sí del público, curso y edición). "Consultas" = búsquedas.
  const meses = new Map();
  const mes = (iso) => { const k = diaAR(iso).slice(0, 7); let x = meses.get(k); if (!x) { x = { mes: k, sesiones: new Set(), personas: new Set(), busquedas: 0, sinResultado: 0, aperturas: 0, clics: 0, utilSi: 0, utilNo: 0, solicitudes: 0 }; meses.set(k, x); } return x; };
  vis.filter((v) => v['Sesión'] && pasaSinFecha(v.Fecha, v['Público'], v.Curso, v['Edición'])).forEach((v) => { const x = mes(v.Fecha); x.sesiones.add(v['Sesión']); x.personas.add(v.Email || v['Sesión']); });
  evs.filter((e) => e.Tipo && pasaSinFecha(e.Fecha, e['Público'], e.Curso, e['Edición'])).forEach((e) => {
    const x = mes(e.Fecha);
    if (e.Tipo === 'busqueda' && normalizar(e['Término'])) { x.busquedas++; if (String(e.Resultados) === '0') x.sinResultado++; }
    else if (e.Tipo === 'abrir_pregunta') x.aperturas++;
    else if (e.Tipo === 'clic') x.clics++;
    else if (e.Tipo === 'util_si') x.utilSi++;
    else if (e.Tipo === 'util_no') x.utilNo++;
  });
  sols.filter((s) => s.ID && pasaSinFecha(s.Fecha, s['Público'], s.Curso, s['Edición'])).forEach((s) => { mes(s.Fecha).solicitudes++; });
  const porMes = [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12)
    .map((x) => ({ mes: x.mes, visitas: x.sesiones.size, personas: x.personas.size, busquedas: x.busquedas, sinResultado: x.sinResultado, aperturas: x.aperturas, clics: x.clics, utilSi: x.utilSi, utilNo: x.utilNo, solicitudes: x.solicitudes }));

  const CL = E.filter((e) => e.Tipo === 'clic');
  const cuenta = (f) => { const x = CL.filter(f); return { clics: x.length, personas: new Set(x.map((e) => e.Email).filter(Boolean)).size }; };
  const esPromo = (e) => String(e['Término'] || '').startsWith('Promo');
  const promo = { ...cuenta(esPromo), estudiantes: cuenta((e) => esPromo(e) && String(e['Término']).includes('(estudiantes)')).clics, interesados: cuenta((e) => esPromo(e) && String(e['Término']).includes('(interesados)')).clics };
  const blog = cuenta((e) => String(e['Término'] || '').startsWith('Blog'));
  // Lo que la persona escribió cuando no encontró lo que buscaba ("contanos qué estabas buscando").
  const detalles = E.filter((e) => e.Tipo === 'detalle_busqueda').map((e) => ({ fecha: e.Fecha, termino: e['Término'], detalle: e.Destino, nombre: e.Nombre, email: e.Email, curso: e.Curso, edicion: e['Edición'], publico: e['Público'] }))
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 500);
  const kpis = {
    visitas: new Set(V.map((v) => v['Sesión'])).size, visitantesUnicos, busquedas: tBusq, sinResultado: tSin,
    aperturas: E.filter((e) => e.Tipo === 'abrir_pregunta').length, clics: E.filter((e) => e.Tipo === 'clic').length,
    utilSi: tSi, utilNo: tNo, solicitudes: S.length, solicitudesNuevas: S.filter((s) => (s.Estado || 'Nueva') === 'Nueva').length,
    detallesBusqueda: detalles.length, promoClics: promo.clics, promoPersonas: promo.personas, promoEstudiantes: promo.estudiantes, promoInteresados: promo.interesados, blogClics: blog.clics, blogPersonas: blog.personas
  };
  return NextResponse.json({ ok: true, kpis, porMes, serie, masBuscados, noEncontrados, detalles, preguntasMasAbiertas, peorValoradas, sinVisitas, clics: clicsLista, porCurso, recientes });
}
