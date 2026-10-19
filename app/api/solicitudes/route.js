import { NextResponse } from 'next/server';
import { usuarioDeSolicitud, tienePermisoSolicitudes, tienePermisoVerSolicitudes } from '../../../lib/auth';
import { readSheet, updateRow, asegurarPestana } from '../../../lib/sheets';
import { TABS, HEADERS, ESTADOS_SOLICITUD } from '../../../lib/constants';
import { registrarAccion } from '../../../lib/auditoria';
import { recortar } from '../../../lib/publico';

export const dynamic = 'force-dynamic';

function aSolicitud(f) {
  let disp = []; try { disp = JSON.parse(f['Disponibilidad JSON'] || '[]'); } catch { /* */ }
  return {
    id: f.ID, fecha: f.Fecha, publico: f['Público'], nombre: f.Nombre, email: f.Email, whatsapp: f.WhatsApp, curso: f.Curso, edicion: f['Edición'],
    pais: f['País'], zonaHoraria: f['Zona horaria'], consulta: f.Consulta, disponibilidad: Array.isArray(disp) ? disp : [],
    estado: ESTADOS_SOLICITUD.includes(f.Estado) ? f.Estado : 'Nueva', responsable: f.Responsable || '', linkZoom: f['Link Zoom'] || '',
    fechaAgendada: f['Fecha agendada'] || '', notas: f.Notas || '', actualizado: f.Actualizado || '', _rowIndex: f._rowIndex
  };
}
const aFila = (s) => [s.id, s.fecha, s.publico, s.nombre, s.email, s.whatsapp, s.curso, s.edicion, s.pais, s.zonaHoraria, s.consulta, JSON.stringify(s.disponibilidad || []), s.estado, s.responsable, s.linkZoom, s.fechaAgendada, s.notas, s.actualizado];

export async function GET(req) {
  const u = await usuarioDeSolicitud(req, new URL(req.url).searchParams.get('solicitanteEmail'));
  if (!u || !tienePermisoVerSolicitudes(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  await asegurarPestana(TABS.SOLICITUDES, HEADERS[TABS.SOLICITUDES]);
  const filas = await readSheet(TABS.SOLICITUDES, { noCache: true });
  const lista = filas.filter((f) => f.ID).map(aSolicitud).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  return NextResponse.json({ ok: true, solicitudes: lista });
}

// PATCH { id, estado?, responsable?, linkZoom?, fechaAgendada?, notas? }
export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  const u = await usuarioDeSolicitud(req, b.solicitanteEmail);
  if (!u || !tienePermisoSolicitudes(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const filas = await readSheet(TABS.SOLICITUDES, { noCache: true });
  const f = filas.find((x) => x.ID === b.id);
  if (!f) return NextResponse.json({ ok: false, error: 'No se encontró la solicitud' }, { status: 404 });
  const s = aSolicitud(f);
  const antes = s.estado;
  if (b.estado !== undefined) { if (!ESTADOS_SOLICITUD.includes(b.estado)) return NextResponse.json({ ok: false, error: 'Estado inválido' }, { status: 400 }); s.estado = b.estado; }
  if (b.responsable !== undefined) s.responsable = recortar(b.responsable, 80);
  if (b.linkZoom !== undefined) {
    const l = recortar(b.linkZoom, 300);
    if (l && !/^https?:\/\/\S+$/i.test(l)) return NextResponse.json({ ok: false, error: 'El link de Zoom tiene que empezar con https://' }, { status: 400 });
    s.linkZoom = l;
  }
  if (b.fechaAgendada !== undefined) s.fechaAgendada = recortar(b.fechaAgendada, 30);
  if (b.notas !== undefined) s.notas = String(b.notas || '').replace(/\r/g, '').slice(0, 2000);
  s.actualizado = new Date().toISOString();
  await updateRow(TABS.SOLICITUDES, f._rowIndex, aFila(s));
  await registrarAccion(b.solicitanteEmail, u.nombre, s.estado !== antes ? `Solicitud de videollamada: ${antes} → ${s.estado}` : 'Editó una solicitud de videollamada', `${s.nombre} (${s.email})`);
  return NextResponse.json({ ok: true, solicitud: s });
}
