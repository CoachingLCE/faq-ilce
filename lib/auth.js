import { readSheet } from './sheets';
import { TABS } from './constants';
import { verificarToken, sesionEstricta } from './sesionFirmada';

export {
  tienePermisoVerPreguntas, tienePermisoPreguntas, tienePermisoVerSolicitudes, tienePermisoSolicitudes, tienePermisoReportes, tienePermisoExportar,
  tienePermisoAccesos, tienePermisoImportarUsuarios, tienePermisoAuditoria
} from './permisos';

// Busca el usuario en la hoja "Usuarios" (Email, Nombre, Roles, PasswordHash, Activo).
export async function findUsuario(email) {
  const usuarios = await readSheet(TABS.USUARIOS);
  const match = usuarios.find((u) => (u.Email || '').trim().toLowerCase() === (email || '').trim().toLowerCase());
  if (!match) return null;
  return {
    email: match.Email,
    nombre: match.Nombre,
    roles: (match.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean),
    passwordHash: match.PasswordHash || '',
    activo: (match.Activo || '') !== 'FALSE' && (match.Activo || '').toLowerCase() !== 'no',
    _rowIndex: match._rowIndex
  };
}

const normEmail = (e) => String(e || '').trim().toLowerCase();
let ultimoAvisoSinToken = 0;

/**
 * Quién hace el pedido (mismo mecanismo que la app de fichas). Con token válido: el usuario es el del TOKEN. Un usuario desactivado deja de poder usar su token en el acto.
 * Un token con la marca "cp" (entró con una contraseña temporal) solo vale donde se pasa permitirTemporal: la ruta que cambia la contraseña.
 * Sin token: etapa de transición -> se acepta el email declarado; con SESION_ESTRICTA=1 -> null.
 */
export async function usuarioDeSolicitud(request, emailDeclarado, { permitirTemporal = false } = {}) {
  const cab = (request && request.headers && typeof request.headers.get === 'function' && request.headers.get('authorization')) || '';
  const m = /^Bearer\s+(\S+)\s*$/i.exec(cab);
  if (m) {
    const t = verificarToken(m[1]);
    if (!t) return null;
    if (t.cp && !permitirTemporal) return null;
    const real = await findUsuario(t.email);
    if (!real || real.activo === false) return null;
    const decl = normEmail(emailDeclarado);
    if (!decl || decl === normEmail(real.email)) return real;
    return null;
  }
  if (sesionEstricta()) return null;
  if (Date.now() - ultimoAvisoSinToken > 60 * 1000) { ultimoAvisoSinToken = Date.now(); console.warn('[sesion] pedido sin token aceptado por el email declarado (etapa de transición)'); }
  return findUsuario(emailDeclarado);
}
