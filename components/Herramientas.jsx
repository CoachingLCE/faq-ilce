'use client';
// Accesos del equipo: aplicaciones, accesos rápidos y recursos. Es la MISMA lista que en las demás apps de ILCE (si se agrega o cambia un enlace hay que hacerlo en todas).
// Carga de clases (para docentes) no lleva esta pantalla.
const APLICACIONES = [
  { icono: '📊', color: '#8b5cf6', nombre: 'Gestión', desc: 'Leads, seguimiento, estudiantes y reportes', url: 'https://seguimiento-lead-estudiante.vercel.app/' },
  { icono: '📝', color: '#0595ad', nombre: 'Fichas', desc: 'Fichas de inscripción, actividades y formularios', url: 'https://fichas-ilce.vercel.app/' },
  { icono: '📅', color: '#1a73e8', nombre: 'Cronograma', desc: 'Clases, salas de Zoom y docentes', url: 'https://disponibilidad-zoom.vercel.app/' },
  { icono: '✅', color: '#0f9d58', nombre: 'Presentismo', desc: 'Asistencia de estudiantes por edición', url: 'https://listadopresentismo.vercel.app/' },
  { icono: '🗂️', color: '#ec4899', nombre: 'Tuesday', desc: 'Tablero de contenidos del equipo', url: 'https://tuesday-ilce.vercel.app/' },
  { icono: '📤', color: '#f59e0b', nombre: 'Carga de clases', desc: 'Donde los docentes cargan sus clases', url: 'https://carga-clases-ilce.vercel.app/' },
  { icono: '💲', color: '#22c55e', nombre: 'Valores de los cursos', desc: 'Productos, descuentos y links de pago', url: 'https://seguimiento-lead-estudiante.vercel.app/productos-valores' },
  { icono: '💬', color: '#22d3ee', nombre: 'Feedback', desc: 'Feedback de estudiantes y su panel', url: 'https://ilce-feedback.vercel.app/admin' },
  { icono: '📋', color: '#8b5cf6', nombre: 'Encuestas', desc: '', url: 'https://encuestas-ilce.vercel.app/' },
  { icono: '☑️', color: '#14b8a6', nombre: 'Todo-Tareas', desc: 'Tareas con respaldo en la nube', url: 'https://todo-tareas-ilce.vercel.app/' },
  { icono: '✍️', color: '#a855f7', nombre: 'Firma de contratos', desc: 'Firma digital de contratos docentes', url: 'https://ilce-firma-contratos.vercel.app/' },
  { icono: '❓', color: '#f59e0b', nombre: 'Preguntas frecuentes', desc: 'Páginas públicas de ayuda y su panel', url: 'https://preguntasfrecuentes-kappa.vercel.app/panel' }
];

const ACCESOS_RAPIDOS = [
  { icono: '', color: '#611f69', nombre: 'Slack', url: 'https://app.slack.com/client/T065ZV5C7FF' },
  { icono: '', color: '#ea4335', nombre: 'Gmail', url: 'https://gmail.com/' },
  { icono: '', color: '#1a73e8', nombre: 'Google Calendar', url: 'https://calendar.google.com/' },
  { icono: '', color: '#0f9d58', nombre: 'Google Drive', url: 'https://drive.google.com/' },
  { icono: '', color: '#0f9d58', nombre: 'Google Sheets', url: 'https://sheets.google.com/' },
  { icono: '', color: '#2d8cff', nombre: 'Zoom', url: 'https://www.zoom.com/' },
  { icono: '🗄️', color: '#a855f7', nombre: 'Baúl IN HOUSE', url: 'https://www.coachingeducativolider.com/ba%C3%BAl-inhouse' }
];

const RECURSOS = [
  { icono: '', nombre: 'Web ILCE', url: 'https://www.coachingeducativolider.com/' },
  { icono: '', nombre: 'Cursos y formaciones', url: 'https://www.coachingeducativolider.com/cursosyformaciones' },
  { icono: '🎓', nombre: 'Volver al campus', url: 'https://campus.institutoilce.com/' },
  { icono: '⚙️', nombre: 'Admin Campus', url: 'https://campus.institutoilce.com/wp-admin/' },
  { icono: '❓', nombre: 'Preguntas frecuentes estudiantes', url: 'https://www.coachingeducativolider.com/preguntas-frecuentes-estudiantes' },
  { icono: '📘', nombre: 'Manual académico', url: 'https://www.coachingeducativolider.com/manualacad%C3%A9mico' },
  { icono: '📗', nombre: 'Manual inscripciones', url: 'https://www.coachingeducativolider.com/manual-inscripciones' },
  { icono: '✅', nombre: 'Evaluación Coaching Deportivo', url: 'https://www.coachingeducativolider.com/evaluaci%C3%B3nfinal-coachingdeportivo' }
];

function Tarjeta({ h }) {
  // "Estás acá": en la tarjeta de esta misma app (se compara la dirección con la de la pantalla).
  let actual = false;
  try { actual = typeof window !== 'undefined' && new URL(h.url).host === window.location.host && new URL(h.url).pathname.startsWith('/panel'); } catch { /* dirección inválida */ }
  return (
    <a href={h.url} target="_blank" rel="noopener noreferrer" className="hrr-card" data-tarjeta={h.nombre}>
      <span className="hrr-ico" style={{ background: `${h.color || '#0595ad'}22` }} aria-hidden="true">{h.icono}</span>
      <span style={{ minWidth: 0 }}>
        <span className="hrr-nom">{h.nombre}{actual && <span className="hrr-actual" data-actual>Estás acá</span>}</span>
        {h.desc ? <span className="hrr-desc">{h.desc}</span> : null}
      </span>
    </a>
  );
}

export default function Herramientas() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <h3 className="hrr-h">Aplicaciones de ILCE</h3>
      <p className="hrr-sub">Todas las web apps del instituto. Se abren en una pestaña nueva.</p>
      <div className="hrr-grid" data-seccion="aplicaciones">{APLICACIONES.map((h) => <Tarjeta key={h.nombre} h={h} />)}</div>
      <h3 className="hrr-h">Accesos rápidos</h3>
      <p className="hrr-sub">Herramientas de uso diario. Se abren en una pestaña nueva.</p>
      <div className="hrr-grid" data-seccion="accesos">{ACCESOS_RAPIDOS.map((h) => <Tarjeta key={h.nombre} h={h} />)}</div>
      <h3 className="hrr-h">Recursos de ILCE</h3>
      <p className="hrr-sub">Accesos a la web y a los materiales de referencia.</p>
      <div className="hrr-grid" data-seccion="recursos">{RECURSOS.map((r) => <Tarjeta key={r.nombre} h={{ ...r, color: '#0595ad' }} />)}</div>
    </div>
  );
}
