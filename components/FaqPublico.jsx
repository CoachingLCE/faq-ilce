'use client';
// Página pública de preguntas frecuentes (estudiantes e interesados).
// Antes de buscar, la persona siempre se identifica (nombre, email, curso y edición). Todo lo que hace queda registrado para los Reportes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { aHtml } from '../lib/faqTexto';
import { buscar, normalizar } from '../lib/buscador';
import { CATEGORIAS, nombreCategoria, CONTACTO, PROMO } from '../lib/constants';
import { mensajePromoWa } from '../lib/promo';

const K_DATOS = 'ilce-faq-datos';          // localStorage: para precargar el formulario la próxima vez
const K_IDENT = 'ilce-faq-ident-';         // sessionStorage: ya se identificó en esta visita
const K_SID = 'ilce-faq-sid';              // sessionStorage: id de la visita

const WA = `https://api.whatsapp.com/send?phone=${CONTACTO.whatsapp}`;
const waLink = (txt) => WA + (txt ? '&text=' + encodeURIComponent(txt) : '');

const PAISES = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador', 'España', 'Estados Unidos', 'México', 'Panamá', 'Paraguay', 'Perú', 'Uruguay', 'Venezuela', 'Otro'];
const ZONAS_BASE = ['America/Argentina/Buenos_Aires', 'America/Santiago', 'America/Montevideo', 'America/Asuncion', 'America/La_Paz', 'America/Lima', 'America/Bogota', 'America/Guayaquil', 'America/Caracas', 'America/Panama', 'America/Costa_Rica', 'America/Mexico_City', 'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'UTC'];

const leer = (store, k) => { try { return JSON.parse(store.getItem(k) || 'null'); } catch { return null; } };
const guardar = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: sigue funcionando */ } };

function nuevoSid() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch { /* */ }
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
function sidActual() {
  try { let s = sessionStorage.getItem(K_SID); if (!s) { s = nuevoSid(); sessionStorage.setItem(K_SID, s); } return s; } catch { return nuevoSid(); }
}
function zonaDetectada() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } }
function paisDeZona(z) {
  if (/Argentina|Buenos_Aires/.test(z)) return 'Argentina';
  const m = { 'America/Santiago': 'Chile', 'America/Montevideo': 'Uruguay', 'America/Asuncion': 'Paraguay', 'America/La_Paz': 'Bolivia', 'America/Lima': 'Perú', 'America/Bogota': 'Colombia', 'America/Guayaquil': 'Ecuador', 'America/Caracas': 'Venezuela', 'America/Panama': 'Panamá', 'America/Costa_Rica': 'Costa Rica', 'America/Mexico_City': 'México', 'America/Sao_Paulo': 'Brasil', 'Europe/Madrid': 'España' };
  return m[z] || '';
}
function listaZonas() {
  let todas = [];
  try { if (Intl.supportedValuesOf) todas = Intl.supportedValuesOf('timeZone'); } catch { /* */ }
  const det = zonaDetectada();
  const base = [...ZONAS_BASE];
  if (det && !base.includes(det)) base.unshift(det);
  const resto = todas.filter((z) => !base.includes(z));
  return { base, resto };
}
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const Ico = {
  buscar: <svg className="faq-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  play: <svg viewBox="0 0 10 12"><path d="M0 0l10 6-10 6z" /></svg>,
  wa: <svg className="wa-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
  cam: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="13" height="12" rx="2" /><path d="m22 8-7 4 7 4z" /></svg>
};

// ───────────────────────── Ventana: identificación ─────────────────────────
function VentanaIdentidad({ publico, opciones, inicial, onListo, onOtroPublico }) {
  const esEst = publico === 'estudiantes';
  const [f, setF] = useState({ nombre: inicial.nombre || '', email: inicial.email || '', curso: inicial.curso || '', edicion: inicial.edicion || '' });
  const [err, setErr] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cursos = opciones.cursos || [];
  const curso = cursos.find((c) => c.nombre === f.curso);
  const eds = curso ? curso.ediciones : [];
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function enviar(e) {
    e.preventDefault();
    const nombre = f.nombre.trim(); const email = f.email.trim();
    if (nombre.length < 2) return setErr('Escribí tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setErr('Revisá tu email: no parece válido.');
    if (!f.curso.trim()) return setErr(esEst ? 'Elegí tu curso.' : 'Elegí el curso que te interesa.');
    if (esEst && !f.edicion.trim()) return setErr('Elegí tu edición.');
    setErr(''); setEnviando(true);
    const datos = { nombre, email, curso: f.curso.trim(), edicion: f.edicion.trim() };
    const r = await onListo(datos);
    if (r && r.error) { setErr(r.error); setEnviando(false); }
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="faq-id-t">
      <form className="modal" onSubmit={enviar} noValidate>
        <h2 id="faq-id-t">{esEst ? <>Antes de buscar, <em>contanos quién sos</em></> : <>Antes de empezar, <em>contanos quién sos</em></>}</h2>
        <p className="sub">{esEst ? 'Así podemos ayudarte mejor y mejorar las respuestas según lo que necesitan los estudiantes de cada curso.' : 'Así podemos ayudarte mejor y, si hace falta, contactarte con información sobre el curso que te interesa.'}</p>
        <div className="tipo-persona" role="group" aria-label="¿Sos estudiante?">
          <button type="button" className={esEst ? 'on' : ''} onClick={() => { if (!esEst) onOtroPublico({ nombre: f.nombre.trim(), email: f.email.trim() }); }}>Soy estudiante</button>
          <button type="button" className={!esEst ? 'on' : ''} onClick={() => { if (esEst) onOtroPublico({ nombre: f.nombre.trim(), email: f.email.trim() }); }}>Todavía no soy estudiante</button>
        </div>
        <div className="campo"><label htmlFor="fi-n">Nombre y apellido <i>*</i></label><input id="fi-n" autoComplete="name" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} maxLength={80} autoFocus /></div>
        <div className="campo"><label htmlFor="fi-e">Email <i>*</i></label><input id="fi-e" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={120} /></div>
        <div className={esEst ? 'fila2' : ''}>
          <div className="campo"><label htmlFor="fi-c">{esEst ? 'Curso' : 'Curso de interés'} <i>*</i></label>
            {cursos.length ? (
              <select id="fi-c" value={f.curso} onChange={(e) => setF((x) => ({ ...x, curso: e.target.value, edicion: '' }))}>
                <option value="">Elegí una opción…</option>
                {cursos.map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                {!esEst && <option value="Todavía no lo sé">Todavía no lo sé</option>}
                {esEst && <option value="Otro">Otro</option>}
              </select>
            ) : <input id="fi-c" value={f.curso} onChange={(e) => set('curso', e.target.value)} maxLength={80} />}
          </div>
          {esEst && (
            <div className="campo"><label htmlFor="fi-ed">Edición <i>*</i></label>
              {eds.length ? (
                <select id="fi-ed" value={f.edicion} onChange={(e) => set('edicion', e.target.value)}>
                  <option value="">Elegí una opción…</option>
                  {eds.map((x) => <option key={x.label} value={x.label}>{x.label}</option>)}
                  <option value="No lo sé">No lo sé</option>
                </select>
              ) : <input id="fi-ed" value={f.edicion} onChange={(e) => set('edicion', e.target.value)} placeholder="Ej.: Edición 12" maxLength={80} />}
            </div>
          )}
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="acciones"><button className="btn-zoom" type="submit" disabled={enviando}>{enviando ? 'Un momento…' : 'Continuar'}</button></div>
        <p className="sub" style={{ margin: '14px 0 0', fontSize: 12 }}>Usamos estos datos solo para responderte y mejorar este centro de ayuda.</p>
      </form>
    </div>
  );
}

// ───────────────────────── Ventana: pedir videollamada ─────────────────────────
function VentanaVideollamada({ publico, ident, sesion, consultaInicial, onCerrar, track }) {
  const zonas = useMemo(listaZonas, []);
  const det = zonaDetectada();
  const [f, setF] = useState({ nombre: ident.nombre, email: ident.email, whatsapp: ident.whatsapp || '', pais: paisDeZona(det), zona: det || 'America/Argentina/Buenos_Aires', consulta: consultaInicial || '' });
  const [slots, setSlots] = useState([{ fecha: '', desde: '', hasta: '' }]);
  const [err, setErr] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setSlot = (i, k, v) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function enviar(e) {
    e.preventDefault();
    if (f.nombre.trim().length < 2) return setErr('Escribí tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return setErr('Revisá tu email: no parece válido.');
    if (f.consulta.trim().length < 5) return setErr('Contanos en pocas palabras qué querés consultar.');
    const validos = slots.filter((s) => s.fecha && s.desde && s.hasta);
    if (!validos.length) return setErr('Agregá al menos un día y un rango de horario en el que podamos contactarte.');
    if (validos.some((s) => s.desde >= s.hasta)) return setErr('En cada horario, "hasta" tiene que ser posterior a "desde".');
    setErr(''); setEnviando(true);
    try {
      const r = await fetch('/api/publico/solicitud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesion, publico, nombre: f.nombre, email: f.email, whatsapp: f.whatsapp, curso: ident.curso, edicion: ident.edicion, pais: f.pais, zonaHoraria: f.zona, consulta: f.consulta, disponibilidad: validos }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setErr(j.error || 'No pudimos enviar tu solicitud. Probá de nuevo o escribinos por WhatsApp.'); setEnviando(false); return; }
      setListo(true);
    } catch { setErr('No pudimos enviar tu solicitud. Revisá tu conexión y probá de nuevo.'); setEnviando(false); }
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="faq-zm-t">
      <div className="modal modal-ancho">
        {listo ? (
          <div className="listo">
            <div className="ok-ico">✓</div>
            <h2 id="faq-zm-t">¡Recibimos tu <em>solicitud</em>!</h2>
            <p className="sub">Te vamos a escribir a <b>{f.email}</b> para coordinar la videollamada por Zoom en alguno de los horarios que nos dejaste.</p>
            <div className="acciones" style={{ justifyContent: 'center' }}><button className="btn-zoom" onClick={onCerrar}>Volver a las preguntas</button></div>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate>
            <h2 id="faq-zm-t">Pedí una <em>videollamada</em></h2>
            <p className="sub">Contanos qué necesitás y en qué días y horarios podés. Alguien del equipo te va a contactar para coordinar un Zoom.</p>
            <div className="fila2">
              <div className="campo"><label htmlFor="zm-n">Nombre y apellido <i>*</i></label><input id="zm-n" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} maxLength={80} /></div>
              <div className="campo"><label htmlFor="zm-e">Email <i>*</i></label><input id="zm-e" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={120} /></div>
            </div>
            <div className="campo"><label htmlFor="zm-w">WhatsApp (opcional)</label><input id="zm-w" inputMode="tel" value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="Con código de país, ej. +54 9 11 …" maxLength={30} /></div>
            <div className="campo"><label htmlFor="zm-q">¿Qué querés consultar? <i>*</i></label><textarea id="zm-q" value={f.consulta} onChange={(e) => set('consulta', e.target.value)} maxLength={1200} /></div>
            <div className="fila2">
              <div className="campo"><label htmlFor="zm-p">País</label>
                <select id="zm-p" value={f.pais} onChange={(e) => set('pais', e.target.value)}><option value="">—</option>{PAISES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="campo"><label htmlFor="zm-z">Tu zona horaria</label>
                <select id="zm-z" value={f.zona} onChange={(e) => set('zona', e.target.value)}>
                  {zonas.base.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                  {zonas.resto.length > 0 && <optgroup label="Otras">{zonas.resto.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}</optgroup>}
                </select></div>
            </div>
            <div className="campo" style={{ marginBottom: 6 }}><label>Días y horarios en los que podés <i>*</i></label><small>Los horarios son en tu zona horaria. Podés agregar hasta 5 opciones.</small></div>
            {slots.map((s, i) => (
              <div className="slot" key={i}>
                <div className="campo"><label htmlFor={`zm-f${i}`}>Día</label><input id={`zm-f${i}`} type="date" min={hoyISO()} value={s.fecha} onChange={(e) => setSlot(i, 'fecha', e.target.value)} /></div>
                <div className="campo"><label htmlFor={`zm-d${i}`}>Desde</label><input id={`zm-d${i}`} type="time" value={s.desde} onChange={(e) => setSlot(i, 'desde', e.target.value)} /></div>
                <div className="campo"><label htmlFor={`zm-h${i}`}>Hasta</label><input id={`zm-h${i}`} type="time" value={s.hasta} onChange={(e) => setSlot(i, 'hasta', e.target.value)} /></div>
                {slots.length > 1 ? <button type="button" className="slot-x" aria-label="Quitar este horario" onClick={() => setSlots((x) => x.filter((_, j) => j !== i))}>✕</button> : <span />}
              </div>
            ))}
            {slots.length < 5 && <button type="button" className="mas-slot" onClick={() => setSlots((x) => [...x, { fecha: '', desde: '', hasta: '' }])}>+ Agregar otro horario</button>}
            {err && <div className="err" role="alert">{err}</div>}
            <div className="acciones">
              <button className="btn-zoom" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
              <button type="button" className="btn-sec" onClick={onCerrar} disabled={enviando}>Cancelar</button>
              <a className="link-small" href={waLink('Hola, quiero consultar: ' + f.consulta)} target="_blank" rel="noopener noreferrer" data-track="WhatsApp (desde videollamada)">o escribinos por WhatsApp</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Visor de infografías ─────────────────────────
function VisorImagen({ imagen, onCerrar }) {
  const cerrar = useRef(null);
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden';
    if (cerrar.current) cerrar.current.focus();
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = previo; };
  }, [onCerrar]);
  return (
    <div className="visor-fondo" role="dialog" aria-modal="true" aria-label={imagen.alt || 'Infografía'} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="visor-caja">
        <div className="visor-barra">
          <span className="visor-titulo">{imagen.alt}</span>
          <a className="visor-abrir" href={imagen.src} target="_blank" rel="noopener noreferrer" data-track="no">Abrir en una pestaña</a>
          <button type="button" className="visor-x" ref={cerrar} data-track="no" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>
        <div className="visor-img"><img src={imagen.src} alt={imagen.alt} /></div>
      </div>
    </div>
  );
}

// ───────────────────────── "Contanos qué estabas buscando" ─────────────────────────
function DetalleBusqueda({ termino, onEnviar }) {
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState(false);
  if (enviado) return <div className="detalle-ok" role="status">¡Gracias! Lo vamos a tener en cuenta para sumar la respuesta.</div>;
  return (
    <form className="detalle-form" onSubmit={(e) => { e.preventDefault(); if (texto.trim().length < 3) return; onEnviar(texto.trim()); setEnviado(true); }}>
      <label htmlFor="faq-detalle">Contanos qué estabas buscando concretamente</label>
      <textarea id="faq-detalle" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={600} placeholder={'Ej.: quería saber si ' + (termino || 'esto') + '…'} />
      <button type="submit" className="btn-sec" data-track="no" disabled={texto.trim().length < 3}>Enviar lo que buscaba</button>
    </form>
  );
}

// ───────────────────────── Banner de promoción ─────────────────────────
const K_PROMO = 'ilce_promo_v7_end';
function Promo({ cursos, ubicacion }) {
  const nombres = useMemo(() => {
    const base = (PROMO.cursos && PROMO.cursos.length) ? PROMO.cursos : cursos.map((c) => c.nombre);
    return base.filter((n) => !PROMO.excluir.includes(n));
  }, [cursos]);
  const [i, setI] = useState(0);
  const [salida, setSalida] = useState(-1);
  const [resta, setResta] = useState(null);
  useEffect(() => {
    if (nombres.length < 2) return undefined;
    const t = setInterval(() => setI((a) => { setSalida(a); return (a + 1) % nombres.length; }), 2800);
    return () => clearInterval(t);
  }, [nombres.length]);
  useEffect(() => {
    // Cuenta regresiva: fecha fija (PROMO.cierre) o X horas desde la primera visita (se guarda en el navegador).
    let fin = 0;
    if (PROMO.cierre) fin = new Date(PROMO.cierre).getTime() || 0;
    else if (PROMO.horas > 0) {
      try {
        fin = parseInt(localStorage.getItem(K_PROMO) || '0', 10) || 0;
        if (!fin) { fin = Date.now() + PROMO.horas * 3600000; localStorage.setItem(K_PROMO, String(fin)); }
      } catch { fin = Date.now() + PROMO.horas * 3600000; }
    }
    if (!fin) return undefined;
    const tick = () => setResta(Math.max(0, fin - Date.now()));
    tick(); const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (!PROMO.activa || !nombres.length) return null;
  const terminada = resta === 0;
  const hh = resta == null ? 0 : Math.floor(resta / 3600000), mm = resta == null ? 0 : Math.floor(resta / 60000) % 60, ss = resta == null ? 0 : Math.floor(resta / 1000) % 60;
  const dos = (n) => String(n).padStart(2, '0');
  const msj = mensajePromoWa(PROMO, resta) + (nombres[i] ? ' Me interesa: ' + nombres[i] + '.' : '');
  return (
    <div className="promo-wrap">
      <div className="ilce-wrap">
        <div className="side" aria-hidden="true"><div className="geo l1" /><div className="geo l2" /><div className="geo l3" /><div className="geo l4" /><div className="geo l5" /><div className="geo l6" /></div>
        <div className="ilce-center">
          <span className="promo-pill">{PROMO.etiqueta}</span>
          {PROMO.descuento && <span className="descuento-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>{PROMO.descuento}</span>}
          <div className="ilce-title">{PROMO.titulo}</div>
          <div className="course-rotate-wrap" aria-live="off">
            {nombres.map((n, k) => <span key={n} className={'course-name' + (k === i ? ' active' : k === salida ? ' exit' : '')}>{n}</span>)}
          </div>
          {resta != null && !terminada && (
            <>
              <div className="solo-quedan">⏱ Solo quedan:</div>
              <div className="countdown-row">
                <div className="cd-box"><span className="cd-num">{dos(hh)}</span><span className="cd-lbl">horas</span></div><span className="cd-sep">:</span>
                <div className="cd-box"><span className="cd-num">{dos(mm)}</span><span className="cd-lbl">min</span></div><span className="cd-sep">:</span>
                <div className="cd-box"><span className="cd-num">{dos(ss)}</span><span className="cd-lbl">seg</span></div>
              </div>
            </>
          )}
          {terminada && <div className="promo-fin">Promo finalizada</div>}
          <a className="ilce-btn" href={waLink(msj)} target="_blank" rel="noopener noreferrer" data-track={'Promo (' + ubicacion + '): ' + PROMO.boton}>{Ico.wa}{PROMO.boton}</a>
        </div>
        <div className="side" aria-hidden="true"><div className="geo r1" /><div className="geo r2" /><div className="geo r3" /><div className="geo r4" /><div className="geo r5" /><div className="geo r6" /></div>
      </div>
    </div>
  );
}

// ───────────────────────── Página ─────────────────────────
export default function FaqPublico({ publico }) {
  const esEst = publico === 'estudiantes';
  const [preguntas, setPreguntas] = useState(null);
  const [errCarga, setErrCarga] = useState('');
  const [opciones, setOpciones] = useState({ cursos: [] });
  const [ident, setIdent] = useState(null);       // null = todavía no se identificó
  const [listoInicio, setListoInicio] = useState(false);
  const [pedirIdent, setPedirIdent] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('todas');
  const [abierta, setAbierta] = useState(null);
  const [votos, setVotos] = useState({});
  const [zoom, setZoom] = useState(false);
  const [visor, setVisor] = useState(null); // infografía abierta en grande
  const sid = useRef('');
  const buffer = useRef([]);
  const identRef = useRef(null);
  const listaRef = useRef([]);
  const ultimoTermino = useRef('');
  const timerBusq = useRef(null);
  const qRef = useRef('');
  const refsItems = useRef({});

  qRef.current = q;
  identRef.current = ident;

  // ---- registro de acciones (se agrupan y se envían cada pocos segundos) ----
  const enviarLote = useCallback((conBeacon) => {
    const id = identRef.current;
    if (!id || !buffer.current.length) return;
    const eventos = buffer.current.splice(0, 40);
    const cuerpo = JSON.stringify({ sesion: sid.current, publico, identidad: id, eventos });
    try {
      if (conBeacon && navigator.sendBeacon) { navigator.sendBeacon('/api/publico/eventos', new Blob([cuerpo], { type: 'application/json' })); }
      else fetch('/api/publico/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo, keepalive: true }).catch(() => {});
    } catch { /* nunca molesta a la persona */ }
    if (buffer.current.length) enviarLote(conBeacon);
  }, [publico]);

  const track = useCallback((ev) => {
    buffer.current.push({ ...ev, t: Date.now() });
    if (buffer.current.length >= 15) enviarLote(false);
  }, [enviarLote]);

  const registrarBusqueda = useCallback(() => {
    clearTimeout(timerBusq.current);
    const termino = normalizar(qRef.current);
    if (termino.length < 3 || termino === ultimoTermino.current) return;
    ultimoTermino.current = termino;
    track({ tipo: 'busqueda', termino: qRef.current.trim(), resultados: buscar(listaRef.current, qRef.current).length });
  }, [track]);

  // ---- arranque ----
  useEffect(() => {
    sid.current = sidActual();
    const guardada = leer(sessionStorage, K_IDENT + publico);
    if (guardada && guardada.nombre && guardada.email) setIdent(guardada); else setPedirIdent(true);
    setListoInicio(true);
    fetch('/api/publico/preguntas?publico=' + publico + (publico === 'estudiantes' ? '&extra=1' : '')).then((r) => r.json()).then((j) => {
      if (j.ok) setPreguntas(j.preguntas); else setErrCarga(j.error || 'No se pudieron cargar las preguntas.');
    }).catch(() => setErrCarga('No se pudieron cargar las preguntas. Revisá tu conexión.'));
    fetch('/api/publico/opciones').then((r) => r.json()).then((j) => { if (j && j.cursos) setOpciones(j); }).catch(() => {});
    const t = setInterval(() => enviarLote(false), 6000);
    const salir = () => { registrarBusqueda(); enviarLote(true); };
    const vis = () => { if (document.visibilityState === 'hidden') salir(); };
    window.addEventListener('pagehide', salir);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); window.removeEventListener('pagehide', salir); document.removeEventListener('visibilitychange', vis); };
  }, [publico, enviarLote, registrarBusqueda]);

  const lista = preguntas || [];
  listaRef.current = lista;

  // ---- búsqueda con pausa: se registra cuando la persona deja de escribir ----
  useEffect(() => {
    clearTimeout(timerBusq.current);
    if (!ident) return undefined;
    timerBusq.current = setTimeout(registrarBusqueda, 1100);
    return () => clearTimeout(timerBusq.current);
  }, [q, ident, registrarBusqueda]);

  const buscando = normalizar(q).length > 0;
  const visibles = useMemo(() => {
    if (buscando) return buscar(lista, q);
    const propias = lista.filter((p) => !p.otro);
    return cat === 'todas' ? propias : propias.filter((p) => p.categoria === cat);
  }, [lista, q, cat, buscando]);
  const destacadas = useMemo(() => lista.filter((p) => p.destacada && !p.otro), [lista]);
  const sinResultados = buscando && normalizar(q).length >= 2 && preguntas && visibles.length === 0;

  async function confirmarIdentidad(datos) {
    const previo = leer(localStorage, K_DATOS) || {};
    const completo = { ...datos, whatsapp: previo.whatsapp || '' };
    try {
      const r = await fetch('/api/publico/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesion: sid.current, publico, ...completo, dispositivo: window.innerWidth < 700 ? 'móvil' : 'escritorio' }) });
      if (r.status === 400) { const j = await r.json().catch(() => ({})); return { error: j.error || 'Revisá tus datos.' }; }
    } catch { /* sin conexión con el registro: igual puede usar las preguntas */ }
    guardar(localStorage, K_DATOS, completo);
    guardar(sessionStorage, K_IDENT + publico, completo);
    setIdent(completo); setPedirIdent(false);
    return {};
  }

  function abrir(id, origen) {
    registrarBusqueda();
    if (abierta === id) { setAbierta(null); return; }
    track({ tipo: 'abrir_pregunta', preguntaId: id, termino: buscando ? q.trim() : '', destino: origen || '' });
    setAbierta(id);
  }
  function irA(id) {
    if (buscando) setQ('');
    setCat('todas');
    setAbierta(id);
    track({ tipo: 'abrir_pregunta', preguntaId: id, destino: 'lo-mas-consultado' });
    setTimeout(() => { const el = refsItems.current[id]; if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
  }
  function votar(id, v) {
    setVotos((x) => ({ ...x, [id]: v }));
    track({ tipo: v === 'si' ? 'util_si' : 'util_no', preguntaId: id, termino: buscando ? q.trim() : '' });
  }
  function elegirCat(id) { setCat(id); setAbierta(null); track({ tipo: 'filtro', termino: id === 'todas' ? 'Todas' : nombreCategoria(id) }); }

  // Clics en enlaces y botones marcados: quedan registrados con su texto y su destino.
  function alClic(e) {
    const imgLink = e.target.closest && e.target.closest('.resp-img-link');
    if (imgLink) {
      e.preventDefault();
      const src = imgLink.getAttribute('href') || ''; const alt = (imgLink.querySelector('img') || {}).alt || '';
      setVisor({ src, alt });
      if (ident) { track({ tipo: 'clic', termino: /^infograf/i.test(alt) ? alt : 'Infografía: ' + (alt || 'sin título'), destino: src }); enviarLote(false); }
      return;
    }
    const el = e.target.closest && e.target.closest('a[href], [data-track]');
    if (!el || !ident) return;
    const etiqueta = (el.getAttribute('data-track') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    const destino = el.getAttribute('href') || '';
    if (el.getAttribute('data-track') === 'no') return;
    track({ tipo: 'clic', termino: etiqueta, destino });
    enviarLote(false);
  }

  // "No soy estudiante" / "Ya soy estudiante": se pasa a la otra página llevando lo que ya escribió (nombre y email).
  const irAOtraPagina = (datos) => {
    const previo = leer(localStorage, K_DATOS) || {};
    guardar(localStorage, K_DATOS, { ...previo, ...(datos || {}) });
    window.location.href = esEst ? '/interesados' : '/estudiantes';
  };
  const abrirVideollamada = (origen) => { track({ tipo: 'clic', termino: 'Pedir videollamada (abrió el formulario)', destino: origen || 'tarjeta' }); registrarBusqueda(); setZoom(true); };
  const ultimaBusqueda = () => (buscando ? q.trim() : '');

  return (
    <div className="faqp" onClick={alClic}>
      {esEst && (
        <div className="topbar">
          <a className="btn-campus" href={CONTACTO.campus} target="_top" data-track="Volver al Campus (arriba)">← Volver al Campus</a>
          <span className="topbar-title">Centro de ayuda</span>
          <span className="topbar-spacer" />
        </div>
      )}

      <Promo cursos={opciones.cursos || []} ubicacion={esEst ? 'estudiantes' : 'interesados'} />

      <header className="faq-header">
        {esEst ? (
          <>
            <div className="blink-pill"><span className="blink-dot" />Centro de ayuda</div>
            <h1 className="faq-title">Preguntas <em>frecuentes</em></h1>
            <p className="faq-subtitle">Encontrá rápido lo que necesitás sobre la plataforma, la cursada, las certificaciones, los pagos y la comunidad.</p>
          </>
        ) : (
          <>
            <div className="faq-label">Instituto ILCE</div>
            <h1 className="faq-title">Preguntas frecuentes sobre <em>Instituto ILCE</em></h1>
            <p className="faq-subtitle">Todo lo que necesitás saber antes de empezar tu formación.</p>
          </>
        )}
      </header>

      <main className="faq-main">
        {ident && (
          <div className="quien">
            <span>Consultando como <b>{ident.nombre}</b></span>
            <span>{ident.email}</span>
            {ident.curso && <span>{ident.curso}{ident.edicion ? ' · ' + ident.edicion : ''}</span>}
            <button type="button" data-track="no" onClick={() => setPedirIdent(true)}>Cambiar mis datos</button>
            <button type="button" className="quien-otro" data-track="no" onClick={() => { track({ tipo: 'clic', termino: esEst ? 'Pasó a: No soy estudiante' : 'Pasó a: Ya soy estudiante', destino: esEst ? '/interesados' : '/estudiantes' }); enviarLote(false); irAOtraPagina(); }}>{esEst ? 'No soy estudiante' : 'Ya soy estudiante'}</button>
          </div>
        )}

        <div className="search-label">¿Qué estás buscando?</div>
        <div className="search-hint">Escribí una palabra o una frase, por ejemplo “certificado” o “cómo ingreso al campus”.</div>
        <div className="faq-search-wrap">
          {Ico.buscar}
          <input className="faq-search-input" type="search" value={q} disabled={!ident} aria-label="Buscar en las preguntas frecuentes" placeholder={ident ? 'Buscar una pregunta…' : 'Completá tus datos para buscar'} onChange={(e) => { setQ(e.target.value); if (e.target.value) { setCat('todas'); setAbierta(null); } }} onBlur={registrarBusqueda} onKeyDown={(e) => { if (e.key === 'Enter') registrarBusqueda(); }} />
          {q && <button type="button" className="faq-search-clear" aria-label="Borrar búsqueda" data-track="no" onClick={() => { registrarBusqueda(); setQ(''); }}>{Ico.x}</button>}
        </div>

        {esEst && !buscando && destacadas.length > 0 && (
          <div className="popular-section">
            <div className="popular-title">Lo más consultado</div>
            <div className="popular-grid">
              {destacadas.map((p) => <button key={p.id} type="button" className="popular-btn" data-track="no" onClick={() => irA(p.id)}>{p.pregunta}</button>)}
            </div>
          </div>
        )}

        {esEst && !buscando && (
          <div className="faq-filters" role="group" aria-label="Filtrar por tema">
            <button type="button" className={'filter-btn' + (cat === 'todas' ? ' active' : '')} data-track="no" onClick={() => elegirCat('todas')}>Todas</button>
            {CATEGORIAS.filter((c) => lista.some((p) => !p.otro && p.categoria === c.id)).map((c) => (
              <button key={c.id} type="button" className={'filter-btn' + (cat === c.id ? ' active' : '')} data-track="no" onClick={() => elegirCat(c.id)}>{c.nombre}</button>
            ))}
          </div>
        )}

        <div className="faq-list" style={!esEst || buscando ? { marginTop: 24 } : undefined} role="list">
          {!preguntas && !errCarga && listoInicio && <div className="cargando-faq">Cargando preguntas…</div>}
          {errCarga && <div className="no-results"><strong>{errCarga}</strong></div>}
          {buscando && preguntas && visibles.length > 0 && <div className="search-hint" style={{ marginBottom: 8 }}>{visibles.length} {visibles.length === 1 ? 'resultado' : 'resultados'}</div>}
          {visibles.map((p) => {
            const abierto = abierta === p.id;
            return (
              <div className="faq-item" key={p.id} role="listitem" ref={(el) => { refsItems.current[p.id] = el; }}>
                <button type="button" className={'faq-question' + (abierto ? ' active' : '')} aria-expanded={abierto} data-track="no" onClick={() => abrir(p.id)}>
                  <span className="faq-question-left">
                    {esEst && p.otro && <span className="badge badge-otro">Info general</span>}
                    {esEst && !p.otro && p.categoria && <span className={'badge badge-' + p.categoria}>{nombreCategoria(p.categoria)}</span>}
                    <span>{p.pregunta}</span>
                  </span>
                  <span className="faq-icon" aria-hidden="true">+</span>
                </button>
                <div className={'faq-answer' + (abierto ? ' open' : '')}>
                  <div>
                    <div className="faq-answer-inner">
                      <div dangerouslySetInnerHTML={{ __html: aHtml(p.respuesta) }} />
                      {p.video && <a className="video-btn" href={p.video} target="_blank" rel="noopener noreferrer" data-track={'Video: ' + p.pregunta}><span className="play-circle">{Ico.play}</span>Ver video tutorial</a>}
                      <div className="feedback-row">
                        {!votos[p.id] && (<><span className="feedback-label">¿Esta respuesta te ayudó?</span>
                          <button type="button" className="feedback-btn yes" data-track="no" onClick={() => votar(p.id, 'si')}>👍 Sí</button>
                          <button type="button" className="feedback-btn no" data-track="no" onClick={() => votar(p.id, 'no')}>👎 No</button></>)}
                        {votos[p.id] === 'si' && <span className="feedback-thanks">¡Gracias por tu opinión!</span>}
                        {votos[p.id] === 'no' && (
                          <span className="feedback-contact">Gracias por avisarnos. Podés <button type="button" data-track="no" onClick={() => abrirVideollamada('no-me-ayudo')}>pedir que te contactemos por videollamada</button> o <a href={waLink('Hola, tengo una consulta: ' + p.pregunta)} target="_blank" rel="noopener noreferrer" data-track="WhatsApp (respuesta no ayudó)">escribirnos por WhatsApp</a>.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {sinResultados && (
            <div className="no-results">
              <strong>No encontramos respuestas para “{q.trim()}”.</strong><br />
              Probá con otras palabras. Si no está lo que necesitás, contanos qué estabas buscando o pedí que alguien del equipo te contacte por videollamada.
              <DetalleBusqueda key={q.trim()} termino={q.trim()} onEnviar={(texto) => { track({ tipo: 'detalle_busqueda', termino: q.trim(), destino: texto }); enviarLote(false); }} />
              <div><button type="button" className="btn-zoom" data-track="no" onClick={() => abrirVideollamada('sin-resultados')}>{Ico.cam} Pedir una videollamada</button></div>
            </div>
          )}
        </div>

        {!sinResultados && preguntas && (
          <div className="zoom-card">
            <div>
              <h3>¿No encontraste lo que buscabas?</h3>
              <p>Dejanos tus días y horarios disponibles y alguien del equipo te contacta por videollamada de Zoom para resolver tu consulta.</p>
            </div>
            <button type="button" className="btn-zoom" data-track="no" disabled={!ident} onClick={() => abrirVideollamada('tarjeta')}>{Ico.cam} Pedir una videollamada</button>
          </div>
        )}

        <div className="faq-cta">
          <div className="faq-cta-text">
            <h3>{esEst ? '¿Preferís escribirnos?' : '¿Querés hablar con nosotros?'}</h3>
            <p>{esEst ? 'Si necesitás ayuda con algo puntual, te respondemos por WhatsApp.' : 'Escribinos por WhatsApp y te contamos todo sobre la formación que te interesa.'}</p>
          </div>
          <div className="faq-cta-actions">
            <a className="btn-wa" href={waLink(esEst ? 'Hola, necesito ayuda con una consulta.' : 'Hola, quiero más información sobre los cursos de ILCE.')} target="_blank" rel="noopener noreferrer" data-track="WhatsApp (principal)">{Ico.wa}Escribinos por WhatsApp</a>
            <a className="link-small" href={'mailto:' + (esEst ? CONTACTO.estudiantes : CONTACTO.info)} data-track="Email general">o por email: <strong>{esEst ? CONTACTO.estudiantes : CONTACTO.info}</strong></a>
          </div>
        </div>

        {!esEst && (
          <>
            <section className="contact-section" aria-labelledby="faq-contacto">
              <div className="section-header"><h2 id="faq-contacto">¿Querés más información?</h2><p>Escribinos y te contamos todo sobre la formación que te interesa.</p></div>
              <div className="contact-cards">
                <div className="contact-card featured"><span className="contact-featured-badge">Para inscribirte</span><span className="contact-card-icon" aria-hidden="true">📝</span><h3>Inscripciones</h3><p>Consultá por fechas, modalidades, cuotas y cómo reservar tu lugar.</p><span className="contact-card-email">{CONTACTO.inscripciones}</span><a className="btn-mail" href={'mailto:' + CONTACTO.inscripciones} data-track="Contacto: Inscripciones">Escribir</a></div>
                <div className="contact-card"><span className="contact-card-icon" aria-hidden="true">💬</span><h3>Consultas generales</h3><p>Dudas sobre el Instituto, los programas y las certificaciones.</p><span className="contact-card-email">{CONTACTO.info}</span><a className="btn-mail" href={'mailto:' + CONTACTO.info} data-track="Contacto: Información general">Escribir</a></div>
                <div className="contact-card"><span className="contact-card-icon" aria-hidden="true">💳</span><h3>Pagos y descuentos</h3><p>Medios de pago, cuotas y promociones vigentes.</p><span className="contact-card-email">{CONTACTO.administracion}</span><a className="btn-mail" href={'mailto:' + CONTACTO.administracion} data-track="Contacto: Administración">Escribir</a></div>
              </div>
            </section>
            <section className="agenda-section">
              <div className="agenda-card">
                <div className="agenda-card-left">
                  <div className="agenda-eyebrow"><span className="blink-dot" />Conocé ILCE</div>
                  <h2>Nuestras formaciones</h2>
                  <p>Mirá todos los cursos, sus modalidades y programas.</p>
                </div>
                <a className="btn-agenda" href={CONTACTO.cursos} target="_blank" rel="noopener noreferrer" data-track="Ver los cursos">Ver los cursos →</a>
              </div>
            </section>
            <section className="agenda-section">
              <div className="agenda-card">
                <div className="agenda-card-left">
                  <div className="agenda-eyebrow"><span className="blink-dot" />Agenda en vivo</div>
                  <h2>Clases abiertas y eventos</h2>
                  <p>Participá de las próximas clases abiertas y masterclasses del Instituto y conocenos en vivo.</p>
                </div>
                <a className="btn-agenda" href={CONTACTO.agenda} target="_blank" rel="noopener noreferrer" data-track="Agenda de eventos">Ver la agenda →</a>
              </div>
            </section>
            <section className="agenda-section">
              <div className="agenda-card">
                <div className="agenda-card-left">
                  <div className="agenda-eyebrow"><span className="blink-dot" />Blog</div>
                  <h2>Leé las notas del blog</h2>
                  <p>Artículos sobre coaching, educación, liderazgo y comunicación del equipo de ILCE.</p>
                </div>
                <a className="btn-agenda" href={CONTACTO.blog} target="_blank" rel="noopener noreferrer" data-track="Blog: leer notas">Leer las notas →</a>
              </div>
            </section>
            <div className="back-campus-bottom"><button type="button" className="btn-campus-bottom" data-track="no" onClick={() => { track({ tipo: 'clic', termino: 'Pasó a: Ya soy estudiante', destino: '/estudiantes' }); enviarLote(false); irAOtraPagina(); }}>¿Ya sos estudiante? Ir a las preguntas de estudiantes</button></div>
          </>
        )}

        {esEst && (
          <>
            <section className="contact-section" aria-labelledby="faq-contacto">
              <div className="section-header"><h2 id="faq-contacto">¿Con quién hablo?</h2><p>Si tu consulta es puntual, escribile directamente al área que corresponde.</p></div>
              <div className="contact-cards">
                <div className="contact-card"><span className="contact-card-icon" aria-hidden="true">📝</span><h3>Inscripciones</h3><p>Nuevas formaciones, cambios de edición e información sobre cursos.</p><span className="contact-card-email">{CONTACTO.inscripciones}</span><a className="btn-mail" href={'mailto:' + CONTACTO.inscripciones} data-track="Contacto: Inscripciones">Escribir</a></div>
                <div className="contact-card featured"><span className="contact-featured-badge">Más consultado</span><span className="contact-card-icon" aria-hidden="true">🎓</span><h3>Estudiantes</h3><p>Acceso al campus, clases, material, certificaciones y todo lo de tu cursada.</p><span className="contact-card-email">{CONTACTO.estudiantes}</span><a className="btn-mail" href={'mailto:' + CONTACTO.estudiantes} data-track="Contacto: Estudiantes">Escribir</a></div>
                <div className="contact-card"><span className="contact-card-icon" aria-hidden="true">💳</span><h3>Administración</h3><p>Pagos, cuotas, facturas y medios de pago.</p><span className="contact-card-email">{CONTACTO.administracion}</span><a className="btn-mail" href={'mailto:' + CONTACTO.administracion} data-track="Contacto: Administración">Escribir</a></div>
              </div>
            </section>

            <section className="agenda-section">
              <div className="agenda-card">
                <div className="agenda-card-left">
                  <div className="agenda-eyebrow"><span className="blink-dot" />Agenda en vivo</div>
                  <h2>Agenda de eventos</h2>
                  <p>Mirá las próximas clases abiertas, masterclasses y encuentros en vivo del Instituto.</p>
                </div>
                <a className="btn-agenda" href={CONTACTO.agenda} target="_blank" rel="noopener noreferrer" data-track="Agenda de eventos">Ver la agenda →</a>
              </div>
            </section>
            <section className="agenda-section">
              <div className="agenda-card">
                <div className="agenda-card-left">
                  <div className="agenda-eyebrow"><span className="blink-dot" />Blog</div>
                  <h2>Leé las notas del blog</h2>
                  <p>Artículos sobre coaching, educación, liderazgo y comunicación del equipo de ILCE.</p>
                </div>
                <a className="btn-agenda" href={CONTACTO.blog} target="_blank" rel="noopener noreferrer" data-track="Blog: leer notas">Leer las notas →</a>
              </div>
            </section>

            <div className="back-campus-bottom"><a className="btn-campus-bottom" href={CONTACTO.campus} target="_top" data-track="Volver al Campus (abajo)">← Volver al Campus</a></div>
          </>
        )}
      </main>

      {listoInicio && pedirIdent && <VentanaIdentidad publico={publico} opciones={opciones} inicial={ident || leer(localStorage, K_DATOS) || {}} onListo={confirmarIdentidad} onOtroPublico={irAOtraPagina} />}
      {visor && <VisorImagen imagen={visor} onCerrar={() => setVisor(null)} />}
      {zoom && ident && <VentanaVideollamada publico={publico} ident={ident} sesion={sid.current} consultaInicial={ultimaBusqueda()} track={track} onCerrar={() => setZoom(false)} />}
    </div>
  );
}
