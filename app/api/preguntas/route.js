import { NextResponse } from 'next/server';
import { usuarioDeSolicitud, tienePermisoVerPreguntas, tienePermisoPreguntas } from '../../../lib/auth';
import { appendRow, appendRows, updateRow, actualizarCeldas } from '../../../lib/sheets';
import { leerPreguntas, preguntaAFila, idNuevo } from '../../../lib/preguntas';
import { SEMILLA } from '../../../lib/semilla';
import { registrarAccion } from '../../../lib/auditoria';
import { TABS, CATEGORIAS } from '../../../lib/constants';
import { recortar } from '../../../lib/publico';
import { videoValido } from '../../../lib/faqTexto';

export const dynamic = 'force-dynamic';

function limpiar(b) {
  const p = {
    publico: ['estudiantes', 'interesados', 'ambos'].includes(b.publico) ? b.publico : 'estudiantes',
    categoria: CATEGORIAS.some((c) => c.id === b.categoria) ? b.categoria : 'gen',
    pregunta: recortar(b.pregunta, 250),
    respuesta: String(b.respuesta == null ? '' : b.respuesta).replace(/\r/g, '').trim().slice(0, 3000),
    video: recortar(b.video, 300),
    palabrasClave: recortar(b.palabrasClave, 300),
    destacada: !!b.destacada,
    activa: b.activa !== false
  };
  if (p.pregunta.length < 5) return { error: 'Escribí la pregunta (mínimo 5 letras).' };
  if (p.respuesta.length < 5) return { error: 'Escribí la respuesta.' };
  if (!videoValido(p.video)) return { error: 'El enlace del video tiene que empezar con http:// o https://' };
  return { p };
}

// GET /api/preguntas -> todas (activas y ocultas)
export async function GET(req) {
  const u = await usuarioDeSolicitud(req, new URL(req.url).searchParams.get('solicitanteEmail'));
  if (!u || !tienePermisoVerPreguntas(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const preguntas = await leerPreguntas({ noCache: true });
  return NextResponse.json({ ok: true, preguntas });
}

// POST { accion: 'crear' | 'semilla' | 'mover', ... }
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const u = await usuarioDeSolicitud(req, b.solicitanteEmail);
  if (!u || !tienePermisoPreguntas(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const todas = await leerPreguntas({ noCache: true });

  if (b.accion === 'semilla') {
    if (todas.length > 0) return NextResponse.json({ ok: false, error: 'Ya hay preguntas cargadas: no se vuelven a cargar las iniciales.' }, { status: 409 });
    const ahora = new Date().toISOString();
    const filas = SEMILLA.map((s, i) => preguntaAFila({ ...s, id: idNuevo(), orden: i + 1, activa: true, actualizado: ahora, creado: ahora }));
    await appendRows(TABS.PREGUNTAS, filas);
    await registrarAccion(b.solicitanteEmail, u.nombre, 'Cargó las preguntas frecuentes iniciales', `${filas.length} preguntas`);
    return NextResponse.json({ ok: true, cargadas: filas.length });
  }

  if (b.accion === 'mover') {
    const idx = todas.findIndex((x) => x.id === b.id);
    if (idx < 0) return NextResponse.json({ ok: false, error: 'No se encontró la pregunta' }, { status: 404 });
    const grupo = todas.filter((x) => x.publico === todas[idx].publico);
    const pos = grupo.findIndex((x) => x.id === b.id);
    const vecino = grupo[pos + (b.dir === 'arriba' ? -1 : 1)];
    if (!vecino) return NextResponse.json({ ok: true });
    // Si hay órdenes repetidos se renumera todo primero (así el intercambio siempre tiene efecto).
    const ords = todas.map((x) => x.orden);
    if (new Set(ords).size !== ords.length) {
      await actualizarCeldas(TABS.PREGUNTAS, todas.map((x, i) => ({ celda: 'B' + x._rowIndex, valor: i + 1 })));
      todas.forEach((x, i) => { x.orden = i + 1; });
    }
    const a = todas[idx], c = todas.find((x) => x.id === vecino.id);
    await actualizarCeldas(TABS.PREGUNTAS, [{ celda: 'B' + a._rowIndex, valor: c.orden }, { celda: 'B' + c._rowIndex, valor: a.orden }]);
    return NextResponse.json({ ok: true });
  }

  const v = limpiar(b);
  if (v.error) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  const ahora = new Date().toISOString();
  const maxOrden = todas.reduce((m, x) => Math.max(m, x.orden), 0);
  const nueva = { ...v.p, id: idNuevo(), orden: maxOrden + 1, actualizado: ahora, creado: ahora };
  await appendRow(TABS.PREGUNTAS, preguntaAFila(nueva));
  await registrarAccion(b.solicitanteEmail, u.nombre, 'Creó una pregunta frecuente', nueva.pregunta);
  return NextResponse.json({ ok: true, id: nueva.id });
}

// PATCH { id, ...campos } -> editar (también activa/oculta y destacada)
export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  const u = await usuarioDeSolicitud(req, b.solicitanteEmail);
  if (!u || !tienePermisoPreguntas(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const todas = await leerPreguntas({ noCache: true });
  const actual = todas.find((x) => x.id === b.id);
  if (!actual) return NextResponse.json({ ok: false, error: 'No se encontró la pregunta' }, { status: 404 });
  const v = limpiar({ ...actual, ...b });
  if (v.error) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  const nueva = { ...v.p, id: actual.id, orden: actual.orden, actualizado: new Date().toISOString(), creado: actual.creado };
  await updateRow(TABS.PREGUNTAS, actual._rowIndex, preguntaAFila(nueva));
  const cambios = [];
  if (b.activa !== undefined && b.activa !== actual.activa) cambios.push(b.activa ? 'La mostró' : 'La ocultó');
  if (b.destacada !== undefined && b.destacada !== actual.destacada) cambios.push(b.destacada ? 'La destacó' : 'Le sacó el destacado');
  await registrarAccion(b.solicitanteEmail, u.nombre, cambios.length ? `Pregunta frecuente: ${cambios.join(' · ')}` : 'Editó una pregunta frecuente', nueva.pregunta);
  return NextResponse.json({ ok: true });
}

// DELETE { id } -> elimina (vacía la fila; las ocultas se pueden volver a mostrar, las eliminadas no)
export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const u = await usuarioDeSolicitud(req, b.solicitanteEmail);
  if (!u || !tienePermisoPreguntas(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const todas = await leerPreguntas({ noCache: true });
  const actual = todas.find((x) => x.id === b.id);
  if (!actual) return NextResponse.json({ ok: false, error: 'No se encontró la pregunta' }, { status: 404 });
  await updateRow(TABS.PREGUNTAS, actual._rowIndex, ['', '', '', '', '', '', '', '', '', 'FALSE', '', '']);
  await registrarAccion(b.solicitanteEmail, u.nombre, 'Eliminó una pregunta frecuente', actual.pregunta);
  return NextResponse.json({ ok: true });
}
