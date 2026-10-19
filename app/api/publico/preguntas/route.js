import { NextResponse } from 'next/server';
import { leerPreguntas } from '../../../../lib/preguntas';

export const dynamic = 'force-dynamic';
let cache = null; // 30 s: muchas personas a la vez no multiplican las lecturas a Google Sheets

// GET /api/publico/preguntas?publico=estudiantes|interesados -> preguntas activas de ese público (ordenadas)
export async function GET(req) {
  const publico = new URL(req.url).searchParams.get('publico') === 'interesados' ? 'interesados' : 'estudiantes';
  try {
    if (!cache || Date.now() - cache.t > 30 * 1000) cache = { t: Date.now(), data: await leerPreguntas() };
    const forma = (p, otro) => ({ id: p.id, categoria: p.categoria, pregunta: p.pregunta, respuesta: p.respuesta, video: p.video, palabrasClave: p.palabrasClave, destacada: otro ? false : p.destacada, otro });
    const lista = cache.data.filter((p) => p.activa && (p.publico === publico || p.publico === 'ambos')).map((p) => forma(p, false));
    // Estudiantes también encuentran la información general del Instituto (las preguntas de quienes todavía no son estudiantes): vienen marcadas con otro:true.
    if (publico === 'estudiantes' && new URL(req.url).searchParams.get('extra') === '1') {
      const propias = new Set(lista.map((p) => p.pregunta.toLowerCase()));
      cache.data.filter((p) => p.activa && p.publico === 'interesados' && !propias.has(p.pregunta.toLowerCase())).forEach((p) => lista.push(forma(p, true)));
    }
    return NextResponse.json({ ok: true, preguntas: lista });
  } catch (e) {
    console.error('[publico/preguntas]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'No se pudieron cargar las preguntas. Probá de nuevo en un momento.' }, { status: 503 });
  }
}
