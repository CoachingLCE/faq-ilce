import { appendRow } from './sheets';
import { TABS } from './constants';

// Registra una acción del equipo en la pestaña Historial.
// Columnas Historial: Fecha, Inscripción ID, Usuario, Acción, Detalle.
export async function registrarAccion(email, nombre, accion, detalle = '') {
  try {
    await appendRow(TABS.HISTORIAL, [
      new Date().toISOString(),
      '',
      `${nombre || ''} (${email || ''})`.trim(),
      accion,
      detalle
    ]);
  } catch {
    /* la auditoría nunca debe romper el flujo principal */
  }
}
