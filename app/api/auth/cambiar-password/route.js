import { NextResponse } from 'next/server';
import { limiteLogin, claveEmail, ipDe, mensajeBloqueo, demoraTrasFallo } from '../../../../lib/limiteLogin';
import { findUsuario, usuarioDeSolicitud } from '../../../../lib/auth';
import { crearToken } from '../../../../lib/sesionFirmada';
import { verifyPassword, hashPassword, validarNuevaPassword } from '../../../../lib/passwords';
import { updateRow } from '../../../../lib/sheets';
import { TABS } from '../../../../lib/constants';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/auth/cambiar-password -> { email, actual, nueva }
// Cada persona cambia SU contraseña (antes no había forma: solo la fijaba un Admin). Pide la actual (aunque alguien tenga la sesión abierta o conozca el email, tiene que saber la
// contraseña de hoy) y comparte el freno de intentos fallidos con el ingreso. Es la única ruta que acepta la sesión de quien entró con una contraseña genérica o temporal.
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 }); }
  const emailClave = claveEmail(body && body.email);
  const ipCliente = ipDe(request);
  const estadoLimite = limiteLogin.verificar(emailClave, ipCliente);
  if (estadoLimite.bloqueado) {
    return NextResponse.json({ error: mensajeBloqueo(estadoLimite.reintentarEnSeg) }, { status: 429, headers: { 'Retry-After': String(estadoLimite.reintentarEnSeg) } });
  }
  const solicitante = await usuarioDeSolicitud(request, body.email, { permitirTemporal: true });
  // Solo la propia: nadie cambia la contraseña de otra persona por acá (el Admin usa "Restablecer" en Accesos).
  if (!solicitante || !solicitante.activo || String(solicitante.email).trim().toLowerCase() !== String(body.email || '').trim().toLowerCase()) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const completo = await findUsuario(solicitante.email); // lectura propia de la fila: trae la contraseña guardada y su posición
  if (!completo || !verifyPassword(body.actual, completo.passwordHash)) {
    limiteLogin.registrarFallo(emailClave, ipCliente);
    await registrarAccion(solicitante.email, solicitante.nombre, 'Intento de cambio de contraseña fallido', 'Contraseña actual incorrecta');
    await demoraTrasFallo();
    return NextResponse.json({ error: 'La contraseña actual no es correcta.' }, { status: 401 });
  }
  const problema = validarNuevaPassword(body.nueva, { email: solicitante.email, actual: body.actual });
  if (problema) return NextResponse.json({ error: problema }, { status: 400 });

  await updateRow(TABS.USUARIOS, completo._rowIndex, [hashPassword(body.nueva)], 'D'); // solo la columna D (contraseña), ya protegida y definitiva (no temporal)
  limiteLogin.registrarExito(emailClave, ipCliente);
  await registrarAccion(solicitante.email, solicitante.nombre, 'Cambió su contraseña', '');
  // Token nuevo, sin la marca de "debe cambiarla": a partir de acá la sesión sirve para todo.
  const token = crearToken(solicitante.email, (solicitante.roles || []).includes('Admin'));
  return NextResponse.json({ ok: true, token });
}
