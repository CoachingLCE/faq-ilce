'use client';
// Preguntas frecuentes: listado por público, alta, edición, orden, ocultar y eliminar. Quien solo puede ver, lee las preguntas y respuestas sin editar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIAS, nombreCategoria, PUBLICOS } from '../lib/constants';
import { tienePermisoPreguntas } from '../lib/permisos';
import { aHtml } from '../lib/faqTexto';
import { buscar } from '../lib/buscador';
import { useDialogos } from './Dialogos';

const IC = { editar: '', eliminar: '', ver: '', video: '' };
const VACIA = { id: '', publico: 'estudiantes', categoria: 'gen', pregunta: '', respuesta: '', video: '', palabrasClave: '', destacada: false, activa: true };

async function api(url, metodo, cuerpo) {
  try {
    const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) return { ok: false, error: j.error || 'No se pudo completar la acción.' };
    return j;
  } catch { return { ok: false, error: 'No se pudo conectar. Revisá tu conexión.' }; }
}

function Formulario({ inicial, onCerrar, onGuardar }) {
  const [f, setF] = useState(inicial);
  const [err, setErr] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const esEst = f.publico !== 'interesados';
  async function guardar(e) {
    e.preventDefault();
    if (f.pregunta.trim().length < 5) return setErr('Escribí la pregunta (mínimo 5 letras).');
    if (f.respuesta.trim().length < 5) return setErr('Escribí la respuesta.');
    setErr(''); setGuardando(true);
    const r = await onGuardar(f);
    if (r && r.error) { setErr(r.error); setGuardando(false); }
  }
  return (
    <div className="faqa-overlay" role="dialog" aria-modal="true" aria-label={f.id ? 'Editar pregunta' : 'Nueva pregunta'}>
      <form className="faqa-dialog" onSubmit={guardar}>
        <div className="faqa-dialog-h"><h2>{f.id ? 'Editar pregunta' : 'Nueva pregunta'}</h2><button type="button" className="btn-sm" onClick={onCerrar}>Cerrar</button></div>
        <div className="faqa-grid2">
          <div className="field"><label htmlFor="pq-pub">¿Para quién es?</label>
            <select id="pq-pub" className="ctrl" value={f.publico} onChange={(e) => set('publico', e.target.value)}>{PUBLICOS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
          {esEst && <div className="field"><label htmlFor="pq-cat">Categoría (estudiantes)</label>
            <select id="pq-cat" className="ctrl" value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>{CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>}
        </div>
        <div className="field"><label htmlFor="pq-q">Pregunta <span className="req">*</span></label><input id="pq-q" className="ctrl" value={f.pregunta} onChange={(e) => set('pregunta', e.target.value)} maxLength={250} autoFocus /></div>
        <div className="field"><label htmlFor="pq-r">Respuesta <span className="req">*</span></label>
          <div className="help">Formato: **negrita**, *cursiva*, [texto del enlace](https://…), [correo](mailto:alguien@dominio.com). Cada salto de línea es un renglón nuevo. Para sumar una infografía o captura: ![descripción](https://…/imagen.png) (el enlace tiene que ser una imagen pública).</div>
          <textarea id="pq-r" className="ctrl" rows={6} value={f.respuesta} onChange={(e) => set('respuesta', e.target.value)} maxLength={3000} /></div>
        {f.respuesta.trim() && <div className="field"><label>Así se va a ver</label><div className="faqa-prev" dangerouslySetInnerHTML={{ __html: aHtml(f.respuesta) }} /></div>}
        <div className="faqa-grid2">
          <div className="field"><label htmlFor="pq-v">Video (opcional)</label><input id="pq-v" className="ctrl" placeholder="https://youtu.be/…" value={f.video} onChange={(e) => set('video', e.target.value)} maxLength={300} />
            <div className="help">Si queda vacío, no se muestra el botón de video.</div></div>
          <div className="field"><label htmlFor="pq-k">Palabras clave (opcional)</label><input id="pq-k" className="ctrl" placeholder="sinónimos que la gente podría escribir" value={f.palabrasClave} onChange={(e) => set('palabrasClave', e.target.value)} maxLength={300} />
            <div className="help">Ayudan a que el buscador la encuentre.</div></div>
        </div>
        <div className="faqa-checks">
          <label><input type="checkbox" checked={f.destacada} onChange={(e) => set('destacada', e.target.checked)} /> Mostrarla en “Lo más consultado” (estudiantes)</label>
          <label><input type="checkbox" checked={f.activa} onChange={(e) => set('activa', e.target.checked)} /> Visible en la página pública</label>
        </div>
        {err && <div className="faqa-err" role="alert">{err}</div>}
        <div className="faqa-actions"><button type="submit" className="btn btn-primary" style={{ flex: 'none' }} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button><button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button></div>
      </form>
    </div>
  );
}

export default function PreguntasAdmin({ usuario, prefill, onPrefillUsado }) {
  const { confirmar, avisar } = useDialogos();
  const puede = tienePermisoPreguntas(usuario);
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [pub, setPub] = useState('estudiantes');
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [cat, setCat] = useState('');
  const [form, setForm] = useState(null);
  const [verId, setVerId] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const r = await api(`/api/preguntas?solicitanteEmail=${encodeURIComponent(usuario.email)}`, 'GET');
    if (r.ok === false) setError(r.error); else { setError(''); setLista(r.preguntas || []); }
  }, [usuario.email]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (prefill && puede) { setForm({ ...VACIA, pregunta: prefill.pregunta || '', palabrasClave: prefill.palabrasClave || '' }); onPrefillUsado && onPrefillUsado(); } }, [prefill, puede, onPrefillUsado]);

  const delGrupo = useMemo(() => (lista || []).filter((p) => p.publico === pub || p.publico === 'ambos'), [lista, pub]);
  const aplicaFiltro = useCallback((p) => (filtro === 'destacadas' ? p.destacada : filtro === 'ocultas' ? !p.activa : filtro === 'video' ? !!p.video : filtro === 'visibles' ? p.activa : true) && (!cat || p.categoria === cat), [filtro, cat]);
  const visibles = useMemo(() => (q.trim() ? buscar(delGrupo, q) : delGrupo).filter(aplicaFiltro), [delGrupo, q, aplicaFiltro]);
  const cont = useMemo(() => ({ todas: delGrupo.length, visibles: delGrupo.filter((p) => p.activa).length, ocultas: delGrupo.filter((p) => !p.activa).length, destacadas: delGrupo.filter((p) => p.destacada).length, video: delGrupo.filter((p) => p.video).length }), [delGrupo]);
  const cuenta = (g) => (lista || []).filter((p) => p.publico === g || p.publico === 'ambos').length;

  async function guardar(f) {
    const cuerpo = { ...f, solicitanteEmail: usuario.email };
    const r = f.id ? await api('/api/preguntas', 'PATCH', cuerpo) : await api('/api/preguntas', 'POST', cuerpo);
    if (r.ok === false) return { error: r.error };
    setForm(null); avisar(f.id ? 'Pregunta actualizada' : 'Pregunta creada'); await cargar();
    return {};
  }
  async function alternar(p, campo) {
    setOcupado(true);
    const r = await api('/api/preguntas', 'PATCH', { id: p.id, [campo]: !p[campo], solicitanteEmail: usuario.email });
    setOcupado(false);
    if (r.ok === false) return avisar(r.error, 'error');
    await cargar();
  }
  async function mover(p, dir) {
    setOcupado(true);
    const r = await api('/api/preguntas', 'POST', { accion: 'mover', id: p.id, dir, solicitanteEmail: usuario.email });
    setOcupado(false);
    if (r.ok === false) return avisar(r.error, 'error');
    await cargar();
  }
  async function eliminar(p) {
    if (!(await confirmar({ titulo: 'Eliminar pregunta', mensaje: `Se elimina “${p.pregunta}” y ya no se puede recuperar. Si solo querés que no se vea, usá “Ocultar”.`, textoConfirmar: 'Eliminar', peligro: true }))) return;
    const r = await api('/api/preguntas', 'DELETE', { id: p.id, solicitanteEmail: usuario.email });
    if (r.ok === false) return avisar(r.error, 'error');
    avisar('Pregunta eliminada'); await cargar();
  }
  async function cargarIniciales() {
    if (!(await confirmar({ titulo: 'Cargar las preguntas iniciales', mensaje: 'Se cargan las preguntas que ya usaba ILCE (estudiantes e interesados). Después las podés editar, ordenar u ocultar. Esto se hace una sola vez.', textoConfirmar: 'Cargar' }))) return;
    setOcupado(true);
    const r = await api('/api/preguntas', 'POST', { accion: 'semilla', solicitanteEmail: usuario.email });
    setOcupado(false);
    if (r.ok === false) return avisar(r.error, 'error');
    avisar(`Se cargaron ${r.cargadas} preguntas`); await cargar();
  }

  if (error) return <div className="note" style={{ borderLeftColor: 'rgb(var(--bad))' }}>{error}</div>;
  if (!lista) return <div className="spin" />;

  return (
    <div className="faqa-sec">
      {lista.length === 0 && (
        <div className="faqa-card faqa-vacio">
          <h3>Todavía no hay preguntas cargadas</h3>
          {puede ? <><p>Podés empezar con las preguntas que ya usaba ILCE (30 en total: 20 para estudiantes y 10 para interesados) y editarlas después, o crear la primera desde cero.</p>
            <div className="faqa-actions"><button className="btn btn-primary" style={{ flex: 'none' }} disabled={ocupado} onClick={cargarIniciales}>Cargar las preguntas iniciales</button><button className="btn btn-ghost" onClick={() => setForm({ ...VACIA, publico: pub })}>Crear una desde cero</button></div></>
            : <p>Cuando el equipo las cargue, vas a poder verlas acá.</p>}
        </div>
      )}
      {lista.length > 0 && (
        <>
          <div className="faqa-toolbar">
            <div className="fchips faqa-fchips">
              <button className={'fchip' + (pub === 'estudiantes' ? ' on' : '')} onClick={() => { setPub('estudiantes'); setCat(''); }}>Estudiantes <span className="cnt">{cuenta('estudiantes')}</span></button>
              <button className={'fchip' + (pub === 'interesados' ? ' on' : '')} onClick={() => { setPub('interesados'); setCat(''); }}>Interesados <span className="cnt">{cuenta('interesados')}</span></button>
            </div>
            <input className="ctrl faqa-buscar" placeholder="Buscar en las preguntas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en las preguntas" />
            <span className="grow" />
            <a className="btn-sm" href={pub === 'estudiantes' ? '/estudiantes' : '/interesados'} target="_blank" rel="noopener noreferrer">Ver la página pública</a>
            {puede && <button className="btn-sm solid" onClick={() => setForm({ ...VACIA, publico: pub })}>+ Nueva pregunta</button>}
          </div>
          <div className="fchips faqa-fchips" aria-label="Filtrar preguntas">
            {[['', 'Todas', cont.todas], ['visibles', 'Visibles', cont.visibles], ['ocultas', 'Ocultas', cont.ocultas], ['destacadas', 'Lo más consultado', cont.destacadas], ['video', 'Con video', cont.video]].map(([v, l, n]) => <button key={v} className={'fchip' + (filtro === v ? ' on' : '')} onClick={() => setFiltro(v)}>{l} <span className="cnt">{n}</span></button>)}
            {pub !== 'interesados' && CATEGORIAS.filter((c) => delGrupo.some((p) => p.categoria === c.id)).map((c) => <button key={c.id} className={'fchip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(cat === c.id ? '' : c.id)}>{c.nombre} <span className="cnt">{delGrupo.filter((p) => p.categoria === c.id).length}</span></button>)}
          </div>
          {!puede && <p className="faqa-nota">Podés ver todas las preguntas y respuestas. Editarlas lo hace Coordinación académica o Admin.</p>}
          {visibles.length === 0 ? <div className="vacio">No hay preguntas que coincidan.</div> : (
            <div className="faqa-lista">
              {visibles.map((p, i) => (
                <div key={p.id} className={'faqa-preg' + (p.activa ? '' : ' oculta')}>
                  <div className="faqa-preg-top">
                    {puede && !q.trim() && (
                      <div className="faqa-orden"><button disabled={ocupado || i === 0} aria-label="Subir" onClick={() => mover(p, 'arriba')}>▲</button><button disabled={ocupado || i === visibles.length - 1} aria-label="Bajar" onClick={() => mover(p, 'abajo')}>▼</button></div>
                    )}
                    <div className="faqa-preg-main">
                      <div className="faqa-preg-tit">{p.pregunta}</div>
                      <div className="faqa-etiquetas">
                        {p.publico !== 'interesados' && <span className="faqa-tag">{nombreCategoria(p.categoria)}</span>}
                        {p.publico === 'ambos' && <span className="faqa-tag">Ambos públicos</span>}
                        {p.destacada && <span className="faqa-tag dest">Lo más consultado</span>}
                        {p.video && <span className="faqa-tag">{IC.video} Con video</span>}
                        {!p.activa && <span className="faqa-tag off">Oculta</span>}
                      </div>
                    </div>
                    <div className="faqa-preg-acc">
                      <button className="btn-sm" onClick={() => setVerId(verId === p.id ? null : p.id)}>{IC.ver} {verId === p.id ? 'Cerrar' : 'Ver'}</button>
                      {puede && <>
                        <button className="btn-sm" onClick={() => setForm({ ...p })}>{IC.editar} Editar</button>
                        <button className="btn-sm" disabled={ocupado} onClick={() => alternar(p, 'activa')}>{p.activa ? 'Ocultar' : 'Mostrar'}</button>
                        <button className="btn-sm" disabled={ocupado} onClick={() => alternar(p, 'destacada')} title="Mostrar u ocultar en “Lo más consultado”">{p.destacada ? 'Quitar destacado' : 'Destacar'}</button>
                        <button className="btn-sm faqa-peligro" onClick={() => eliminar(p)}>{IC.eliminar}</button>
                      </>}
                    </div>
                  </div>
                  {verId === p.id && (
                    <div className="faqa-resp">
                      <div dangerouslySetInnerHTML={{ __html: aHtml(p.respuesta) }} />
                      {p.video && <p><a href={p.video} target="_blank" rel="noopener noreferrer">{p.video}</a></p>}
                      {p.palabrasClave && <p className="faqa-nota">Palabras clave: {p.palabrasClave}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {form && <Formulario inicial={form} onCerrar={() => setForm(null)} onGuardar={guardar} />}
    </div>
  );
}
