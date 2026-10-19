import { NextResponse } from 'next/server';
import { limitador, ipDe, MIN10 } from '../../../../lib/limiteRitmo';
import { encolarFilas } from '../../../../lib/cola';
import { asegurarPestana } from '../../../../lib/sheets';
import { TABS, HEADERS } from '../../../../lib/constants';
import { identidadDe, emailValido, sesionValida, publicoValido, recortar } from '../../../../lib/publico';

export const dynamic = 'force-dynamic';

// POST /api/publico/registro { sesion, publico, nombre, email, curso, edicion, whatsapp?, dispositivo? }
// Registra una visita identificada: la persona dice quién es antes de buscar.
export async function POST(req) {
  const lim = limitador.intentar('reg:' + ipDe(req), 20, MIN10);
  if (!lim.permitido) return NextResponse.json({ ok: false, error: 'Demasiados intentos. Esperá unos minutos.' }, { status: 429 });
  let b; try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 }); }
  const publico = publicoValido(b.publico);
  const id = identidadDe(b);
  if (!sesionValida(b.sesion)) return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 400 });
  if (id.nombre.length < 2) return NextResponse.json({ ok: false, error: 'Escribí tu nombre.' }, { status: 400 });
  if (!emailValido(id.email)) return NextResponse.json({ ok: false, error: 'Revisá tu email: no parece válido.' }, { status: 400 });
  if (publico === 'estudiantes' && (!id.curso || !id.edicion)) return NextResponse.json({ ok: false, error: 'Elegí tu curso y tu edición.' }, { status: 400 });
  try {
    await asegurarPestana(TABS.VISITANTES, HEADERS[TABS.VISITANTES]);
    await encolarFilas(TABS.VISITANTES, [[b.sesion, new Date().toISOString(), publico, id.nombre, id.email, id.curso, id.edicion, id.whatsapp, recortar(b.dispositivo, 20)]]);
    return NextResponse.json({ ok: true });
  } catch {
    // Si no se pudo guardar, la persona igual puede usar las preguntas (no se la bloquea por un problema nuestro).
    return NextResponse.json({ ok: true, aviso: 'sin-registro' });
  }
}
