// Información visual de los roles (Accesos). Las funciones permitidas NO están escritas a mano: se calculan llamando a las mismas funciones de lib/permisos.js que usa el
// resto de la app (y el servidor), así que esta pantalla no puede mostrar algo distinto de lo que el sistema permite de verdad.
import {
  tienePermisoVerPreguntas, tienePermisoPreguntas, tienePermisoVerSolicitudes, tienePermisoSolicitudes, tienePermisoReportes, tienePermisoExportar,
  tienePermisoAccesos, tienePermisoImportarUsuarios, tienePermisoAuditoria
} from './permisos';
import { ROLES } from './constants';

export const TIPOS_CAP = [
  { t: 'c', l: 'Consulta' },
  { t: 'g', l: 'Gestión' },
  { t: 'a', l: 'Administración' }
];

export const CAPACIDADES = [
  { k: 'ver', l: 'Ver las preguntas frecuentes', t: 'c', fn: tienePermisoVerPreguntas },
  { k: 'versol', l: 'Ver las solicitudes de videollamada', t: 'c', fn: tienePermisoVerSolicitudes },
  { k: 'rep', l: 'Ver Reportes (búsquedas y clics)', t: 'c', fn: tienePermisoReportes, clave: true },
  { k: 'preg', l: 'Crear, editar y ordenar preguntas', t: 'g', fn: tienePermisoPreguntas, clave: true },
  { k: 'sol', l: 'Gestionar solicitudes (estado, Zoom, notas)', t: 'g', fn: tienePermisoSolicitudes, clave: true },
  { k: 'export', l: 'Exportar reportes y solicitudes', t: 'g', fn: tienePermisoExportar, clave: true },
  { k: 'accesos', l: 'Gestionar accesos', t: 'a', fn: tienePermisoAccesos, clave: true },
  { k: 'import', l: 'Importar usuarios desde la app de fichas', t: 'a', fn: tienePermisoImportarUsuarios },
  { k: 'hist', l: 'Ver el Historial de acciones', t: 'a', fn: tienePermisoAuditoria }
];

// Pantallas del panel de esta app y quién las ve (también calculado con lib/permisos.js).
export const PANTALLAS = [
  { k: 'rep', l: 'Reportes', fn: tienePermisoReportes },
  { k: 'vid', l: 'Videollamadas', fn: tienePermisoVerSolicitudes },
  { k: 'preg', l: 'Preguntas', fn: tienePermisoVerPreguntas },
  { k: 'acc', l: 'Accesos', fn: tienePermisoAccesos },
  { k: 'hist', l: 'Historial de acciones', fn: tienePermisoAuditoria }
];
export const pantallasDe = (roles) => PANTALLAS.map((p) => ({ ...p, ok: !!(roles && roles.length) && !!p.fn({ roles }) }));

export function capacidadesDe(roles) {
  const usuario = { roles: roles || [] };
  return CAPACIDADES.map((c) => ({ ...c, ok: !!(roles && roles.length) && !!c.fn(usuario) }));
}

export const GRUPOS_ROLES = [
  { id: 'admin', titulo: 'Administración', roles: ['Admin'] },
  { id: 'operativa', titulo: 'Gestión operativa', roles: ['Coordinador', 'Inscripciones'] },
  { id: 'academica', titulo: 'Gestión académica', roles: ['CoordinadorEstudiantes', 'Academico'] },
  { id: 'consulta', titulo: 'Consulta', roles: ['Estudiantes', 'Docente'] }
];

export const INFO_ROL = {
  Admin: { nombre: 'Admin', corta: 'Hace todo.', desc: 'Usa todas las funciones: preguntas, solicitudes, reportes, accesos, importación de usuarios e Historial.' },
  Coordinador: { nombre: 'Coordinador de inscripciones', corta: 'Solo ve, no edita.', desc: 'Ve las preguntas, las solicitudes y los Reportes. No puede editar ni gestionar nada, ni exportar.' },
  Inscripciones: { nombre: 'Inscripciones', corta: 'Solo ve.', desc: 'Ve las preguntas, las solicitudes y los Reportes. No puede editar ni gestionar nada, ni exportar.' },
  CoordinadorEstudiantes: { nombre: 'Coordinación académica', corta: 'Hace todo (menos accesos).', desc: 'Edita las preguntas, gestiona las solicitudes de videollamada, ve los Reportes y exporta. No administra accesos ni ve el Historial.' },
  Academico: { nombre: 'Académico', corta: 'Ve todo, no exporta.', desc: 'Ve las preguntas, las solicitudes y los Reportes. No edita, no gestiona y no exporta.' },
  Estudiantes: { nombre: 'Estudiantes', corta: 'Solo ve.', desc: 'Ve las preguntas, las solicitudes y los Reportes. No puede editar ni exportar.' },
  Docente: { nombre: 'Docente', corta: 'Solo ve las preguntas.', desc: 'Ve las preguntas frecuentes. No ve solicitudes ni reportes y no edita nada.' }
};

export const nombreRol = (r) => (INFO_ROL[r] && INFO_ROL[r].nombre) || r;
export { ROLES };
