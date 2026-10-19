'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ROLES } from '../lib/constants';
import { TIPOS_CAP, GRUPOS_ROLES, INFO_ROL, capacidadesDe, pantallasDe, nombreRol } from '../lib/rolesInfo';
import { RolChip, RolesChips } from './RolChip';
import ImportarUsuarios from './ImportarUsuarios';
import MailsAutomaticos from './MailsAutomaticos';

// Íconos de la fuente de íconos de la app (mismos que usa el resto de las pantallas).
const IC = { ok: '', err: '', permisos: '', editar: '', eliminar: '', ver: '', clave: '', buscar: '', personas: '' };
const ICONO_TIPO = { c: IC.ver, g: IC.editar, a: IC.clave };

const rolesDe = (u) => (u.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean);
const inicial = (u) => ((u.Nombre || u.Email || '?').trim()[0] || '?').toUpperCase();

// Chips de funciones permitidas, agrupadas por tipo (consulta / gestión / administración).
function ListaCapacidades({ caps }) {
  return (
    <div className="cap-grupos">
      {TIPOS_CAP.map(({ t, l }) => {
        const items = caps.filter((c) => c.t === t && c.ok);
        if (!items.length) return null;
        return (
          <div className="cap-fila" key={t}>
            <span className={'cap-tipo t-' + t}>{l}</span>
            <span className="cap-chips">{items.map((c) => <span key={c.k} className={'cap t-' + t}><i aria-hidden="true">{ICONO_TIPO[t]}</i>{c.l}</span>)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TarjetaRol({ rol, grupo }) {
  const caps = useMemo(() => capacidadesDe([rol]), [rol]);
  const sin = caps.filter((c) => c.clave && !c.ok);
  const info = INFO_ROL[rol];
  const pantallas = useMemo(() => pantallasDe([rol]), [rol]);
  const permitidas = caps.filter((c) => c.ok).length;
  return (
    <div className={'perm-card r-' + rol}>
      <div className="perm-card-top">
        {grupo && <span className="perm-card-g">{grupo}</span>}
        <RolChip rol={rol} />
        <p className="perm-card-desc">{info.desc}</p>
      </div>
      <div className="perm-pant" aria-label="Pantallas de esta app que ve este rol">
        <span className="perm-pant-t">En esta app ve</span>
        <span className="perm-pant-l">{pantallas.map((p) => <span key={p.k} className={'perm-pant-c' + (p.ok ? ' si' : ' no')}>{p.ok ? '✓' : '✕'} {p.l}</span>)}</span>
      </div>
      {/* Resumen de un vistazo: cuántas funciones de cada tipo permite el rol (se calcula con las mismas funciones de permisos del sistema). */}
      <div className="perm-meters" aria-label={`Funciones permitidas: ${permitidas} de ${caps.length}`}>
        {TIPOS_CAP.map(({ t, l }) => {
          const total = caps.filter((c) => c.t === t).length;
          const ok = caps.filter((c) => c.t === t && c.ok).length;
          return (
            <div className={'perm-meter t-' + t + (ok === 0 ? ' vacio0' : '')} key={t}>
              <div className="perm-meter-l"><span>{l}</span><b>{ok} de {total}</b></div>
              <div className="perm-meter-bar"><span style={{ width: (total ? ok / total * 100 : 0) + '%' }} /></div>
            </div>
          );
        })}
      </div>
      <details className="perm-det">
        <summary>Ver las {permitidas} funciones</summary>
        <ListaCapacidades caps={caps} />
        {sin.length > 0 && (
          <div className="perm-sin2">
            <span className="perm-sin2-t">No puede</span>
            <span className="perm-sin2-l">{sin.map((c) => <span key={c.k} className="cap-no">{c.l}</span>)}</span>
          </div>
        )}
      </details>
    </div>
  );
}

// Selector de roles (casillas con el color de cada rol). Se usa al editar y al dar de alta.
function selectorRoles(valor, onChange) {
  return (
    <div className="rol-selector" role="group" aria-label="Roles">
      {ROLES.map((rol) => {
        const on = valor.includes(rol);
        return (
          <label key={rol} className={'rol-opt r-' + rol + (on ? ' on' : '')} title={INFO_ROL[rol].corta}>
            <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? [...valor, rol] : valor.filter((r) => r !== rol))} />
            <span>{nombreRol(rol)}</span>
          </label>
        );
      })}
    </div>
  );
}

// Comparación de roles en una sola tabla: cada función en una fila, cada rol en una columna (se calcula con las mismas funciones de permisos).
function MatrizPermisos() {
  const roles = GRUPOS_ROLES.flatMap((g) => g.roles);
  const porRol = useMemo(() => Object.fromEntries(roles.map((r) => [r, capacidadesDe([r])])), []);
  const filas = capacidadesDe(['Admin']); // solo para el orden y los nombres de las funciones
  const panPorRol = useMemo(() => Object.fromEntries(roles.map((r) => [r, pantallasDe([r])])), []);
  return (
    <div className="pm-wrap">
      <table className="pm-tabla">
        <thead>
          <tr>
            <th scope="col" className="pm-fn">Función</th>
            {roles.map((r) => <th scope="col" key={r}><RolChip rol={r} chico /></th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="pm-grupo"><th scope="rowgroup" colSpan={roles.length + 1}>Pantallas del panel en esta app</th></tr>
          {pantallasDe(['Admin']).map((f) => (
            <tr key={f.k}>
              <th scope="row" className="pm-fn">{f.l}</th>
              {roles.map((r) => { const ok = panPorRol[r].find((c) => c.k === f.k)?.ok; return <td key={r} className={ok ? 'pm-si t-c' : 'pm-no'}>{ok ? <><i aria-hidden="true">{IC.ok}</i><span className="sr-only">Sí</span></> : <><span aria-hidden="true">–</span><span className="sr-only">No</span></>}</td>; })}
            </tr>
          ))}
          {TIPOS_CAP.map(({ t, l }) => (
            <Fragment key={t}>
              <tr className="pm-grupo"><th scope="rowgroup" colSpan={roles.length + 1}>{l}</th></tr>
              {filas.filter((f) => f.t === t).map((f) => (
                <tr key={f.k}>
                  <th scope="row" className="pm-fn">{f.l}</th>
                  {roles.map((r) => {
                    const ok = porRol[r].find((c) => c.k === f.k)?.ok;
                    return <td key={r} className={ok ? 'pm-si t-' + t : 'pm-no'}>{ok ? <><i aria-hidden="true">{IC.ok}</i><span className="sr-only">Sí</span></> : <><span aria-hidden="true">–</span><span className="sr-only">No</span></>}</td>;
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Accesos({ usuario, onVerHistorial }) {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRoles, setNuevoRoles] = useState(['Inscripciones']);
  const [mensaje, setMensaje] = useState('');
  const [enviandoA, setEnviandoA] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState({});
  const [editandoRoles, setEditandoRoles] = useState(null);
  const [rolesEnEdicion, setRolesEnEdicion] = useState([]);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [filtroRol, setFiltroRol] = useState('');   // '' = todos · 'varios' = más de un rol · o un rol
  const [busqueda, setBusqueda] = useState('');
  const [verPermisos, setVerPermisos] = useState({});
  const [vistaPerm, setVistaPerm] = useState('tarjetas'); // 'tarjetas' | 'comparar'

  useEffect(() => { cargarUsuarios(); }, []);

  async function cargarUsuarios() {
    setCargando(true);
    const r = await fetch(`/api/usuarios?list=true&solicitanteEmail=${encodeURIComponent(usuario.email)}`).then((res) => res.json());
    setUsuarios((r.usuarios || []).filter((u) => u.Email));
    setCargando(false);
  }
  async function agregarUsuario(e) {
    e.preventDefault(); setMensaje('');
    const r = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, nuevoEmail, nombre: nuevoNombre, roles: nuevoRoles, password: nuevoPassword }) }).then((res) => res.json());
    if (r.error) { setMensaje(`${IC.err} ${r.error}`); return; }
    setMensaje(`${IC.ok} Usuario creado. Clave temporal (compartila con la persona, la cambia al ingresar): ${r.claveTemporal}`);
    setNuevoEmail(''); setNuevoNombre(''); setNuevoPassword(''); setNuevoRoles(['Inscripciones']); cargarUsuarios();
  }
  async function restablecer(targetEmail) {
    setEnviandoA(targetEmail); setMensaje('');
    const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail, nuevaPassword: '' }) }).then((res) => res.json());
    setMensaje(r.error ? `${IC.err} ${r.error}` : `${IC.ok} Contraseña restablecida para ${targetEmail}. Clave temporal (compartila con la persona, la cambia al ingresar): ${r.claveTemporal}`);
    setEnviandoA(''); cargarUsuarios();
  }
  function empezarEdicionRoles(u) { setEditandoRoles(u.Email); setRolesEnEdicion(rolesDe(u)); }
  async function guardarRoles(email) {
    setMensaje('');
    const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: email, nuevosRoles: rolesEnEdicion }) }).then((res) => res.json());
    setMensaje(r.error ? `${IC.err} ${r.error}` : `${IC.ok} Roles actualizados para ${email}`);
    setEditandoRoles(null); cargarUsuarios();
  }
  async function toggleActivo(u) {
    setMensaje('');
    const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: u.Email, activo: !u.Activo }) }).then((res) => res.json());
    setMensaje(r.error ? `${IC.err} ${r.error}` : (u.Activo ? `Usuario ${u.Email} desactivado` : `${IC.ok} Usuario ${u.Email} reactivado`));
    cargarUsuarios();
  }
  async function confirmarYEliminar() {
    if (!confirmarEliminar) return; setMensaje('');
    const r = await fetch('/api/usuarios', { method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solicitanteEmail: usuario.email, targetEmail: confirmarEliminar.Email }) }).then((res) => res.json());
    setMensaje(r.error ? `${IC.err} ${r.error}` : `${IC.ok} Usuario ${confirmarEliminar.Email} eliminado`);
    setConfirmarEliminar(null); cargarUsuarios();
  }

  // Conteos para la leyenda/filtro de roles (sobre todos los usuarios, sin importar la búsqueda).
  const conteos = useMemo(() => {
    const c = { total: usuarios.length, varios: 0, porRol: {} };
    usuarios.forEach((u) => { const rs = rolesDe(u); if (rs.length > 1) c.varios++; rs.forEach((r) => { c.porRol[r] = (c.porRol[r] || 0) + 1; }); });
    return c;
  }, [usuarios]);
  // Misma regla que aplica el servidor: no se puede quitar el rol, desactivar ni eliminar al último administrador.
  const adminsActivos = useMemo(() => usuarios.filter((u) => rolesDe(u).includes('Admin') && u.Activo).length, [usuarios]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const rs = rolesDe(u);
      if (filtroRol === 'varios' && rs.length < 2) return false;
      if (filtroRol && filtroRol !== 'varios' && !rs.includes(filtroRol)) return false;
      if (q && !`${u.Nombre || ''} ${u.Email || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [usuarios, filtroRol, busqueda]);
  const hayFiltro = !!(filtroRol || busqueda.trim());

  const esError = mensaje.startsWith(IC.err) || /no se pudo/i.test(mensaje);

  // La solapa "Historial de accesos" (login/altas/bajas) se sacó de acá — ese registro ya
  // está afuera, como su propia hoja de navegación ("Historial de acciones", ver Auditoria.jsx),
  // que además cubre más que solo accesos. Tenerlo duplicado acá adentro era confuso.
  return (
    <div className="acc-root">
      <ImportarUsuarios usuario={usuario} onListo={cargarUsuarios} />
      <div className="panel acc-panel">
        <div className="acc-head">
          <h3><span className="acc-ico" aria-hidden="true">{IC.permisos}</span> Permisos por rol</h3>
          <div className="acc-origen" role="note">
            <b>De dónde sale la información.</b> Las personas y sus roles se toman de la <b>app de Fichas</b> (planilla de Fichas, pestaña Usuarios) con <b>Importar usuarios</b>, así que los roles se llaman igual en las dos apps. Lo que cada rol puede hacer <b>en Preguntas frecuentes</b> se define acá y puede ser distinto de lo que puede hacer en Fichas. Cambiar un rol acá no cambia nada en Fichas, que solo se lee.
          </div>
          <p className="acc-lead">Qué puede hacer cada rol en esta app. Se calcula con los mismos permisos que usa el sistema, así que siempre coincide con lo que la persona puede hacer de verdad.</p>
        </div>
        <div className="pm-toggle" role="group" aria-label="Forma de ver los permisos">
          <button className={vistaPerm === 'tarjetas' ? 'on' : ''} aria-pressed={vistaPerm === 'tarjetas'} onClick={() => setVistaPerm('tarjetas')}>Tarjetas</button>
          <button className={vistaPerm === 'comparar' ? 'on' : ''} aria-pressed={vistaPerm === 'comparar'} onClick={() => setVistaPerm('comparar')}>Comparar roles</button>
        </div>
        {vistaPerm === 'comparar' ? <MatrizPermisos /> : (
          /* Todas las tarjetas en una sola grilla (una al lado de la otra) para no tener que scrollear; el grupo se lee en la cabecera de cada tarjeta. */
          <div className="perm-grid perm-grid-todas">
            {GRUPOS_ROLES.flatMap((g) => g.roles.map((r) => <TarjetaRol key={r} rol={r} grupo={g.titulo} />))}
          </div>
        )}
        <div className="acc-nota">
          <b>Roles combinados.</b> Una persona puede tener más de un rol. El sistema permite una función si <b>alguno</b> de sus roles la permite, así que combinar roles puede ampliar lo que puede hacer, nunca reducirlo. Ver las respuestas de actividades y formularios está disponible para todos los roles.
        </div>
      </div>

      <div className="panel acc-panel">
        <div className="acc-head">
          <h3>Gestión de accesos</h3>
          <p className="acc-lead">Las personas que pueden entrar al panel, con sus roles. Los cambios de rol, contraseña y estado quedan registrados en el Historial.</p>
        </div>
        {mensaje && <p className={'acc-msg' + (esError ? ' err' : '')} role="status">{mensaje}</p>}

        {cargando ? <p className="muted">Cargando…</p> : (
          <>
            <div className="acc-filtros">
              <div className="rol-leyenda" role="group" aria-label="Filtrar por rol">
                <button type="button" className={'rol-filtro' + (!filtroRol ? ' on' : '')} onClick={() => setFiltroRol('')}>Todos <span className="cnt">{conteos.total}</span></button>
                {ROLES.map((r) => (
                  <button key={r} type="button" className={'rol-filtro r-' + r + (filtroRol === r ? ' on' : '')} aria-pressed={filtroRol === r}
                    onClick={() => setFiltroRol(filtroRol === r ? '' : r)} title={INFO_ROL[r].corta}>
                    <i className="pto" aria-hidden="true" />{nombreRol(r)} <span className="cnt">{conteos.porRol[r] || 0}</span>
                  </button>
                ))}
                <button type="button" className={'rol-filtro varios' + (filtroRol === 'varios' ? ' on' : '')} aria-pressed={filtroRol === 'varios'}
                  onClick={() => setFiltroRol(filtroRol === 'varios' ? '' : 'varios')} title="Personas con más de un rol (permisos combinados)">
                  <span aria-hidden="true">{IC.personas}</span> Varios roles <span className="cnt">{conteos.varios}</span>
                </button>
              </div>
              <div className="acc-buscar">
                <div className="fsearch"><span aria-hidden="true">{IC.buscar}</span> <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o correo…" aria-label="Buscar usuario" /></div>
                <span className="acc-cuenta">{visibles.length} de {usuarios.length} {usuarios.length === 1 ? 'persona' : 'personas'}</span>
                {hayFiltro && <button className="btn-sm" onClick={() => { setFiltroRol(''); setBusqueda(''); }}>Limpiar</button>}
              </div>
            </div>

            <div className="acc-lista">
              {visibles.length === 0 && <div className="empty empty-sm"><p>No hay personas con estos filtros.</p></div>}
              {visibles.map((u) => {
                const roles = rolesDe(u);
                const combinado = roles.length > 1;
                const esUltimoAdmin = roles.includes('Admin') && u.Activo && adminsActivos <= 1;
                const caps = capacidadesDe(roles);
                const cantidad = caps.filter((c) => c.ok).length;
                return (
                  <div key={u.Email} className={'acc-fila' + (u.Activo ? '' : ' inactiva')}>
                    <div className="acc-quien">
                      <span className={'acc-avatar' + (roles[0] ? ' r-' + roles[0] : '')} aria-hidden="true">{inicial(u)}</span>
                      <div className="acc-quien-txt">
                        <p className="acc-nombre" title={u.Nombre}>{u.Nombre}</p>
                        <p className="acc-email" title={u.Email}>{u.Email}</p>
                      </div>
                    </div>

                    <div className="acc-medio">
                      {editandoRoles === u.Email ? (
                        <div className="acc-editroles">
                          {selectorRoles(rolesEnEdicion, setRolesEnEdicion)}
                          <div className="acc-editroles-btns">
                            <button className="btn-sm solid" onClick={() => guardarRoles(u.Email)}>Guardar roles</button>
                            <button className="btn-sm" onClick={() => setEditandoRoles(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="acc-roles">
                            <RolesChips roles={roles} />
                            {combinado && <span className="acc-tag combinado" title="Tiene más de un rol: puede usar las funciones de todos ellos.">Permisos combinados</span>}
                          </div>
                          <div className="acc-estados">
                            {u.passwordActual ? (
                              <button className="acc-pass" onClick={() => setMostrarPassword((p) => ({ ...p, [u.Email]: !p[u.Email] }))} title="Mostrar u ocultar la contraseña">
                                {mostrarPassword[u.Email] ? u.passwordActual : '••••••••'}
                              </button>
                            ) : u.estadoPassword === 'protegida' ? (
                              <span className="acc-tag ok" title="La eligió la propia persona y no se puede ver. Si la olvida, usá Restablecer. No tiene que ver con el rol ni con los permisos.">Contraseña protegida</span>
                            ) : u.estadoPassword === 'temporal' ? (
                              <span className="acc-tag aviso" title="Es una clave temporal: todavía no la cambió. No se puede volver a ver; si hace falta, usá Restablecer.">Clave temporal · sin cambiar</span>
                            ) : <span className="acc-tag aviso" title="Esta persona no tiene contraseña cargada. Usá Restablecer para generarle una clave temporal.">Sin contraseña</span>}
                            {!u.Activo && <span className="acc-tag off" title="No puede ingresar mientras esté desactivada.">Cuenta desactivada</span>}
                            {esUltimoAdmin && <span className="acc-tag clave" title="Es el único administrador activo: el sistema no permite quitarle el rol, desactivarlo ni eliminarlo.">Único administrador</span>}
                            <button type="button" className="acc-vermas" aria-expanded={!!verPermisos[u.Email]} onClick={() => setVerPermisos((p) => ({ ...p, [u.Email]: !p[u.Email] }))}>
                              {verPermisos[u.Email] ? 'Ocultar permisos' : `Ver permisos (${cantidad})`}
                            </button>
                          </div>
                        </>
                      )}
                      {verPermisos[u.Email] && editandoRoles !== u.Email && (
                        <div className="acc-efectivos">
                          <p className="acc-efectivos-t">Permisos efectivos{combinado ? ' (suma de sus roles)' : ''}</p>
                          {cantidad ? <ListaCapacidades caps={caps} /> : <p className="muted" style={{ fontSize: 13, margin: 0 }}>Sin rol asignado: no puede usar ninguna función.</p>}
                        </div>
                      )}
                    </div>

                    <div className="acc-acciones">
                      {onVerHistorial && <button className="btn-sm acc-b" onClick={() => onVerHistorial(u.Email)} title="Ver en el Historial de acciones todo lo que hizo esta persona"><span aria-hidden="true">{IC.ver || ''}</span> Qué hizo</button>}
                      <button className="btn-sm acc-b" onClick={() => empezarEdicionRoles(u)} title="Cambiar los roles de esta persona"><span aria-hidden="true">{IC.editar}</span> Cambiar rol</button>
                      <button className="btn-sm acc-b" disabled={enviandoA === u.Email} onClick={() => restablecer(u.Email)} title="Envía por mail una clave temporal nueva">
                        {enviandoA === u.Email ? 'Enviando…' : 'Restablecer'}
                      </button>
                      <button className={'btn-sm acc-b ' + (u.Activo ? 'acc-b-aviso' : 'acc-b-ok')} onClick={() => toggleActivo(u)}
                        title={u.Activo ? 'Impide que esta persona ingrese. No borra nada.' : 'Vuelve a permitir que esta persona ingrese.'}>{u.Activo ? 'Desactivar' : 'Reactivar'}</button>
                      <button className="btn-sm acc-b acc-b-peligro" onClick={() => setConfirmarEliminar(u)} title="Eliminar esta persona (pide confirmación)" aria-label={`Eliminar a ${u.Nombre}`}><span aria-hidden="true">{IC.eliminar}</span> Eliminar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="acc-alta">
          <h4 className="perm-grupo-t">Agregar nuevo usuario</h4>
          <form onSubmit={agregarUsuario} className="form-grid-2">
            <div><label style={lbl}>Email</label><input required type="email" className="ctrl" value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} placeholder="nombre@institutoilce.com" /></div>
            <div><label style={lbl}>Nombre</label><input required className="ctrl" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} /></div>
            <div><label style={lbl}>Contraseña</label><input className="ctrl" value={nuevoPassword} onChange={(e) => setNuevoPassword(e.target.value)} placeholder="Vacío = se genera una clave temporal" /></div>
            <div><label style={lbl}>Rol(es)</label>{selectorRoles(nuevoRoles, setNuevoRoles)}</div>
            <div className="col-full">
              <button type="submit" className="btn btn-primary" style={{ flex: 'none', padding: '11px 22px' }}>+ Dar acceso (se genera una clave temporal)</button>
            </div>
          </form>
        </div>
      </div>

      <MailsAutomaticos usuario={usuario} />

      {confirmarEliminar && (
        <div className="mwrap on">
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="acc-elim-t">
            <p id="acc-elim-t" style={{ fontWeight: 500, marginTop: 0 }}>¿Eliminar este usuario?</p>
            <p style={{ color: 'rgb(var(--textSec))', fontSize: 14 }}>{confirmarEliminar.Nombre} ({confirmarEliminar.Email}) — no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
              <button className="btn-sm" style={{ flex: 1, justifyContent: 'center', background: 'rgb(248 113 113)', color: '#fff', borderColor: 'transparent' }} onClick={confirmarYEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const lbl = { fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 5, color: 'rgb(var(--textSec))' };
