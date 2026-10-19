import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { TABS } from '../../../lib/constants';
import { tokenValido } from '../../../lib/accesoTecnico';

export const dynamic = 'force-dynamic';

// Antes era pública y leía TODAS las pestañas de la planilla en cada llamada (sin caché), y devolvía el nombre de cada pestaña, su cantidad de
// filas, parte del ID de la planilla y los mensajes de error de Google. Cualquiera podía repetirla en bucle y agotar la cuota de lectura de Google
// (con lo que las inscripciones reales fallarían). Ahora, sin la llave técnica (?token=, la misma SETUP_TOKEN de /api/setup), solo dice que el
// servicio responde y NO toca la planilla.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (!tokenValido(searchParams.get('token'))) return NextResponse.json({ ok: true, servicio: 'faq-ilce' });
  const out = {};
  let ok = true;
  for (const t of Object.values(TABS)) {
    try {
      const filas = await readSheet(t, { noCache: true });
      out[t] = { ok: true, filas: filas.length };
    } catch (e) {
      ok = false;
      out[t] = { ok: false, error: e.message };
    }
  }
  return NextResponse.json({ ok, sheetId: (process.env.GOOGLE_SHEET_ID || '').slice(0, 6) + '…', tabs: out });
}
