// Novedades de la app (se muestran en el botón de versión). Más reciente arriba.
export const CHANGELOG = [
  {
    version: '1.2.0',
    fecha: '2026-10-19',
    cambios: [
      'Ver como: el Admin puede ver el panel con los permisos de otra persona (menú "Ver como", igual que en Fichas, Gestión, Cronograma y Presentismo). Es solo para mirar: el servidor no deja guardar, crear ni borrar nada en nombre de otra persona.',
      'Herramientas: nueva pantalla (botón con la llave inglesa) con las apps de ILCE, los accesos rápidos y los recursos del instituto, la misma lista que en las otras apps.',
      'El selector de modo claro/oscuro/automático y Herramientas pasan arriba a la derecha en escritorio (antes quedaban dentro del menú lateral); en celular el selector queda fijo en el borde derecho de la barra de pestañas, así siempre se ve. Cada solapa tiene su propio título en la pestaña del navegador.'
    ]
  },
  {
    version: '1.1.0',
    fecha: '2026-10-19',
    cambios: [
      'Pedí una videollamada: ahora cada pedido manda un mail a Departamento de estudiantes <estudiantes@institutoilce.com> con copia a Sofía Salgueiro, con los datos de la persona, lo que necesita y los días y horarios en que puede. Al tocar "Responder", el mail va directo a la persona. Antes el pedido solo se guardaba y no llegaba ningún aviso.',
      'Promo: el mensaje de WhatsApp ahora dice las horas que realmente le quedan a la persona en la cuenta regresiva (antes decía siempre "20 horas"). Si ya terminó, el mensaje lo refleja.',
      'Accesos: nueva sección "Mails automáticos" (qué mails se mandan, a quién, con copia a quién y con qué asunto) y un registro de envíos con el estado de cada uno (enviado o falló y por qué), como en Fichas.',
      'Resumen semanal por mail (viernes a las 8 h) para Jennifer Rebasti, Sofía Salgueiro y Macarena Juncos: visitas, consultas, consultas sin resultado y videollamadas contra la semana anterior; lo que se buscó y no se encontró, lo más buscado, las preguntas más abiertas y las respuestas que no ayudaron.'
    ]
  },
  {
    version: '1.0.5',
    fecha: '2026-10-17',
    cambios: [
      'Pantalla de roles (Accesos): ahora aclara de dónde sale la información (las personas y sus roles se importan de la app de Fichas) y que los permisos de cada rol en esta app se definen acá. Cada rol muestra qué pantallas ve en esta app, y "Comparar roles" suma ese cuadro.',
      'Historial de acciones: nueva vista "Qué hizo cada persona" (acciones, ingresos, lo que creó, editó y eliminó, y su última actividad) y el detalle completo de cada una. En Accesos, el botón "Qué hizo" lleva directo al detalle de esa persona.'
    ]
  },
  {
    version: '1.0.4',
    fecha: '2026-10-17',
    cambios: [
      'Reportes más claros: resumen de lo que se está viendo (período, público, curso) con hora de actualización y botón "Actualizar"; seis indicadores principales y una franja aparte con los clics (total, promo, blog) y quiénes contaron qué buscaban.',
      'Reportes: en "Dónde hicieron clic" ahora se ven siempre las columnas de clics y personas (el destino largo se recorta). El gráfico mensual muestra el total de cada mes y los ejes usan números redondos.',
      'Infografías: al tocar una imagen en una respuesta se abre en grande dentro de la misma página, con título, botón para cerrar (o tecla Esc) y opción de abrirla en otra pestaña. Cada apertura queda en "Dónde hicieron clic".',
      'Lectura en celular, tablet y notebook: indicadores compactos en el celular, botones más cómodos al tacto, foco visible al navegar con teclado y menos movimiento para quienes lo tienen desactivado en su equipo.'
    ]
  },
  {
    version: '1.0.3',
    fecha: '2026-10-17',
    cambios: [
      'Las respuestas pueden llevar una infografía o captura dentro del texto: ![descripción](https://…/imagen.png). Se ve en la respuesta y se puede tocar para verla grande. Además de eso, cada pregunta puede tener su video.',
      'Nuevo tema "Zoom y clases en vivo" con cinco preguntas generales (audio, cámara, entrar a la clase, cambiar el nombre, chat y levantar la mano), listas para sumarles video e infografía.'
    ]
  },
  {
    version: '1.0.2',
    fecha: '2026-10-17',
    cambios: [
      'Banner de promoción arriba de las dos páginas (insignia "Promo", descuento por tiempo limitado, cursos que rotan, cuenta regresiva de 48 horas por visitante, botón de WhatsApp y estado "Promo finalizada"). Los clics en el botón quedan en el reporte "Dónde hicieron clic".',
      'Quien todavía no es estudiante puede indicarlo en la ventana de datos o con el botón "No soy estudiante" / "Ya soy estudiante": pasa a la otra página sin volver a cargar sus datos.',
      'La página de interesados ahora comparte información general: formas de contacto, formaciones, agenda de clases abiertas y eventos. Las preguntas de interesados también aparecen, marcadas como "Info general", cuando un estudiante busca algo que no está en sus preguntas.',
      'Reportes: nuevos indicadores con los clics en la promo (y cuántos fueron desde estudiantes e interesados) y los clics en el blog.',
      'Nueva tarjeta "Leé las notas del blog" en las dos páginas, que lleva a coachingeducativolider.com/blog.',
      'Cuando una búsqueda no tiene resultado, la persona puede contar con sus palabras qué estaba buscando (además de pedir la videollamada). Lo que escribe queda en Reportes → "Lo que querían encontrar", con quién es, su curso y qué buscó, y se puede exportar.',
      'El banner se configura en lib/constants.js (PROMO): textos, horas de la cuenta regresiva o fecha fija de cierre, cursos y mensaje de WhatsApp.'
    ]
  },
  {
    version: '1.0.1',
    fecha: '2026-10-17',
    cambios: [
      'Reportes: nueva sección "Consultas por mes" (últimos 12 meses, con gráfico, variación contra el mes anterior y cuántas no tuvieron respuesta).',
      'Chips con lo importante del período (consultas sin resultado, temas por responder, videollamadas sin atender, "no me ayudó", preguntas sin abrir) y filtros por chips en Reportes, Preguntas y Videollamadas.',
      'Períodos nuevos: este mes y mes pasado. Se habla de "consultas" en lugar de "búsquedas".'
    ]
  },
  {
    version: '1.0.0',
    fecha: '2026-10-17',
    cambios: [
      'Primera versión de la app de Preguntas frecuentes de ILCE: una página para estudiantes y otra para personas que todavía no lo son.',
      'Antes de buscar, la persona indica nombre, email, curso y edición (los interesados, nombre, email y curso de interés).',
      'Cada búsqueda, apertura de pregunta, clic y respuesta de "¿Te ayudó?" queda registrada para los Reportes: lo más buscado, lo buscado y no encontrado, y dónde se hace clic.',
      'Si no encuentra su respuesta, la persona puede pedir una videollamada por Zoom dejando sus horarios y disponibilidad; el equipo las gestiona en "Videollamadas".',
      'Panel para crear y editar preguntas (con video, orden y público), Accesos con importación de usuarios desde la planilla de fichas, e Historial de acciones.'
    ]
  }
];
