import { NextResponse } from 'next/server';
import { limitador, ipDe } from '../../../../lib/limiteRitmo';
import { encolarFilas } from '../../../../lib/cola';
import { asegurarPestana } from '../../../../lib/sheets';
import { TABS, HEADERS, TIPOS_EVENTO } from '../../../../lib/constants';
import { identidadDe, sesionValida, publicoValido, recortar } from '../../../../lib/publico';

export const dynamic = 'force-dynamic';

// POST /api/publico/eventos { sesion, publico, identidad, eventos:[{ tipo, termino?, resultados?, preguntaId?, destino?, t? }] }
// Guarda lo que hace la persona (búsquedas, preguntas abiertas, clics, "¿te ayudó?") para los Reportes. Nunca devuelve error visible: si falla, la persona no se entera.
export async function POST(req) {
  const lim = limitador.intentar('ev:' + ipDe(req), 60, 60 * 1000);
  if (!lim.permitido) return NextResponse.json({ ok: true });
  let b; try { b = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  if (!sesionValida(b.sesion) || !Array.isArray(b.eventos)) return NextResponse.json({ ok: true });
  const publico = publicoValido(b.publico);
  const id = identidadDe(b.identidad);
  const filas = b.eventos.slice(0, 40).filter((e) => e && TIPOS_EVENTO.includes(e.tipo)).map((e) => {
    const t = Number(e.t); const fecha = t > 0 && Date.now() - t < 6 * 3600 * 1000 && t <= Date.now() + 60000 ? new Date(t) : new Date();
    const res = e.resultados === undefined || e.resultados === null || e.resultados === '' ? '' : Math.max(0, Math.min(999, parseInt(e.resultados, 10) || 0));
    return [fecha.toISOString(), b.sesion, publico, e.tipo, recortar(e.termino, 160), res, recortar(e.preguntaId, 30), recortar(e.destino, e.tipo === 'detalle_busqueda' ? 600 : 300), id.email, id.nombre, id.curso, id.edicion];
  });
  if (!filas.length) return NextResponse.json({ ok: true });
  try { await asegurarPestana(TABS.EVENTOS, HEADERS[TABS.EVENTOS]); await encolarFilas(TABS.EVENTOS, filas); } catch { /* no se le muestra a la persona */ }
  return NextResponse.json({ ok: true });
}
