import { NextResponse } from 'next/server';
import { readSheet } from '../../../lib/sheets';
import { TABS } from '../../../lib/constants';
import { findUsuario, usuarioDeSolicitud, tienePermisoAuditoria } from '../../../lib/auth';
import { paginaDeHistorial } from '../../../lib/historialMeses';

export const dynamic = 'force-dynamic';

// Historial de acciones MES A MES (pedido de Diego). Solo Admin.
// Sin parámetros devuelve solo UN mes (el actual, o el último que tenga movimientos; con `mes=YYYY-MM` se pide otro), más la lista de
// meses con movimientos y cuántos tiene cada uno. Con `todo=1` devuelve todo el historial: lo usa la pantalla cuando hay una búsqueda o
// un filtro activo, que se aplican en la pantalla y tienen que poder encontrar movimientos de cualquier mes.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const usuario = await usuarioDeSolicitud(req, searchParams.get('solicitanteEmail'));
  if (!usuario || !tienePermisoAuditoria(usuario)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  const todos = (await readSheet(TABS.HISTORIAL))
    .filter((f) => f.Fecha && (f['Acción'] || f['Inscripción ID']))
    .map((f) => ({ fecha: f.Fecha, id: f['Inscripción ID'], usuario: f.Usuario, accion: f['Acción'], detalle: f.Detalle }));
  const pagina = paginaDeHistorial({ registros: todos, campoFecha: 'fecha', mes: searchParams.get('mes') || '', todo: searchParams.get('todo') === '1', hayFiltros: false });
  return NextResponse.json({ ok: true, eventos: pagina.registros, meses: pagina.meses, mes: pagina.mes });
}
