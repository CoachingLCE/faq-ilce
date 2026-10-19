import { NextResponse } from 'next/server';
import { readSheet, asegurarPestana } from '../../../../lib/sheets';
import { TABS, HEADERS } from '../../../../lib/constants';
import { leerPreguntas } from '../../../../lib/preguntas';
import { calcularResumen } from '../../../../lib/resumenSemanal';
import { enviarResumenSemanal } from '../../../../lib/mailer';

export const dynamic = 'force-dynamic';

// GET /api/cron/resumen-semanal: lo dispara Vercel todos los viernes (ver vercel.json) y manda el resumen de la semana por mail.
// A diferencia de otros procesos programados, ESTE EXIGE la clave: si CRON_SECRET no está configurada en Vercel no manda nada (así nadie puede dispararlo desde afuera y llenar de mails a la gente).
export async function GET(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return NextResponse.json({ ok: false, error: 'Falta configurar CRON_SECRET en Vercel: no se envía nada hasta configurarla.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secreto}`) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  try {
    await Promise.all([TABS.VISITANTES, TABS.EVENTOS, TABS.SOLICITUDES].map((t) => asegurarPestana(t, HEADERS[t])));
    const [vis, evs, sols, preguntas] = await Promise.all([
      readSheet(TABS.VISITANTES, { noCache: true }), readSheet(TABS.EVENTOS, { noCache: true }), readSheet(TABS.SOLICITUDES, { noCache: true }), leerPreguntas()
    ]);
    const resumen = calcularResumen({ vis, evs, sols, preguntas, ahora: new Date() });
    const r = await enviarResumenSemanal(resumen, { panelUrl: new URL(request.url).origin + '/panel' });
    return NextResponse.json({ ok: r.ok, motivo: r.motivo || '' }, { status: r.ok ? 200 : 502 });
  } catch (e) {
    console.error('[resumen-semanal]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'No se pudo armar el resumen.' }, { status: 500 });
  }
}
