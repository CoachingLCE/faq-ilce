'use client';
// Solicitudes de videollamada por Zoom: lo que pidió cada persona que no encontró respuesta, con sus días y horarios disponibles.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ESTADOS_SOLICITUD } from '../lib/constants';
import { tienePermisoSolicitudes, tienePermisoExportar } from '../lib/permisos';
import { fechaHora, horario } from '../lib/fechasFaq';
import { descargarCSV } from '../lib/csv';
import { useDialogos } from './Dialogos';

async function api(url, metodo, cuerpo) {
  try {
    const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) return { ok: false, error: j.error || 'No se pudo completar la acción.' };
    return j;
  } catch { return { ok: false, error: 'No se pudo conectar. Revisá tu conexión.' }; }
}
const soloDigitos = (s) => String(s || '').replace(/\D/g, '');
const TONO = { Nueva: 'nueva', Contactada: 'cont', Agendada: 'agend', Resuelta: 'ok', Descartada: 'desc' };

function mensajeSugerido(s) {
  const nombre = (s.nombre || '').split(' ')[0] || '';
  const opciones = (s.disponibilidad || []).map((d) => '• ' + horario(d)).join('\n');
  return `Hola ${nombre}, te escribimos del Instituto ILCE por tu consulta: “${s.consulta}”.\n\nVimos que tenés disponibilidad:\n${opciones}${s.zonaHoraria ? `\n(horarios en ${s.zonaHoraria.replace(/_/g, ' ')})` : ''}\n\nTe proponemos una videollamada por Zoom en uno de esos horarios. Cuando nos confirmes, te enviamos el enlace.`;
}

function Detalle({ s, usuario, puede, onCerrar, onGuardado, onCrearPregunta }) {
  const { avisar } = useDialogos();
  const [f, setF] = useState({ estado: s.estado, responsable: s.responsable, linkZoom: s.linkZoom, fechaAgendada: s.fechaAgendada, notas: s.notas });
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const sucio = f.estado !== s.estado || f.responsable !== s.responsable || f.linkZoom !== s.linkZoom || f.fechaAgendada !== s.fechaAgendada || f.notas !== s.notas;
  async function guardar() {
    setGuardando(true); setErr('');
    const r = await api('/api/solicitudes', 'PATCH', { id: s.id, ...f, solicitanteEmail: usuario.email });
    setGuardando(false);
    if (r.ok === false) return setErr(r.error);
    avisar('Solicitud actualizada'); onGuardado(r.solicitud);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(mensajeSugerido(s)); avisar('Mensaje copiado'); } catch { avisar('No se pudo copiar', 'error'); }
  }
  const wa = soloDigitos(s.whatsapp);
  return (
    <div className="faqa-overlay" role="dialog" aria-modal="true" aria-label="Detalle de la solicitud">
      <div className="faqa-dialog faqa-dialog-ancho">
        <div className="faqa-dialog-h"><h2>{s.nombre}</h2><button type="button" className="btn-sm" onClick={onCerrar}>Cerrar</button></div>
        <div className="faqa-det-grid">
          <div>
            <div className="faqa-kv"><span>Pidió</span><b>{fechaHora(s.fecha)}</b></div>
            <div className="faqa-kv"><span>Email</span><b><a href={'mailto:' + s.email}>{s.email}</a></b></div>
            {s.whatsapp && <div className="faqa-kv"><span>WhatsApp</span><b>{wa ? <a href={'https://wa.me/' + wa} target="_blank" rel="noopener noreferrer">{s.whatsapp}</a> : s.whatsapp}</b></div>}
            <div className="faqa-kv"><span>Público</span><b>{s.publico === 'interesados' ? 'Interesado/a' : 'Estudiante'}</b></div>
            {s.curso && <div className="faqa-kv"><span>{s.publico === 'interesados' ? 'Curso de interés' : 'Curso'}</span><b>{s.curso}{s.edicion ? ' · ' + s.edicion : ''}</b></div>}
            {(s.pais || s.zonaHoraria) && <div className="faqa-kv"><span>Ubicación</span><b>{[s.pais, (s.zonaHoraria || '').replace(/_/g, ' ')].filter(Boolean).join(' · ')}</b></div>}
            <div className="faqa-bloque"><span>Consulta</span><p>{s.consulta}</p></div>
            <div className="faqa-bloque"><span>Días y horarios disponibles{s.zonaHoraria ? ` (${s.zonaHoraria.replace(/_/g, ' ')})` : ''}</span>
              <ul>{(s.disponibilidad || []).map((d, i) => <li key={i}>{horario(d)}</li>)}</ul></div>
            <div className="faqa-actions" style={{ marginTop: 6 }}>
              <button className="btn-sm" onClick={copiar}>Copiar mensaje sugerido</button>
              {puede && onCrearPregunta && <button className="btn-sm" onClick={() => onCrearPregunta(s.consulta)}>Crear una pregunta con esta consulta</button>}
            </div>
          </div>
          <div>
            <div className="field"><label htmlFor="sl-e">Estado</label>
              <select id="sl-e" className="ctrl" disabled={!puede} value={f.estado} onChange={(e) => set('estado', e.target.value)}>{ESTADOS_SOLICITUD.map((e) => <option key={e}>{e}</option>)}</select></div>
            <div className="field"><label htmlFor="sl-r">Responsable</label>
              <div style={{ display: 'flex', gap: 6 }}><input id="sl-r" className="ctrl" disabled={!puede} value={f.responsable} onChange={(e) => set('responsable', e.target.value)} maxLength={80} />
                {puede && <button type="button" className="btn-sm" onClick={() => set('responsable', usuario.nombre)}>Yo</button>}</div></div>
            <div className="field"><label htmlFor="sl-f">Fecha y hora agendada</label><input id="sl-f" className="ctrl" disabled={!puede} placeholder="Ej.: martes 20/10, 18:30 (hora Argentina)" value={f.fechaAgendada} onChange={(e) => set('fechaAgendada', e.target.value)} maxLength={30} /></div>
            <div className="field"><label htmlFor="sl-z">Enlace de Zoom</label><input id="sl-z" className="ctrl" disabled={!puede} placeholder="https://zoom.us/j/…" value={f.linkZoom} onChange={(e) => set('linkZoom', e.target.value)} maxLength={300} /></div>
            <div className="field"><label htmlFor="sl-n">Notas internas</label><textarea id="sl-n" className="ctrl" rows={4} disabled={!puede} value={f.notas} onChange={(e) => set('notas', e.target.value)} maxLength={2000} /></div>
            {err && <div className="faqa-err" role="alert">{err}</div>}
            {puede ? <div className="faqa-actions"><button className="btn btn-primary" style={{ flex: 'none' }} disabled={!sucio || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
              : <p className="faqa-nota">Tu rol puede ver las solicitudes, pero no modificarlas.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SolicitudesAdmin({ usuario, onCrearPregunta }) {
  const puede = tienePermisoSolicitudes(usuario);
  const puedeExportar = tienePermisoExportar(usuario);
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);

  const cargar = useCallback(async () => {
    const r = await api(`/api/solicitudes?solicitanteEmail=${encodeURIComponent(usuario.email)}`, 'GET');
    if (r.ok === false) setError(r.error); else { setError(''); setLista(r.solicitudes || []); }
  }, [usuario.email]);
  useEffect(() => { cargar(); }, [cargar]);

  const conteo = useMemo(() => { const c = {}; (lista || []).forEach((s) => { c[s.estado] = (c[s.estado] || 0) + 1; }); return c; }, [lista]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (lista || []).filter((s) => (!estado || s.estado === estado) && (!t || [s.nombre, s.email, s.curso, s.edicion, s.consulta, s.responsable].join(' ').toLowerCase().includes(t)));
  }, [lista, estado, q]);

  function exportar() {
    descargarCSV('solicitudes-videollamada.csv',
      ['Fecha', 'Estado', 'Responsable', 'Nombre', 'Email', 'WhatsApp', 'Público', 'Curso', 'Edición', 'País', 'Zona horaria', 'Consulta', 'Disponibilidad', 'Link Zoom', 'Fecha agendada', 'Notas'],
      visibles.map((s) => [fechaHora(s.fecha), s.estado, s.responsable, s.nombre, s.email, s.whatsapp, s.publico, s.curso, s.edicion, s.pais, s.zonaHoraria, s.consulta, (s.disponibilidad || []).map(horario).join(' | '), s.linkZoom, s.fechaAgendada, s.notas]));
  }

  if (error) return <div className="note" style={{ borderLeftColor: 'rgb(var(--bad))' }}>{error}</div>;
  if (!lista) return <div className="spin" />;

  return (
    <div className="faqa-sec">
      <div className="faqa-toolbar">
        <div className="fchips faqa-fchips">
          <button className={'fchip' + (estado === '' ? ' on' : '')} onClick={() => setEstado('')}>Todas <span className="cnt">{lista.length}</span></button>
          {ESTADOS_SOLICITUD.map((e) => <button key={e} className={'fchip' + (estado === e ? ' on' : '')} onClick={() => setEstado(e)}>{e} <span className="cnt">{conteo[e] || 0}</span></button>)}
        </div>
        <input className="ctrl faqa-buscar" placeholder="Buscar por nombre, email, curso o consulta…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar solicitudes" />
        <span className="grow" />
        {puedeExportar && visibles.length > 0 && <button className="btn-sm" onClick={exportar}>Exportar CSV</button>}
      </div>
      {lista.length > 0 && (
        <div className="faqa-chips" style={{ margin: 0 }}>
          <span className={'faqa-chip t-' + ((conteo.Nueva || 0) ? 'bad' : 'good')}>{conteo.Nueva || 0} sin atender</span>
          <span className="faqa-chip t-info">{lista.filter((s) => !s.responsable && s.estado !== 'Resuelta' && s.estado !== 'Descartada').length} sin responsable</span>
          <span className="faqa-chip t-info">{(conteo.Agendada || 0)} agendadas</span>
          <span className="faqa-chip t-info">{lista.filter((s) => s.publico === 'interesados').length} de interesados · {lista.filter((s) => s.publico !== 'interesados').length} de estudiantes</span>
        </div>
      )}
      {!puede && <p className="faqa-nota">Podés ver las solicitudes. Gestionarlas (estado, responsable, Zoom) lo hace Coordinación académica o Admin.</p>}
      {lista.length === 0 ? <div className="vacio">Todavía no hay solicitudes de videollamada. Aparecen acá cuando alguien no encuentra su respuesta y pide que lo contacten.</div>
        : visibles.length === 0 ? <div className="vacio">No hay solicitudes con ese filtro.</div> : (
          <div className="tablewrap"><table className="faqa-tabla">
            <thead><tr><th>Fecha</th><th>Persona</th><th>Curso</th><th>Consulta</th><th>Horarios</th><th>Estado</th><th>Responsable</th><th /></tr></thead>
            <tbody>
              {visibles.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => setSel(s)}>
                  <td>{fechaHora(s.fecha)}</td>
                  <td><b>{s.nombre}</b><div className="faqa-sub">{s.email}</div></td>
                  <td>{s.curso || '—'}{s.edicion ? <div className="faqa-sub">{s.edicion}</div> : null}</td>
                  <td className="faqa-consulta">{s.consulta}</td>
                  <td>{(s.disponibilidad || []).length}</td>
                  <td><span className={'faqa-estado e-' + TONO[s.estado]}>{s.estado}</span></td>
                  <td>{s.responsable || <span className="faqa-sub">Sin asignar</span>}</td>
                  <td><button className="btn-sm" onClick={(e) => { e.stopPropagation(); setSel(s); }}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      {sel && <Detalle s={sel} usuario={usuario} puede={puede} onCerrar={() => setSel(null)} onCrearPregunta={onCrearPregunta ? (c) => { setSel(null); onCrearPregunta(c); } : null}
        onGuardado={(n) => { setLista((l) => l.map((x) => (x.id === n.id ? { ...x, ...n } : x))); setSel(null); }} />}
    </div>
  );
}
