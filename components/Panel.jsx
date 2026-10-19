'use client';
// Panel interno de Preguntas frecuentes: Preguntas · Solicitudes de videollamada · Reportes · Accesos · Historial.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/useSession';
import { tienePermisoVerPreguntas, tienePermisoVerSolicitudes, tienePermisoReportes, tienePermisoAccesos, tienePermisoAuditoria, puedeVerComoOtro } from '../lib/permisos';
import { Isologo } from './Isologo';
import ThemeSelector from './ThemeSelector';
import VersionBadge from './VersionBadge';
import { RolesChips } from './RolChip';
import PreguntasAdmin from './PreguntasAdmin';
import SolicitudesAdmin from './SolicitudesAdmin';
import ReportesFaq from './ReportesFaq';
import Accesos from './Accesos';
import Auditoria from './Auditoria';
import Herramientas from './Herramientas';
import { SelectDropdown } from './SelectDropdown';
import { nombreVisibleRoles } from '../lib/constants';

const IC = { preguntas: '', solicitudes: '', reportes: '', accesos: '', historial: '' };
const NOMBRE_TAB = { reportes: 'Reportes', solicitudes: 'Videollamadas', preguntas: 'Preguntas', accesos: 'Accesos', auditoria: 'Historial de acciones', herramientas: 'Herramientas' };
const DESC = {
  reportes: 'Qué busca la gente, qué busca y no encuentra, qué preguntas abre y dónde hace clic.',
  solicitudes: 'Personas que no encontraron su respuesta y pidieron una videollamada por Zoom, con sus días y horarios.',
  preguntas: 'Las preguntas y respuestas que se ven en las páginas públicas de estudiantes e interesados.',
  accesos: 'Quién entra a este panel, con qué rol y qué puede hacer cada rol. Acá también se importan usuarios desde fichas.',
  auditoria: 'Quién hizo qué y cuándo en este panel, mes a mes.',
  herramientas: 'Accesos rápidos y recursos del instituto: las apps de ILCE y las herramientas de uso diario.'
};

export default function Panel() {
  const { usuario: usuarioReal, cargando, logout } = useSession();
  const [verComo, setVerComo] = useState(null); // persona que se está "viendo como" (solo Admin)
  const [personas, setPersonas] = useState([]);
  const usuario = verComo || usuarioReal;
  const [tab, setTab] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [histPersona, setHistPersona] = useState(null);

  const tabs = useMemo(() => {
    if (!usuario) return [];
    return [
      tienePermisoReportes(usuario) && { id: 'reportes', l: 'Reportes' },
      tienePermisoVerSolicitudes(usuario) && { id: 'solicitudes', l: 'Videollamadas' },
      tienePermisoVerPreguntas(usuario) && { id: 'preguntas', l: 'Preguntas' },
      tienePermisoAccesos(usuario) && { id: 'accesos', l: 'Accesos' },
      tienePermisoAuditoria(usuario) && { id: 'auditoria', l: 'Historial de acciones' }
    ].filter(Boolean);
  }, [usuario]);

  useEffect(() => {
    if (!cargando && !usuarioReal) window.location.replace('/panel/login');
  }, [cargando, usuarioReal]);

  // Menú lateral fijo en escritorio (igual que en las otras apps de ILCE): deja lugar a la izquierda mientras el panel está abierto.
  useEffect(() => {
    document.body.classList.add('con-menu-lateral');
    return () => document.body.classList.remove('con-menu-lateral');
  }, []);

  useEffect(() => {
    // Herramientas la puede abrir cualquiera; si en "Ver como" la persona no tiene ninguna otra pantalla, se queda ahí.
    if (!tabs.length) { setTab('herramientas'); return; }
    const h = (typeof window !== 'undefined' && window.location.hash.replace('#', '')) || '';
    const ok = (id) => id === 'herramientas' || tabs.some((x) => x.id === id);
    setTab((t) => (t && ok(t) ? t : (ok(h) ? h : tabs[0].id)));
  }, [tabs]);
  useEffect(() => { if (tab) { try { window.history.replaceState(null, '', '#' + tab); } catch { /* */ } } }, [tab]);
  // Título de la pestaña del navegador por solapa.
  useEffect(() => { if (tab && NOMBRE_TAB[tab]) document.title = `${NOMBRE_TAB[tab]} · Preguntas frecuentes`; }, [tab]);

  async function cargarPersonas() {
    if (personas.length || !usuarioReal) return;
    try {
      const res = await fetch('/api/personas-vista?solicitanteEmail=' + encodeURIComponent(usuarioReal.email));
      const d = await res.json();
      if (d.ok) setPersonas(d.personas || []);
    } catch { /* silencioso */ }
  }

  const verHistorialDe = useCallback((email) => { setHistPersona({ email: String(email || ''), n: Date.now() }); setTab('auditoria'); }, []);
  const crearDesde = useCallback((texto) => { setPrefill({ pregunta: String(texto || ''), n: Date.now() }); setTab('preguntas'); }, []);
  const prefillUsado = useCallback(() => setPrefill(null), []);

  if (cargando) return <div className="spin" />;
  if (!usuarioReal) return null;

  return (
    <div className="appwrap">
      <header className="topnav">
        <div className="topnav-inner">
          <nav className="topnav-tabs">
            <div className="topnav-brand"><Isologo size={32} /><span className="topnav-brand-txt">Preguntas frecuentes</span></div>
            {tabs.map((t) => <button key={t.id} className={'tnav' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}><span className="tnav-ico" aria-hidden="true">{IC[t.id === 'solicitudes' ? 'solicitudes' : t.id === 'auditoria' ? 'historial' : t.id]}</span>{t.l}</button>)}
            <div className="navtools">
              <button className={'iconbtn' + (tab === 'herramientas' ? ' on' : '')} title="Herramientas: accesos rápidos y recursos del instituto" aria-label="Herramientas" data-accion="nav-herramientas" onClick={() => setTab('herramientas')}>🔧</button>
              <span className="navtema"><ThemeSelector /></span>
            </div>
          </nav>
          <div className="topnav-right">
            {puedeVerComoOtro(usuarioReal) && (verComo
              ? <div data-tour="ver-como" className="vercomo-chip">👁 {verComo.nombre}<button onClick={() => setVerComo(null)} title="Salir del modo vista" aria-label="Salir del modo vista">✕</button></div>
              : (
                <div data-tour="ver-como">
                  <SelectDropdown
                    className="fdrop-vercomo" placeholder="👁 Ver como" value="" hidePlaceholderOption searchable
                    onOpen={cargarPersonas}
                    onChange={(email) => { const p = personas.find((x) => x.email === email); if (p) setVerComo(p); }}
                    options={personas.map((p) => ({ value: p.email, label: `${p.nombre} · ${nombreVisibleRoles(p.roles)}` }))}
                  />
                </div>
              ))}
            <div className="topnav-user"><b>{usuario.nombre}</b><RolesChips roles={usuario.roles} chico /></div>
            <button className="btn-sm" onClick={() => window.dispatchEvent(new Event('ilce:cambiar-password'))}>Cambiar contraseña</button>
            <button className="btn-sm" onClick={() => { logout(); window.location.href = '/panel/login'; }}>Salir</button>
          </div>
        </div>
      </header>
      {verComo && <div className="vercomo-banner" role="status">👁 Modo vista: estás viendo el panel como <b>{verComo.nombre}</b> ({nombreVisibleRoles(verComo.roles)}), solo para mirar: los cambios no se guardan. <button onClick={() => setVerComo(null)}>Salir del modo vista</button></div>}
      <div className="main">
        <div className="topbar"><div><p className="section-lead">{DESC[tab] || ''}</p></div></div>
        {tab === 'herramientas' && <Herramientas />}
        {tab === 'reportes' && tabs.some((t) => t.id === 'reportes') && <ReportesFaq usuario={usuario} onCrearPregunta={crearDesde} />}
        {tab === 'solicitudes' && tabs.some((t) => t.id === 'solicitudes') && <SolicitudesAdmin usuario={usuario} onCrearPregunta={crearDesde} />}
        {tab === 'preguntas' && tabs.some((t) => t.id === 'preguntas') && <PreguntasAdmin usuario={usuario} prefill={prefill} onPrefillUsado={prefillUsado} />}
        {tab === 'accesos' && tabs.some((t) => t.id === 'accesos') && <Accesos usuario={usuario} onVerHistorial={verHistorialDe} />}
        {tab === 'auditoria' && tabs.some((t) => t.id === 'auditoria') && <Auditoria usuario={usuario} personaInicial={histPersona} />}
      </div>
      <VersionBadge />
    </div>
  );
}
