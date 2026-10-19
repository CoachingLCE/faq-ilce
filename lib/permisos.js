// Permisos puros (reciben { roles: [...] }). Sin dependencias de servidor, para usar tanto en componentes cliente como en API routes. Roles combinables.
// Definidos por Diego (17/10/2026):
//   Admin y Coordinación académica: hacen todo con las preguntas y las solicitudes.
//   Coordinador de inscripciones, Inscripciones y Académico: solo ven (Académico, además, no exporta).
//   Accesos (usuarios), importación desde fichas e Historial: solo Admin.
function tiene(usuario, lista) {
  return !!usuario && (usuario.roles || []).some((r) => lista.includes(r));
}
const TODO = ['Admin', 'CoordinadorEstudiantes'];
const VER = ['Admin', 'Coordinador', 'Inscripciones', 'CoordinadorEstudiantes', 'Academico', 'Estudiantes'];

// Ver el listado de preguntas frecuentes: cualquier persona con algún rol.
export function tienePermisoVerPreguntas(usuario) { return !!usuario && (usuario.roles || []).length > 0; }
// Crear, editar, ordenar, ocultar y eliminar preguntas.
export function tienePermisoPreguntas(usuario) { return tiene(usuario, TODO); }
// Ver las solicitudes de videollamada / gestionarlas (estado, responsable, link de Zoom, notas).
export function tienePermisoVerSolicitudes(usuario) { return tiene(usuario, VER); }
export function tienePermisoSolicitudes(usuario) { return tiene(usuario, TODO); }
// Ver los reportes (qué se busca, qué no se encuentra, dónde se hace clic).
export function tienePermisoReportes(usuario) { return tiene(usuario, VER); }
// Exportar (CSV de reportes y solicitudes).
export function tienePermisoExportar(usuario) { return tiene(usuario, TODO); }
// Administrar usuarios (alta, roles, contraseñas) e importarlos desde la app de fichas: solo Admin.
export function tienePermisoAccesos(usuario) { return tiene(usuario, ['Admin']); }
export function tienePermisoImportarUsuarios(usuario) { return tiene(usuario, ['Admin']); }
// Historial de acciones: solo Admin.
export function tienePermisoAuditoria(usuario) { return tiene(usuario, ['Admin']); }

// "Ver como": solo el Admin puede ver el panel con los permisos de otra persona (igual que en las otras apps).
export function puedeVerComoOtro(usuario) { return tiene(usuario, ['Admin']); }
