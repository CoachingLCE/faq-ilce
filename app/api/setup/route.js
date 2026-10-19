import { NextResponse } from 'next/server';
import { readHeaders, setHeaders, asegurarPestana } from '../../../lib/sheets';
import { HEADERS } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

// Crea (idempotente) las pestañas y la fila de encabezados de cada una. Protegido con SETUP_TOKEN.
// Uso: GET /api/setup?token=TU_SETUP_TOKEN   (agregá &force=1 para reescribir encabezados existentes)
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (!process.env.SETUP_TOKEN || searchParams.get('token') !== process.env.SETUP_TOKEN) return NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 401 });
  if (process.env.ALLOW_SETUP === '0') return NextResponse.json({ ok: false, error: 'Setup deshabilitado (ALLOW_SETUP=0)' }, { status: 403 });
  const force = searchParams.get('force') === '1';
  const resultado = [];
  for (const [tab, headers] of Object.entries(HEADERS)) {
    try {
      await asegurarPestana(tab, headers);
      const actuales = await readHeaders(tab);
      if (force && actuales.length) { await setHeaders(tab, headers); resultado.push({ tab, accion: 'encabezados reescritos' }); }
      else resultado.push({ tab, accion: actuales.length ? 'lista' : 'creada', columnas: headers.length });
    } catch (e) { resultado.push({ tab, accion: 'ERROR', error: e.message }); }
  }
  return NextResponse.json({ ok: resultado.every((r) => r.accion !== 'ERROR'), resultado });
}
