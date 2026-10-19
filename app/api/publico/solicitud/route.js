import { NextResponse } from 'next/server';
import { limitador, ipDe, MIN10 } from '../../../../lib/limiteRitmo';
import { appendRow, asegurarPestana } from '../../../../lib/sheets';
import { TABS, HEADERS } from '../../../../lib/constants';
import { idNuevo } from '../../../../lib/preguntas';
import { identidadDe, emailValido, publicoValido, recortar } from '../../../../lib/publico';
import { encolarFilas } from '../../../../lib/cola';

export const dynamic = 'force-dynamic';

// POST /api/publico/solicitud -> la persona pide que la contacten para una videollamada por Zoom.
// body: { sesion, publico, nombre, email, whatsapp, curso, edicion, pais, zonaHoraria, consulta, disponibilidad:[{fecha:'2026-10-20', desde:'18:00', hasta:'20:00'}], terminoBuscado }
export async function POST(req) {
  const ip = ipDe(req);
  const lim = limitador.intentar('sol:' + ip, 5, 60 * MIN10 / 10); // 5 por hora desde una misma conexión
  if (!lim.permitido) return NextResponse.json({ ok: false, error: 'Ya enviaste varias solicitudes. Esperá un rato o escribinos por WhatsApp.' }, { status: 429 });
  let b; try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 }); }
  const publico = publicoValido(b.publico);
  const id = identidadDe(b);
  if (id.nombre.length < 2) return NextResponse.json({ ok: false, error: 'Escribí tu nombre.' }, { status: 400 });
  if (!emailValido(id.email)) return NextResponse.json({ ok: false, error: 'Revisá tu email: no parece válido.' }, { status: 400 });
  const consulta = recortar(b.consulta, 1200);
  if (consulta.length < 5) return NextResponse.json({ ok: false, error: 'Contanos en pocas palabras qué querés consultar.' }, { status: 400 });
  const slots = (Array.isArray(b.disponibilidad) ? b.disponibilidad : []).slice(0, 8).map((s) => ({
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(s && s.fecha)) ? s.fecha : '',
    desde: /^\d{2}:\d{2}$/.test(String(s && s.desde)) ? s.desde : '',
    hasta: /^\d{2}:\d{2}$/.test(String(s && s.hasta)) ? s.hasta : ''
  })).filter((s) => s.fecha && s.desde && s.hasta && s.desde < s.hasta);
  if (!slots.length) return NextResponse.json({ ok: false, error: 'Agregá al menos un día y un rango de horario en el que podamos contactarte.' }, { status: 400 });
  const zona = recortar(b.zonaHoraria, 60) || '';
  try {
    await asegurarPestana(TABS.SOLICITUDES, HEADERS[TABS.SOLICITUDES]);
    const idSol = idNuevo('S'); const ahora = new Date().toISOString();
    await appendRow(TABS.SOLICITUDES, [idSol, ahora, publico, id.nombre, id.email, id.whatsapp, id.curso, id.edicion, recortar(b.pais, 60), zona, consulta, JSON.stringify(slots), 'Nueva', '', '', '', '', ahora]);
    // También queda como evento para los Reportes.
    try {
      await asegurarPestana(TABS.EVENTOS, HEADERS[TABS.EVENTOS]);
      await encolarFilas(TABS.EVENTOS, [[ahora, recortar(b.sesion, 48), publico, 'clic', 'Pidió videollamada (enviada)', '', '', 'videollamada', id.email, id.nombre, id.curso, id.edicion]]);
    } catch { /* */ }
    return NextResponse.json({ ok: true, id: idSol });
  } catch (e) {
    console.error('[solicitud]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'No pudimos guardar tu solicitud. Probá de nuevo o escribinos por WhatsApp.' }, { status: 503 });
  }
}
