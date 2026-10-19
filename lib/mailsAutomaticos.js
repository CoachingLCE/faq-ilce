// Mails automáticos de Preguntas frecuentes. UN SOLO lugar: lo usan los envíos reales (lib/mailer.js) y el cuadro "Mails automáticos" de la pestaña Accesos,
// así lo que se ve en pantalla es exactamente lo que se manda. Para cambiar quién recibe un mail, se cambia acá.
export const REMITENTE_NOMBRE = 'Preguntas frecuentes ILCE';

export const AVISO_VIDEOLLAMADA = {
  para: { nombre: 'Departamento de estudiantes', email: 'estudiantes@institutoilce.com' },
  cc: [{ nombre: 'Sofía Salgueiro', email: 'sofia.salgueiro@institutoilce.com' }]
};

export const RESUMEN_SEMANAL_PARA = [
  { nombre: 'Jennifer Rebasti', email: 'jennifer.rebasti@institutoilce.com' },
  { nombre: 'Sofía Salgueiro', email: 'sofia.salgueiro@institutoilce.com' },
  { nombre: 'Macarena Zoe Juncos Abello', email: 'Macarena.Juncos@institutoilce.com' }
];

export const formatoDireccion = (p) => `${p.nombre} <${p.email}>`;

export const MAILS_AUTOMATICOS = [
  {
    tipo: 'Pedido de videollamada',
    cuando: 'Cuando alguien envía el formulario "Pedí una videollamada" (en la página de estudiantes o en la de interesados).',
    para: formatoDireccion(AVISO_VIDEOLLAMADA.para),
    cc: AVISO_VIDEOLLAMADA.cc.map(formatoDireccion).join(', '),
    remitente: REMITENTE_NOMBRE,
    asunto: 'Pedido de videollamada · [nombre] ([curso])',
    contenido: 'Nombre, email, WhatsApp, curso y edición, país y zona horaria, qué necesita y los días y horarios en que puede. Al tocar "Responder", el mail va directo a la persona.'
  },
  {
    tipo: 'Resumen semanal',
    cuando: 'Todos los viernes a las 8 h (hora de Argentina).',
    para: RESUMEN_SEMANAL_PARA.map(formatoDireccion).join(', '),
    cc: '',
    remitente: REMITENTE_NOMBRE,
    asunto: 'Resumen semanal de preguntas frecuentes · [fecha]',
    contenido: 'Lo de los últimos 7 días comparado con la semana anterior: visitas, consultas, consultas sin resultado y videollamadas; lo que se buscó y no se encontró, lo más buscado, las preguntas más abiertas y las respuestas que no ayudaron.'
  }
];
