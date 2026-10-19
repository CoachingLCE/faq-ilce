'use client';
// Panel interno de Preguntas frecuentes: Preguntas · Solicitudes de videollamada · Reportes · Accesos · Historial.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../lib/useSession';
import { tienePermisoVerPreguntas, tienePermisoVerSolicitudes, tienePermisoReportes, tienePermisoAccesos, tienePermisoAuditoria } from '../lib/permisos';
import { Isologo } from './Isologo';
import ThemeSelector from './ThemeSelector';
import VersionBadge from './VersionBadge';
import { RolesChips } from './RolChip';
import PreguntasAdmin from './PreguntasAdmin';
import SolicitudesAdmin from './SolicitudesAdmin';
import ReportesFaq from './ReportesFaq';
import Accesos from './Accesos';
import Auditoria from './Auditoria';

const IC = { preguntas: '', solicitudes: '', reportes: '', accesos: '', historial: '' };
const DESC = {
  reportes: 'Qué busca la gente, qué busca y no encuentra, qué preguntas abre y dónde hace clic.',
  solicitudes: 'Personas que no encontraron su respuesta y pidieron una videollamada por Zoom, con sus días y horarios.',
  preguntas: 'Las preguntas y respuestas que se ven en las páginas públicas de estudiantes e interesados.',
  accesos: 'Quién entra a este panel, con qué rol y qué puede hacer cada rol. Acá también se importan usuarios desde fichas.',
  auditoria: 'Quién hizo qué y cuándo en este panel, mes a mes.'
};

export default function Panel() {
  const { usuario, cargando, logout } = useSession();
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
    if (!cargando && !usuario) window.location.replace('/panel/login');
  }, [cargando, usuario]);

  // Menú lateral fijo en escritorio (igual que en las otras apps de ILCE): deja lugar a la izquierda mientras el panel está abierto.
  useEffect(() => {
    document.body.classList.add('con-menu-lateral');
    return () => document.body.classList.remove('con-menu-lateral');
  }, []);

  useEffect(() => {
    if (!tabs.length) return;
    const h = (typeof window !== 'undefined' && window.location.hash.replace('#', '')) || '';
    setTab((t) => (t && tabs.some((x) => x.id === t) ? t : (tabs.some((x) => x.id === h) ? h : tabs[0].id)));
  }, [tabs]);
  useEffect(() => { if (tab) { try { window.history.replaceState(null, '', '#' + tab); } catch { /* */ } } }, [tab]);

  const verHistorialDe = useCallback((email) => { setHistPersona({ email: String(email || ''), n: Date.now() }); setTab('auditoria'); }, []);
  const crearDesde = useCallback((texto) => { setPrefill({ pregunta: String(texto || ''), n: Date.now() }); setTab('preguntas'); }, []);
  const prefillUsado = useCallback(() => setPrefill(null), []);

  if (cargando) return <div className="spin" />;
  if (!usuario) return null;

  return (
    <div className="appwrap">
      <header className="topnav">
        <div className="topnav-inner">
          <nav className="topnav-tabs">
            <div className="topnav-brand"><Isologo size={32} /><span className="topnav-brand-txt">Preguntas frecuentes</span></div>
            {tabs.map((t) => <button key={t.id} className={'tnav' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}><span className="tnav-ico" aria-hidden="true">{IC[t.id === 'solicitudes' ? 'solicitudes' : t.id === 'auditoria' ? 'historial' : t.id]}</span>{t.l}</button>)}
            <div className="navtools"><ThemeSelector /></div>
          </nav>
          <div className="topnav-right">
            <div className="topnav-user"><b>{usuario.nombre}</b><RolesChips roles={usuario.roles} chico /></div>
            <button className="btn-sm" onClick={() => window.dispatchEvent(new Event('ilce:cambiar-password'))}>Cambiar contraseña</button>
            <button className="btn-sm" onClick={() => { logout(); window.location.href = '/panel/login'; }}>Salir</button>
          </div>
        </div>
      </header>
      <div className="main">
        <div className="topbar"><div><p className="section-lead">{DESC[tab] || ''}</p></div></div>
        {tab === 'reportes' && <ReportesFaq usuario={usuario} onCrearPregunta={crearDesde} />}
        {tab === 'solicitudes' && <SolicitudesAdmin usuario={usuario} onCrearPregunta={crearDesde} />}
        {tab === 'preguntas' && <PreguntasAdmin usuario={usuario} prefill={prefill} onPrefillUsado={prefillUsado} />}
        {tab === 'accesos' && <Accesos usuario={usuario} onVerHistorial={verHistorialDe} />}
        {tab === 'auditoria' && <Auditoria usuario={usuario} personaInicial={histPersona} />}
      </div>
      <VersionBadge />
    </div>
  );
}
