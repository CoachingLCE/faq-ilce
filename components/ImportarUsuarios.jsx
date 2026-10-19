'use client';
// Importar usuarios desde la planilla de otra app (por ejemplo la de fichas). Solo Admin. Primero se mira qué cambiaría (sin escribir nada) y recién después se confirma.
import { useState } from 'react';
import { nombreVisibleRoles } from '../lib/constants';
import { useDialogos } from './Dialogos';

async function llamar(cuerpo) {
  try {
    const r = await fetch('/api/usuarios/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) return { ok: false, error: j.error || 'No se pudo importar.' };
    return j;
  } catch { return { ok: false, error: 'No se pudo conectar. Revisá tu conexión.' }; }
}

const ETQ = { nuevo: 'Nuevo', difiere: 'Existe con diferencias', igual: 'Ya está igual' };

export default function ImportarUsuarios({ usuario, onListo }) {
  const { confirmar } = useDialogos();
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiarClaves, setCopiarClaves] = useState(true);
  const [actualizar, setActualizar] = useState(false);
  const [elegidos, setElegidos] = useState({});
  const [resultado, setResultado] = useState(null);
  const [filtro, setFiltro] = useState('pendientes');

  async function mirar() {
    setAbierto(true); setCargando(true); setError(''); setResultado(null);
    const r = await llamar({ solicitanteEmail: usuario.email, accion: 'vista' });
    setCargando(false);
    if (r.ok === false) { setError(r.error); setVista(null); return; }
    setVista(r);
    const e = {}; r.personas.forEach((p) => { if (p.estado === 'nuevo') e[p.email] = true; });
    setElegidos(e);
  }
  async function importar() {
    const emails = Object.keys(elegidos).filter((k) => elegidos[k]);
    if (!emails.length) return setError('Elegí al menos una persona.');
    if (!(await confirmar({ titulo: 'Importar usuarios', mensaje: `Se agregan o actualizan ${emails.length} persona${emails.length === 1 ? '' : 's'}. ${copiarClaves ? 'Entran con la misma contraseña que usan en fichas.' : 'Cada persona recibe una clave temporal que tenés que compartirle.'} No se borra a nadie ni se cambia la contraseña de quien ya existe.`, textoConfirmar: 'Importar' }))) return;
    setCargando(true); setError('');
    const r = await llamar({ solicitanteEmail: usuario.email, accion: 'importar', copiarClaves, actualizarExistentes: actualizar, emails });
    setCargando(false);
    if (r.ok === false) return setError(r.error);
    setResultado(r); setVista(null); onListo && onListo();
  }

  const personas = vista ? vista.personas : [];
  const lista = personas.filter((p) => (filtro === 'todos' ? true : filtro === 'pendientes' ? p.estado !== 'igual' : p.estado === filtro));
  const marcados = Object.keys(elegidos).filter((k) => elegidos[k]).length;

  return (
    <div className="faqa-card" style={{ marginBottom: 14 }}>
      <div className="faqa-card-h">
        <div><h3>Importar usuarios desde otra app</h3><p>Trae las personas de la planilla de la app de fichas, con sus roles. Antes de guardar nada, ves qué cambiaría.</p></div>
        {!abierto && <button className="btn-sm solid" onClick={mirar}>Ver personas de fichas</button>}
        {abierto && <button className="btn-sm" onClick={() => { setAbierto(false); setVista(null); setResultado(null); setError(''); }}>Cerrar</button>}
      </div>
      {abierto && (
        <>
          {cargando && <div className="spin" style={{ margin: '24px auto' }} />}
          {error && <div className="faqa-err" role="alert">{error}</div>}
          {resultado && (
            <div className="note" style={{ borderLeftColor: 'rgb(var(--good))' }}>
              <b>Listo:</b> {resultado.agregados} persona{resultado.agregados === 1 ? '' : 's'} agregada{resultado.agregados === 1 ? '' : 's'}{resultado.actualizados ? ` y ${resultado.actualizados} actualizada${resultado.actualizados === 1 ? '' : 's'}` : ''}.
              {resultado.clavesTemporales && resultado.clavesTemporales.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div>Claves temporales (se muestran <b>solo ahora</b>; cada persona la cambia al ingresar). Copialas y compartilas por un medio seguro:</div>
                  <div className="tablewrap" style={{ marginTop: 8 }}><table className="faqa-tabla"><thead><tr><th>Persona</th><th>Email</th><th>Clave temporal</th></tr></thead>
                    <tbody>{resultado.clavesTemporales.map((c) => <tr key={c.email}><td>{c.nombre}</td><td>{c.email}</td><td><code>{c.clave}</code></td></tr>)}</tbody></table></div>
                  <button className="btn-sm" style={{ marginTop: 8 }} onClick={() => navigator.clipboard && navigator.clipboard.writeText(resultado.clavesTemporales.map((c) => `${c.nombre}\t${c.email}\t${c.clave}`).join('\n'))}>Copiar todas</button>
                </div>
              )}
            </div>
          )}
          {vista && (
            <>
              <p className="faqa-nota"><b>{vista.resumen.total}</b> personas en fichas: <b>{vista.resumen.nuevos}</b> nuevas, <b>{vista.resumen.difieren}</b> existen con diferencias y <b>{vista.resumen.iguales}</b> ya están igual.</p>
              <div className="faqa-checks">
                <label><input type="checkbox" checked={copiarClaves} onChange={(e) => setCopiarClaves(e.target.checked)} /> Que entren con la <b>misma contraseña</b> que en fichas (si no, reciben una clave temporal)</label>
                <label><input type="checkbox" checked={actualizar} onChange={(e) => setActualizar(e.target.checked)} /> Actualizar nombre, roles y estado de quienes ya existen aquí</label>
              </div>
              <div className="faqa-toolbar">
                <div className="subtabs-pill" style={{ margin: 0 }}>
                  {[['pendientes', 'A importar'], ['nuevo', 'Nuevas'], ['difiere', 'Con diferencias'], ['igual', 'Ya iguales'], ['todos', 'Todas']].map(([k, l]) => <button key={k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{l}</button>)}
                </div>
                <span className="grow" />
                <button className="btn-sm" onClick={() => { const e = {}; lista.forEach((p) => { if (p.estado !== 'igual' && (p.estado === 'nuevo' || actualizar)) e[p.email] = true; }); setElegidos(e); }}>Marcar las de esta lista</button>
                <button className="btn-sm" onClick={() => setElegidos({})}>Desmarcar todas</button>
              </div>
              <div className="tablewrap"><table className="faqa-tabla">
                <thead><tr><th /><th>Persona</th><th>Roles en fichas</th><th>Estado</th></tr></thead>
                <tbody>{lista.map((p) => (
                  <tr key={p.email}>
                    <td><input type="checkbox" disabled={p.estado === 'igual'} checked={!!elegidos[p.email]} onChange={(e) => setElegidos((x) => ({ ...x, [p.email]: e.target.checked }))} aria-label={'Elegir a ' + p.nombre} /></td>
                    <td><b>{p.nombre || '(sin nombre)'}</b><div className="faqa-sub">{p.email}{p.activo ? '' : ' · inactivo'}</div></td>
                    <td>{p.roles.length ? nombreVisibleRoles(p.roles) : <span className="faqa-mal">Sin rol válido (no podría usar nada)</span>}{p.rolesOriginales.length !== p.roles.length && <div className="faqa-sub">Se ignoran roles que esta app no usa</div>}</td>
                    <td><span className={'faqa-tag' + (p.estado === 'nuevo' ? ' dest' : '')}>{ETQ[p.estado]}</span></td>
                  </tr>))}</tbody></table></div>
              {lista.length === 0 && <div className="vacio vacio-chico">No hay personas en esta lista.</div>}
              <div className="faqa-actions" style={{ marginTop: 12 }}><button className="btn btn-primary" style={{ flex: 'none' }} disabled={cargando || !marcados} onClick={importar}>Importar {marcados} persona{marcados === 1 ? '' : 's'}</button></div>
            </>
          )}
        </>
      )}
    </div>
  );
}
