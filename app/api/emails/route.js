import { NextResponse } from 'next/server';
import { usuarioDeSolicitud, tienePermisoAccesos } from '../../../lib/auth';
import { readSheet, asegurarPestana } from '../../../lib/sheets';
import { TABS, HEADERS } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

// GET /api/emails: registro de los mails automáticos enviados (más nuevos primero). Solo para quien tiene acceso a la pestaña Accesos.
export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const u = await usuarioDeSolicitud(req, sp.get('solicitanteEmail'));
  if (!u || !tienePermisoAccesos(u)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  try {
    await asegurarPestana(TABS.EMAILS, HEADERS[TABS.EMAILS]);
    const filas = await readSheet(TABS.EMAILS, { noCache: true });
    const lista = filas.filter((f) => f.Fecha).map((f) => ({ fecha: f.Fecha, tipo: f.Tipo, para: f.Para, cc: f.CC, asunto: f.Asunto, estado: f.Estado, detalle: f.Detalle }))
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 80);
    return NextResponse.json({ ok: true, filas: lista });
  } catch (e) {
    console.error('[emails]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'No se pudo leer el registro de mails.' }, { status: 503 });
  }
}
