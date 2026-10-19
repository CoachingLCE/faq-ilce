'use client';
// Reportes de las preguntas frecuentes: qué se busca, qué se busca y NO se encuentra, qué preguntas se abren, dónde se hace clic.
// Todo sale de lo que la gente hizo en las páginas públicas (no hay estimaciones).
import { useEffect, useMemo, useRef, useState } from 'react';
import { tienePermisoExportar, tienePermisoPreguntas } from '../lib/permisos';
import { CURSOS } from '../lib/constants';
import { fechaHora, diaISO } from '../lib/fechasFaq';
import { descargarCSV } from '../lib/csv';
import { FiltroChip } from './SelectDropdown';

const PERIODOS = [{ id: '7', l: '7 días', d: 7 }, { id: '30', l: '30 días', d: 30 }, { id: 'mes', l: 'Este mes', d: 0 }, { id: 'mespas', l: 'Mes pasado', d: 0 }, { id: '90', l: '90 días', d: 90 }, { id: 'todo', l: 'Todo', d: 0 }, { id: 'rango', l: 'Rango…', d: -1 }];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesCorto = (k) => { const [a, m] = String(k).split('-'); return `${MESES[(+m || 1) - 1]} ${String(a).slice(2)}`; };
const mesLargo = (k) => { const [a, m] = String(k).split('-'); return `${MESES[(+m || 1) - 1]} ${a}`; };
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('es-AR') : n);
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

function useAncho(def = 640) {
  const ref = useRef(null); const [w, setW] = useState(def);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const med = () => { const a = Math.round(el.getBoundingClientRect().width); if (a > 0) setW(a); };
    med(); if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(med); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Gráfico diario: barras apiladas (búsquedas con respuesta / sin respuesta) y línea de visitas, en el MISMO eje. Se dibuja a píxeles reales (no se estira).
function GraficoDias({ serie, mensual }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);
  const dias = useMemo(() => {
    if (!serie.length) return [];
    const mapa = new Map(serie.map((s) => [s.dia, s]));
    const out = [];
    if (mensual) {
      const [a0, m0] = serie[0].dia.split('-').map(Number); const [a1, m1] = serie[serie.length - 1].dia.split('-').map(Number);
      for (let a = a0, m = m0; (a < a1 || (a === a1 && m <= m1)) && out.length < 36; m++) { if (m > 12) { m = 1; a++; } const k = `${a}-${String(m).padStart(2, '0')}`; out.push(mapa.get(k) || { dia: k, visitas: 0, busquedas: 0, sinResultado: 0, solicitudes: 0 }); }
      return out;
    }
    const ini = new Date(serie[0].dia + 'T12:00:00'); const fin = new Date(serie[serie.length - 1].dia + 'T12:00:00');
    for (let d = new Date(ini); d <= fin && out.length < 400; d.setDate(d.getDate() + 1)) {
      const k = diaISO(d); out.push(mapa.get(k) || { dia: k, visitas: 0, busquedas: 0, sinResultado: 0, solicitudes: 0 });
    }
    return out;
  }, [serie, mensual]);
  if (!dias.length) return <div className="vacio vacio-chico">Todavía no hay actividad en este período.</div>;
  const alto = 220, mL = 34, mB = 26, mT = mensual ? 22 : 10, mR = 6;
  const max = Math.max(4, ...dias.map((d) => Math.max(d.busquedas, d.visitas)));
  // Escala "redonda" (1, 2, 5, 10, 20, 50…) para que los números del eje sean fáciles de leer.
  const paso4 = (() => { const b = max / 4; const e = Math.pow(10, Math.floor(Math.log10(b))); const m = b / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * e; })();
  const techo = Math.max(4, paso4 * 4);
  const W = ancho - mL - mR, H = alto - mT - mB;
  const paso = W / dias.length; const bw = Math.max(2, Math.min(mensual ? 56 : 28, paso * 0.62));
  const x = (i) => mL + paso * i + paso / 2; const y = (v) => mT + H - (v / techo) * H;
  const linea = dias.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.visitas).toFixed(1)}`).join(' ');
  const cadaX = Math.max(1, Math.ceil(dias.length / Math.max(2, Math.floor(W / 70))));
  const h = hover != null ? dias[hover] : null;
  const onMove = (e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.floor((e.clientX - r.left - mL) / paso); setHover(i >= 0 && i < dias.length ? i : null); };
  const f = (s) => { if (mensual) return mesCorto(s); const [, m, d] = s.split('-'); return `${d}/${m}`; };
  return (
    <div>
      <div className="faqa-leyenda">
        <span><i style={{ background: 'rgb(var(--accentTeal))' }} />Consultas con respuesta</span>
        <span><i style={{ background: 'rgb(var(--bad))' }} />Consultas sin respuesta</span>
        <span><i className="linea" />Visitas</span>
      </div>
      <div ref={ref} style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Actividad diaria" style={{ display: 'block' }}>
          {[0, 1, 2, 3, 4].map((k) => { const v = (techo / 4) * k; return <g key={k}><line x1={mL} x2={ancho - mR} y1={y(v)} y2={y(v)} stroke="rgb(var(--border))" strokeWidth="1" /><text x={mL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--textMuted))">{fmt(v)}</text></g>; })}
          {dias.map((d, i) => {
            const con = d.busquedas - d.sinResultado; const hCon = (con / techo) * H; const hSin = (d.sinResultado / techo) * H;
            return (
              <g key={d.dia} opacity={hover == null || hover === i ? 1 : 0.55}>
                {hCon > 0 && <rect x={x(i) - bw / 2} y={y(con)} width={bw} height={hCon} rx="3" fill="rgb(var(--accentTeal))" />}
                {hSin > 0 && <rect x={x(i) - bw / 2} y={y(d.busquedas)} width={bw} height={Math.max(1, hSin - (hCon > 0 ? 2 : 0))} rx="3" fill="rgb(var(--bad))" />}
                {mensual && d.busquedas > 0 && <text x={x(i)} y={y(d.busquedas) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="rgb(var(--text))">{fmt(d.busquedas)}</text>}
                {i % cadaX === 0 && <text x={x(i)} y={alto - 8} textAnchor="middle" fontSize="11" fill="rgb(var(--textMuted))">{f(d.dia)}</text>}
              </g>
            );
          })}
          <path d={linea} fill="none" stroke="rgb(var(--accentPurpleTxt))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {dias.length <= 45 && dias.map((d, i) => <circle key={d.dia} cx={x(i)} cy={y(d.visitas)} r="3.5" fill="rgb(var(--accentPurpleTxt))" stroke="rgb(var(--surface))" strokeWidth="2" />)}
          {h && <line x1={x(hover)} x2={x(hover)} y1={mT} y2={mT + H} stroke="rgb(var(--textMuted))" strokeDasharray="3 3" />}
        </svg>
        {h && (
          <div className="faqa-tip" style={{ left: Math.min(Math.max(x(hover) - 80, 0), ancho - 170), top: 6 }}>
            <b>{f(h.dia)}</b>
            <div>Visitas: {fmt(h.visitas)}</div>
            <div>Consultas: {fmt(h.busquedas)}</div>
            <div>Sin respuesta: {fmt(h.sinResultado)}</div>
            {h.solicitudes > 0 && <div>Videollamadas pedidas: {fmt(h.solicitudes)}</div>}
          </div>
        )}
      </div>
      <details className="faqa-tabla-alt"><summary>Ver como tabla</summary>
        <div className="tablewrap"><table className="faqa-tabla"><thead><tr><th>{mensual ? 'Mes' : 'Día'}</th><th>Visitas</th><th>Consultas</th><th>Sin respuesta</th><th>Videollamadas</th></tr></thead>
          <tbody>{[...dias].reverse().map((d) => <tr key={d.dia}><td>{f(d.dia)}</td><td>{fmt(d.visitas)}</td><td>{fmt(d.busquedas)}</td><td>{fmt(d.sinResultado)}</td><td>{fmt(d.solicitudes)}</td></tr>)}</tbody></table></div>
      </details>
    </div>
  );
}

function Kpi({ n, label, sub, tono }) {
  return <div className="repx-kpi"><div className="repx-kpi-n">{n}</div><div className="repx-kpi-l">{label}</div>{sub != null && <div className={'repx-kpi-sub' + (tono ? ' ' + tono : '')}>{sub}</div>}</div>;
}
function Chip({ tono = 'info', irA, children }) {
  const ir = () => { const el = document.getElementById(irA); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  return irA ? <button type="button" className={'faqa-chip t-' + tono} onClick={ir}>{children}</button> : <span className={'faqa-chip t-' + tono}>{children}</span>;
}
function Seccion({ id, titulo, sub, children, csv }) {
  return (
    <section className="faqa-card" id={id}>
      <div className="faqa-card-h"><div><h3>{titulo}</h3>{sub && <p>{sub}</p>}</div>{csv}</div>
      {children}
    </section>
  );
}
function Tabla({ cols, filas, limite = 10, vacio }) {
  const [todas, setTodas] = useState(false);
  if (!filas.length) return <div className="vacio vacio-chico">{vacio}</div>;
  const ver = todas ? filas : filas.slice(0, limite);
  return (
    <>
      <div className="tablewrap"><table className="faqa-tabla">
        <thead><tr>{cols.map((c) => <th key={c.k} className={c.num ? 'n' : ''}>{c.l}</th>)}</tr></thead>
        <tbody>{ver.map((f, i) => <tr key={i}>{cols.map((c) => <td key={c.k} className={c.num ? 'n' : ''}>{c.r ? c.r(f) : f[c.k]}</td>)}</tr>)}</tbody>
      </table></div>
      {filas.length > limite && <button className="linkbtn" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver las ${filas.length}`}</button>}
    </>
  );
}

export default function ReportesFaq({ usuario, onCrearPregunta }) {
  const puedeExportar = tienePermisoExportar(usuario);
  const puedeCrear = tienePermisoPreguntas(usuario);
  const [periodo, setPeriodo] = useState('30');
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [publico, setPublico] = useState('');
  const [curso, setCurso] = useState('');
  const [edicion, setEdicion] = useState('');
  const [opc, setOpc] = useState({ cursos: CURSOS.map((n) => ({ nombre: n, ediciones: [] })) });
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);
  const [actualizado, setActualizado] = useState(null);

  useEffect(() => { fetch('/api/publico/opciones').then((r) => r.json()).then((j) => { if (j && j.cursos && j.cursos.length) setOpc(j); }).catch(() => {}); }, []);
  const ediciones = (opc.cursos.find((c) => c.nombre === curso) || { ediciones: [] }).ediciones;

  const consulta = useMemo(() => {
    const p = new URLSearchParams();
    if (periodo === 'rango') { if (rango.desde) p.set('desde', rango.desde); if (rango.hasta) p.set('hasta', rango.hasta); }
    else if (periodo === 'mes') { const a = new Date(); a.setDate(1); p.set('desde', diaISO(a)); }
    else if (periodo === 'mespas') { const a = new Date(); a.setDate(1); a.setMonth(a.getMonth() - 1); p.set('desde', diaISO(a)); const f = new Date(); f.setDate(0); p.set('hasta', diaISO(f)); }
    else { const dd = PERIODOS.find((x) => x.id === periodo).d; if (dd > 0) { const a = new Date(); a.setDate(a.getDate() - (dd - 1)); p.set('desde', diaISO(a)); } }
    if (publico) p.set('publico', publico); if (curso) p.set('curso', curso); if (edicion) p.set('edicion', edicion);
    p.set('solicitanteEmail', usuario.email);
    return p.toString();
  }, [periodo, rango, publico, curso, edicion, usuario.email]);

  useEffect(() => {
    let vivo = true; setCargando(true);
    fetch('/api/reportes?' + consulta).then((r) => r.json().then((j) => ({ r, j }))).then(({ r, j }) => {
      if (!vivo) return;
      if (!r.ok || j.ok === false) { setError(j.error || 'No se pudieron cargar los reportes.'); setD(null); } else { setError(''); setD(j); setActualizado(new Date()); }
      setCargando(false);
    }).catch(() => { if (vivo) { setError('No se pudieron cargar los reportes. Revisá tu conexión.'); setCargando(false); } });
    return () => { vivo = false; };
  }, [consulta, recarga]);

  const csvBtn = (nombre, cols, filas) => puedeExportar && filas.length > 0 ? <button className="btn-sm" onClick={() => descargarCSV(nombre, cols, filas)}>CSV</button> : null;

  const k = d && d.kpis;
  return (
    <div className="faqa-sec">
      <div className="faqa-resumen">
        <div className="faqa-resumen-txt">
          <b>{(PERIODOS.find((x) => x.id === periodo) || { l: 'Período' }).l === 'Rango…' ? 'Rango elegido' : (PERIODOS.find((x) => x.id === periodo) || { l: '' }).l}</b>
          <span>{publico === 'estudiantes' ? 'Estudiantes' : publico === 'interesados' ? 'Interesados' : 'Estudiantes e interesados'}</span>
          <span>{curso ? curso + (edicion ? ' · ' + edicion : '') : 'Todos los cursos'}</span>
          {actualizado && <span className="faqa-sub">Actualizado {actualizado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
        <button type="button" className="btn-sm" onClick={() => setRecarga((n) => n + 1)} disabled={cargando}>{cargando ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      <div className="faqa-toolbar">
        <div className="fchips faqa-fchips" role="group" aria-label="Período">
          {PERIODOS.map((x) => <button key={x.id} className={'fchip' + (periodo === x.id ? ' on' : '')} onClick={() => setPeriodo(x.id)}>{x.l}</button>)}
        </div>
        {periodo === 'rango' && <><input type="date" className="fsel" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} aria-label="Desde" /><input type="date" className="fsel" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} aria-label="Hasta" /></>}
        {cargando && <span className="faqa-sub">Actualizando…</span>}
      </div>
      <div className="faqa-toolbar">
        <div className="fchips faqa-fchips" role="group" aria-label="Público">
          {[['', 'Estudiantes e interesados'], ['estudiantes', 'Estudiantes'], ['interesados', 'Interesados']].map(([v, l]) => <button key={v} className={'fchip' + (publico === v ? ' on' : '')} onClick={() => setPublico(v)}>{l}</button>)}
        </div>
        <select className="fsel" value={curso} onChange={(e) => { setCurso(e.target.value); setEdicion(''); }} aria-label="Curso"><option value="">Todos los cursos</option>{opc.cursos.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}</select>
        {ediciones.length > 0 && <select className="fsel" value={edicion} onChange={(e) => setEdicion(e.target.value)} aria-label="Edición"><option value="">Todas las ediciones</option>{ediciones.map((x) => <option key={x.label} value={x.label}>{x.label}</option>)}</select>}
        {curso && <FiltroChip label={'Curso: ' + curso} onClear={() => { setCurso(''); setEdicion(''); }} />}
        {edicion && <FiltroChip label={'Edición: ' + edicion} onClear={() => setEdicion('')} />}
      </div>
      {error && <div className="note" style={{ borderLeftColor: 'rgb(var(--bad))' }}>{error}</div>}
      {!d && !error && <div className="spin" />}
      {d && (
        <div style={{ opacity: cargando ? 0.6 : 1, transition: 'opacity .15s' }}>
          <div className="faqa-hero">
            <Kpi n={fmt(k.visitas)} label="Visitas" sub={`${fmt(k.visitantesUnicos)} personas distintas`} />
            <Kpi n={fmt(k.busquedas)} label="Consultas" sub="búsquedas hechas" />
            <Kpi n={fmt(k.sinResultado)} label="Sin resultado" sub={k.busquedas ? pct(k.sinResultado, k.busquedas) + ' de las consultas' : '—'} tono={k.sinResultado ? 'bad' : ''} />
            <Kpi n={fmt(k.aperturas)} label="Preguntas abiertas" sub="respuestas leídas" />
            <Kpi n={k.utilSi + k.utilNo ? pct(k.utilSi, k.utilSi + k.utilNo) : '—'} label="Respuestas que ayudaron" sub={`${fmt(k.utilSi)} sí · ${fmt(k.utilNo)} no`} tono={k.utilNo > k.utilSi ? 'bad' : ''} />
            <Kpi n={fmt(k.solicitudes)} label="Videollamadas pedidas" sub={k.solicitudesNuevas ? `${k.solicitudesNuevas} sin atender` : 'ninguna pendiente'} tono={k.solicitudesNuevas ? 'bad' : ''} />
          </div>

          <div className="faqa-strip" role="group" aria-label="Qué hacen en las páginas">
            <div><b>{fmt(k.clics)}</b><span>Clics en enlaces y botones</span></div>
            <div><b>{fmt(k.promoClics)}</b><span>Clics en la promo</span><small>{k.visitas ? pct(k.promoClics, k.visitas) + ' de las visitas · ' : ''}{fmt(k.promoEstudiantes)} est. · {fmt(k.promoInteresados)} int.</small></div>
            <div><b>{fmt(k.blogClics)}</b><span>Clics en el blog</span><small>{fmt(k.blogPersonas)} {k.blogPersonas === 1 ? 'persona' : 'personas'}</small></div>
            <div><b>{fmt(k.detallesBusqueda)}</b><span>Contaron qué buscaban</span><small>cuando no encontraron respuesta</small></div>
          </div>

          <div className="faqa-chips" aria-label="Lo importante del período">
            <Chip tono={k.sinResultado ? 'bad' : 'good'} irA="faqa-sec-noenc">{fmt(k.sinResultado)} {k.sinResultado === 1 ? 'consulta sin resultado' : 'consultas sin resultado'}</Chip>
            <Chip tono={d.noEncontrados.length ? 'bad' : 'good'} irA="faqa-sec-noenc">{fmt(d.noEncontrados.filter((t) => !t.yaRespondida).length)} temas por responder</Chip>
            <Chip tono={k.solicitudesNuevas ? 'bad' : 'good'}>{fmt(k.solicitudesNuevas)} videollamadas sin atender</Chip>
            <Chip tono={k.utilNo ? 'warn' : 'good'} irA="faqa-sec-peores">{fmt(k.utilNo)} “no me ayudó”</Chip>
            <Chip tono="info" irA="faqa-sec-nadie">{fmt(d.sinVisitas.length)} preguntas sin abrir</Chip>
            <Chip tono={k.detallesBusqueda ? 'warn' : 'good'} irA="faqa-sec-detalle">{fmt(k.detallesBusqueda)} {k.detallesBusqueda === 1 ? 'persona contó' : 'personas contaron'} qué buscaban</Chip>
          </div>

          <Seccion id="faqa-sec-mes" titulo="Consultas por mes" sub="Cuántas consultas (búsquedas) se hicieron cada mes, y cuántas no tuvieron respuesta. Muestra los últimos 12 meses con actividad, sin importar el período elegido arriba."
            csv={csvBtn('consultas-por-mes.csv', ['Mes', 'Personas', 'Visitas', 'Consultas', 'Sin resultado', '% sin resultado', 'Preguntas abiertas', 'Clics', 'Ayudó (sí)', 'No ayudó', 'Videollamadas'], d.porMes.map((m) => [m.mes, m.personas, m.visitas, m.busquedas, m.sinResultado, m.busquedas ? Math.round(m.sinResultado / m.busquedas * 100) + '%' : '', m.aperturas, m.clics, m.utilSi, m.utilNo, m.solicitudes]))}>
            <div className="faqa-chips" style={{ marginBottom: 10 }}>
              {d.porMes.length > 0 && (() => { const u = d.porMes[d.porMes.length - 1]; const a = d.porMes[d.porMes.length - 2]; const dif = a && a.busquedas ? Math.round((u.busquedas - a.busquedas) / a.busquedas * 100) : null; return (<>
                <Chip tono="info">{mesLargo(u.mes)}: {fmt(u.busquedas)} {u.busquedas === 1 ? 'consulta' : 'consultas'}</Chip>
                {dif != null && <Chip tono={dif > 0 ? 'warn' : 'good'}>{dif > 0 ? '▲' : dif < 0 ? '▼' : '='} {Math.abs(dif)}% vs. {mesLargo(a.mes)}</Chip>}
                <Chip tono="info">Promedio: {fmt(Math.round(d.porMes.reduce((t, m) => t + m.busquedas, 0) / d.porMes.length))} por mes</Chip>
              </>); })()}
            </div>
            <GraficoDias serie={d.porMes.map((m) => ({ ...m, dia: m.mes }))} mensual />
            <Tabla vacio="Todavía no hay actividad." limite={12} filas={[...d.porMes].reverse()} cols={[
              { k: 'm', l: 'Mes', r: (m) => <b>{mesLargo(m.mes)}</b> },
              { k: 'p', l: 'Personas', num: true, r: (m) => fmt(m.personas) },
              { k: 'v', l: 'Visitas', num: true, r: (m) => fmt(m.visitas) },
              { k: 'c', l: 'Consultas', num: true, r: (m) => fmt(m.busquedas) },
              { k: 's', l: 'Sin resultado', num: true, r: (m) => (m.sinResultado ? <span className="faqa-mal">{fmt(m.sinResultado)} <span className="faqa-sub">({Math.round(m.sinResultado / m.busquedas * 100)}%)</span></span> : '—') },
              { k: 'a', l: 'Preguntas abiertas', num: true, r: (m) => fmt(m.aperturas) },
              { k: 'cl', l: 'Clics', num: true, r: (m) => fmt(m.clics) },
              { k: 'z', l: 'Videollamadas', num: true, r: (m) => fmt(m.solicitudes) }
            ]} />
          </Seccion>

          <Seccion id="faqa-sec-noenc" titulo="Buscado y no encontrado" sub="Lo que la gente escribió y no tuvo ninguna respuesta. Es lo que más conviene agregar a las preguntas frecuentes."
            csv={csvBtn('buscado-y-no-encontrado.csv', ['Término', 'Veces sin resultado', 'Veces buscado', 'Personas', 'Última vez', 'Hoy ya tiene respuesta'], d.noEncontrados.map((t) => [t.termino, t.sinResultado, t.veces, t.personas, fechaHora(t.ultima), t.yaRespondida ? 'Sí' : 'No']))}>
            <Tabla vacio="En este período no hubo búsquedas sin resultado. ¡Buena señal!" filas={d.noEncontrados} cols={[
              { k: 't', l: 'Lo que buscaron', r: (t) => <b>{t.termino}</b> },
              { k: 'sr', l: 'Sin resultado', num: true, r: (t) => fmt(t.sinResultado) },
              { k: 'v', l: 'Veces buscado', num: true, r: (t) => fmt(t.veces) },
              { k: 'p', l: 'Personas', num: true, r: (t) => fmt(t.personas) },
              { k: 'u', l: 'Última vez', r: (t) => fechaHora(t.ultima) },
              { k: 'a', l: '', r: (t) => t.yaRespondida ? <span className="faqa-tag">Ya tiene respuesta</span> : (puedeCrear && onCrearPregunta ? <button className="btn-sm" onClick={() => onCrearPregunta(t.termino)}>Crear pregunta</button> : null) }
            ]} />
          </Seccion>

          <Seccion id="faqa-sec-detalle" titulo="Lo que querían encontrar" sub="Cuando una búsqueda no tuvo respuesta, la persona pudo contar con sus palabras qué estaba buscando. Es la mejor pista para armar la pregunta que falta."
            csv={csvBtn('lo-que-querian-encontrar.csv', ['Fecha', 'Buscó', 'Lo que contó', 'Nombre', 'Email', 'Curso', 'Edición', 'Público'], (d.detalles || []).map((r) => [fechaHora(r.fecha), r.termino, r.detalle, r.nombre, r.email, r.curso, r.edicion, r.publico]))}>
            <Tabla vacio="Todavía nadie contó qué estaba buscando en este período." filas={d.detalles || []} limite={10} cols={[
              { k: 'f', l: 'Fecha', r: (r) => fechaHora(r.fecha) },
              { k: 't', l: 'Buscó', r: (r) => <b>{r.termino || '—'}</b> },
              { k: 'd', l: 'Lo que contó', r: (r) => <span className="faqa-texto">{r.detalle}</span> },
              { k: 'n', l: 'Persona', r: (r) => <>{r.nombre}<div className="faqa-sub">{r.email}</div></> },
              { k: 'c', l: 'Curso', r: (r) => [r.curso, r.edicion].filter(Boolean).join(' · ') || '—' }
            ]} />
          </Seccion>

          <Seccion titulo="Actividad por día" sub="Visitas y consultas de cada día del período (hora de Argentina).">
            <GraficoDias serie={d.serie} />
          </Seccion>

          <div className="faqa-duo">
            <Seccion titulo="Lo más buscado" sub="Los términos que más escribieron (cada uno cuenta una consulta)."
              csv={csvBtn('mas-buscado.csv', ['Término', 'Veces', 'Personas', 'Sin resultado'], d.masBuscados.map((t) => [t.termino, t.veces, t.personas, t.sinResultado]))}>
              <Tabla vacio="Todavía no hay búsquedas en este período." filas={d.masBuscados} cols={[
                { k: 't', l: 'Término', r: (t) => <b>{t.termino}</b> },
                { k: 'v', l: 'Veces', num: true, r: (t) => fmt(t.veces) },
                { k: 'p', l: 'Personas', num: true, r: (t) => fmt(t.personas) },
                { k: 's', l: 'Sin resultado', num: true, r: (t) => (t.sinResultado ? <span className="faqa-mal">{fmt(t.sinResultado)}</span> : '—') }
              ]} />
            </Seccion>
            <Seccion titulo="Preguntas más abiertas" sub="Qué respuestas se leen más y si ayudaron."
              csv={csvBtn('preguntas-mas-abiertas.csv', ['Pregunta', 'Veces abierta', 'Ayudó (sí)', 'No ayudó'], d.preguntasMasAbiertas.map((p) => [p.pregunta, p.abiertas, p.utilSi, p.utilNo]))}>
              <Tabla vacio="Todavía no se abrió ninguna pregunta en este período." filas={d.preguntasMasAbiertas} cols={[
                { k: 'q', l: 'Pregunta', r: (p) => p.pregunta },
                { k: 'a', l: 'Abierta', num: true, r: (p) => fmt(p.abiertas) },
                { k: 's', l: '👍', num: true, r: (p) => fmt(p.utilSi) },
                { k: 'n', l: '👎', num: true, r: (p) => fmt(p.utilNo) }
              ]} />
            </Seccion>
          </div>

          <div className="faqa-duo">
            <Seccion id="faqa-sec-peores" titulo="Respuestas que no ayudaron" sub="Preguntas con más votos de “no me ayudó”: conviene mejorarlas.">
              <Tabla vacio="Ninguna respuesta recibió votos negativos." filas={d.peorValoradas} cols={[
                { k: 'q', l: 'Pregunta', r: (p) => p.pregunta },
                { k: 'n', l: '👎', num: true, r: (p) => fmt(p.utilNo) },
                { k: 's', l: '👍', num: true, r: (p) => fmt(p.utilSi) }
              ]} />
            </Seccion>
            <Seccion id="faqa-sec-nadie" titulo="Preguntas que nadie abrió" sub="Activas y sin ninguna apertura en este período.">
              <Tabla vacio="Todas las preguntas activas se abrieron al menos una vez." filas={d.sinVisitas} cols={[
                { k: 'q', l: 'Pregunta', r: (p) => p.pregunta },
                { k: 'p', l: 'Para', r: (p) => (p.publico === 'interesados' ? 'Interesados' : p.publico === 'ambos' ? 'Ambos' : 'Estudiantes') }
              ]} />
            </Seccion>
          </div>

          <Seccion id="faqa-sec-clics" titulo="Dónde hicieron clic" sub="Enlaces y botones de las páginas públicas: WhatsApp, correos, videos, agenda, volver al campus, pedir videollamada."
            csv={csvBtn('clics.csv', ['Elemento', 'Destino', 'Clics', 'Personas'], d.clics.map((c) => [c.etiqueta, c.destino, c.veces, c.personas]))}>
            <Tabla vacio="Todavía no hubo clics en este período." filas={d.clics} limite={12} cols={[
              { k: 'e', l: 'Elemento', r: (c) => <b>{c.etiqueta}</b> },
              { k: 'v', l: 'Clics', num: true, r: (c) => <b>{fmt(c.veces)}</b> },
              { k: 'p', l: 'Personas', num: true, r: (c) => fmt(c.personas) },
              { k: 'd', l: 'Destino', r: (c) => <span className="faqa-dest" title={c.destino || ''}>{c.destino || '—'}</span> }
            ]} />
          </Seccion>

          <Seccion titulo="Por curso y edición" sub="Quiénes entran y qué buscan, según el curso y la edición que indicaron."
            csv={csvBtn('por-curso-y-edicion.csv', ['Curso', 'Edición', 'Personas', 'Consultas', 'Sin resultado', 'Preguntas abiertas', 'Videollamadas'], d.porCurso.map((c) => [c.curso, c.edicion, c.visitantes, c.busquedas, c.sinResultado, c.aperturas, c.solicitudes]))}>
            <Tabla vacio="Todavía no hay datos en este período." filas={d.porCurso} limite={12} cols={[
              { k: 'c', l: 'Curso', r: (c) => <b>{c.curso}</b> },
              { k: 'e', l: 'Edición', r: (c) => c.edicion || '—' },
              { k: 'v', l: 'Personas', num: true, r: (c) => fmt(c.visitantes) },
              { k: 'b', l: 'Consultas', num: true, r: (c) => fmt(c.busquedas) },
              { k: 's', l: 'Sin resultado', num: true, r: (c) => (c.sinResultado ? <span className="faqa-mal">{fmt(c.sinResultado)}</span> : '—') },
              { k: 'a', l: 'Preguntas abiertas', num: true, r: (c) => fmt(c.aperturas) },
              { k: 'z', l: 'Videollamadas', num: true, r: (c) => fmt(c.solicitudes) }
            ]} />
          </Seccion>

          <Seccion titulo="Búsquedas recientes" sub="Qué buscó cada persona (las más nuevas primero)."
            csv={csvBtn('busquedas.csv', ['Fecha', 'Término', 'Resultados', 'Nombre', 'Email', 'Curso', 'Edición', 'Público'], d.recientes.map((r) => [fechaHora(r.fecha), r.termino, r.resultados == null ? '' : r.resultados, r.nombre, r.email, r.curso, r.edicion, r.publico]))}>
            <Tabla vacio="Todavía no hay búsquedas en este período." filas={d.recientes} limite={15} cols={[
              { k: 'f', l: 'Fecha', r: (r) => fechaHora(r.fecha) },
              { k: 't', l: 'Buscó', r: (r) => <b>{r.termino}</b> },
              { k: 'r', l: 'Resultados', num: true, r: (r) => (r.resultados === 0 ? <span className="faqa-mal">0</span> : fmt(r.resultados)) },
              { k: 'n', l: 'Persona', r: (r) => <>{r.nombre}<div className="faqa-sub">{r.email}</div></> },
              { k: 'c', l: 'Curso', r: (r) => [r.curso, r.edicion].filter(Boolean).join(' · ') || '—' }
            ]} />
          </Seccion>
        </div>
      )}
    </div>
  );
}
