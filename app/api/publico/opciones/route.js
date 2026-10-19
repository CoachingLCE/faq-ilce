import { NextResponse } from 'next/server';
import { opcionesCursos } from '../../../../lib/fichasDatos';

export const dynamic = 'force-dynamic';
// GET /api/publico/opciones -> cursos y ediciones para el formulario de ingreso
export async function GET() {
  try { return NextResponse.json({ ok: true, ...(await opcionesCursos()) }); }
  catch { return NextResponse.json({ ok: true, cursos: [], origen: 'local' }); }
}
