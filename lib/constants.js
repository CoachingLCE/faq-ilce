// URL pública de la app (para links, QR, etc.). Ajustar al dominio real al publicarla.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://faq-ilce.vercel.app';

// Nombres exactos de las pestañas de la Google Sheet de ESTA app (se crean solas con /api/setup).
export const TABS = {
  USUARIOS: 'Usuarios',
  HISTORIAL: 'Historial',
  PREGUNTAS: 'Preguntas',
  VISITANTES: 'Visitantes',
  EVENTOS: 'Eventos',
  SOLICITUDES: 'Solicitudes'
};

// Pestañas de la planilla de la app de FICHAS (solo se leen).
export const TABS_FICHAS = { USUARIOS: 'Usuarios', FICHAS: 'Fichas' };

export const HEADERS = {
  [TABS.USUARIOS]: ['Email', 'Nombre', 'Roles', 'PasswordHash', 'Activo'],
  [TABS.HISTORIAL]: ['Fecha', 'Inscripción ID', 'Usuario', 'Acción', 'Detalle'],
  // Las preguntas frecuentes. "Público": estudiantes | interesados | ambos. "Respuesta" usa un formato simple (ver lib/faqTexto.js).
  [TABS.PREGUNTAS]: ['ID', 'Orden', 'Público', 'Categoría', 'Pregunta', 'Respuesta', 'Video', 'Palabras clave', 'Destacada', 'Activa', 'Actualizado', 'Creado'],
  // Una fila por visita identificada (la persona completa nombre, email, curso y edición antes de buscar).
  [TABS.VISITANTES]: ['Sesión', 'Fecha', 'Público', 'Nombre', 'Email', 'Curso', 'Edición', 'WhatsApp', 'Dispositivo'],
  // Una fila por acción: búsqueda, apertura de pregunta, clic en enlace o botón, utilidad (sí/no), solicitud.
  [TABS.EVENTOS]: ['Fecha', 'Sesión', 'Público', 'Tipo', 'Término', 'Resultados', 'Pregunta ID', 'Destino', 'Email', 'Nombre', 'Curso', 'Edición'],
  [TABS.SOLICITUDES]: ['ID', 'Fecha', 'Público', 'Nombre', 'Email', 'WhatsApp', 'Curso', 'Edición', 'País', 'Zona horaria', 'Consulta', 'Disponibilidad JSON', 'Estado', 'Responsable', 'Link Zoom', 'Fecha agendada', 'Notas', 'Actualizado']
};

export const PUBLICOS = [
  { id: 'estudiantes', nombre: 'Estudiantes' },
  { id: 'interesados', nombre: 'Interesados (todavía no son estudiantes)' },
  { id: 'ambos', nombre: 'Ambos' }
];

// Categorías de las preguntas de estudiantes (mismas que la página actual).
export const CATEGORIAS = [
  { id: 'plat', nombre: 'Plataforma' },
  { id: 'ops', nombre: 'Cursada' },
  { id: 'zoom', nombre: 'Zoom y clases en vivo' },
  { id: 'cert', nombre: 'Certificación' },
  { id: 'pago', nombre: 'Pagos' },
  { id: 'com', nombre: 'Comunidad' },
  { id: 'gen', nombre: 'General' }
];
export const nombreCategoria = (id) => (CATEGORIAS.find((c) => c.id === id) || { nombre: id || '' }).nombre;

export const ESTADOS_SOLICITUD = ['Nueva', 'Contactada', 'Agendada', 'Resuelta', 'Descartada'];

export const TIPOS_EVENTO = ['busqueda', 'abrir_pregunta', 'clic', 'util_si', 'util_no', 'filtro', 'detalle_busqueda'];

// Cursos por defecto (si no se puede leer la planilla de fichas, la app igual funciona con estos).
export const CURSOS = [
  'Coaching Ontológico', 'Coaching Educativo', 'Coaching de Equipos', 'Coaching Deportivo', 'Coaching Vocacional',
  'Coaching Inmobiliario', 'Oratoria', 'Liderazgo', 'Copywriting para redes sociales', 'Formación para Formadores', 'Comunidad ILCE'
];

// Contacto institucional (se muestra en las páginas públicas).
export const CONTACTO = {
  whatsapp: '5491163245246',
  estudiantes: 'estudiantes@institutoilce.com',
  inscripciones: 'inscripciones@institutoilce.com',
  administracion: 'administracion@institutoilce.com',
  info: 'info@institutoilce.com',
  campus: 'https://campus.institutoilce.com/',
  agenda: 'https://www.coachingeducativolider.com/live',
  blog: 'https://www.coachingeducativolider.com/blog',
  cursos: 'https://www.coachingeducativolider.com/cursos-y-productos'
};

// Banner de promoción (arriba de las dos páginas públicas). Se apaga con activa:false.
// Cuenta regresiva: "cierre" = fecha fija ISO (ej. '2026-11-30T23:59:00-03:00'); si está vacío y "horas" > 0, cada visitante
// tiene esas horas desde su primera visita (se guarda en su navegador, clave ilce_promo_v7_end). Al llegar a cero muestra "Promo finalizada".
// "cursos": lista fija de nombres que rotan; si queda vacía rotan los cursos de la planilla de fichas (sin los de "excluir").
export const PROMO = {
  activa: true,
  etiqueta: 'Promo',
  descuento: 'Descuento especial por tiempo limitado',
  titulo: 'La mejor inversión de tu carrera en',
  cursos: [],
  horas: 48,
  cierre: '',
  boton: 'Aprovechá la oportunidad',
  mensajeWa: 'Hola! Vi la promo de ILCE y quiero aprovechar los descuentos de 20 horas.',
  excluir: ['Comunidad ILCE']
};

// ---- Roles (los mismos de la app de fichas, así los usuarios importados conservan su rol) ----
export const ROLES = ['Admin', 'Coordinador', 'Inscripciones', 'Estudiantes', 'CoordinadorEstudiantes', 'Academico', 'Docente'];
export const PASSWORD_GENERICA = 'Hola123';

const NOMBRE_ROL = {
  Admin: 'Admin', Coordinador: 'Coordinador de inscripciones', Inscripciones: 'Inscripciones',
  Estudiantes: 'Estudiantes', CoordinadorEstudiantes: 'Coordinación académica', Academico: 'Académico', Docente: 'Docente'
};
export function nombreVisibleRoles(rolesArr) {
  if (!rolesArr || !rolesArr.length) return 'Sin rol';
  return rolesArr.map((r) => NOMBRE_ROL[r] || r).join(' + ');
}
