import { NextResponse } from 'next/server';
import { limiteLogin, claveEmail, ipDe, mensajeBloqueo, demoraTrasFallo } from '../../../../lib/limiteLogin';
import { findUsuario } from '../../../../lib/auth';
import { crearToken } from '../../../../lib/sesionFirmada';
import { verifyPassword, estadoPassword, esPasswordGenerica, hashPassword } from '../../../../lib/passwords';
import { updateRow } from '../../../../lib/sheets';
import { TABS } from '../../../../lib/constants';
import { registrarAccion } from '../../../../lib/auditoria';

export const dynamic = 'force-dynamic';

// POST /api/auth/login -> { email, password }
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  // Freno de intentos fallidos (ANTES de leer la planilla de usuarios: los intentos bloqueados no gastan cuota ni llenan el historial).
  const emailClave = claveEmail(body.email);
  const ipCliente = ipDe(request);
  const estadoLimite = limiteLogin.verificar(emailClave, ipCliente);
  if (estadoLimite.bloqueado) {
    return NextResponse.json({ error: mensajeBloqueo(estadoLimite.reintentarEnSeg) }, { status: 429, headers: { 'Retry-After': String(estadoLimite.reintentarEnSeg) } });
  }
  // Si Google Sheets no responde a tiempo (lib/sheets.js ya reintenta una vez antes de
  // rendirse), esto antes quedaba sin capturar: Next.js devolvía un error 500 sin cuerpo JSON,
  // y como el navegador esperaba JSON, el login mostraba el mensaje genérico "Error de
  // conexión" en vez de explicar qué pasó de verdad. Se captura acá para devolver un mensaje
  // claro y un 503 (en vez de un 403/401, que harían pensar que el problema es la contraseña).
  let usuario;
  try {
    usuario = await findUsuario(body.email);
  } catch (err) {
    // Se deja el error real en los logs de Vercel (código/mensaje de Google) para poder
    // confirmar la causa real la próxima vez que pase esto (por ejemplo, cuota de lecturas
    // por minuto agotada, distinto de una caída real de Google Sheets).
    console.error('[login] falló la lectura de Usuarios:', err?.code || err?.response?.status || '', err?.message || err);
    return NextResponse.json({ error: 'No se pudo conectar con la base de datos (Google Sheets no respondió a tiempo). Probá de nuevo en un minuto.' }, { status: 503 });
  }
  if (!usuario) {
    limiteLogin.registrarFallo(emailClave, ipCliente);
    await demoraTrasFallo();
    return NextResponse.json({ error: 'Email no autorizado' }, { status: 403 });
  }
  if (!usuario.activo) {
    await registrarAccion(body.email, usuario.nombre, 'Intento de login rechazado', 'Usuario desactivado');
    return NextResponse.json({ error: 'Tu usuario está desactivado. Pedile a Diego que lo reactive.' }, { status: 403 });
  }
  if (!usuario.passwordHash) {
    return NextResponse.json({ error: 'Tu usuario todavía no tiene contraseña. Pedile a Diego que te la reenvíe desde Accesos.' }, { status: 403 });
  }
  if (!verifyPassword(body.password, usuario.passwordHash)) {
    limiteLogin.registrarFallo(emailClave, ipCliente);
    await registrarAccion(body.email, usuario.nombre, 'Intento de login fallido', 'Contraseña incorrecta');
    await demoraTrasFallo();
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  limiteLogin.registrarExito(emailClave, ipCliente);
  await registrarAccion(body.email, usuario.nombre, 'Inició sesión', '');
  // Contraseñas genéricas ("Hola123") o temporales: la persona tiene que elegir la suya antes de seguir. Su token lleva la marca "cp" y, cuando el servidor es estricto,
  // solo sirve para cambiar la contraseña.
  const estado = estadoPassword(usuario.passwordHash);
  const debeCambiar = estado === 'temporal' || esPasswordGenerica(usuario.passwordHash);

  // Migración al guardado de una sola vía: la contraseña vieja (reversible) se reemplaza por su hash la primera vez que la persona ingresa, sin que se entere. Se escribe SOLO la
  // columna D (la contraseña): no se toca ningún otro dato de la fila. Si falla, el ingreso sigue y se reintenta la próxima vez.
  // ES OPCIONAL (variable MIGRAR_CONTRASENAS=1 en Vercel): una vez migradas, la versión anterior de la app ya no entiende esas contraseñas, así que si hubiera que volver
  // atrás con "rollback" nadie podría ingresar. Se enciende cuando se confirmó que todo anda bien.
  if (estado === 'legacy' && process.env.MIGRAR_CONTRASENAS === '1') {
    try { await updateRow(TABS.USUARIOS, usuario._rowIndex, [hashPassword(body.password, { temporal: debeCambiar })], 'D'); }
    catch (err) { console.error('No se pudo pasar la contraseña al formato protegido (se reintenta en el próximo ingreso):', err); }
  }

  // Token firmado de la sesión (null si no hay clave de firma configurada: en ese caso la app sigue como antes).
  const token = crearToken(usuario.email, (usuario.roles || []).includes('Admin'), Date.now(), { cp: debeCambiar });
  return NextResponse.json({ usuario: { email: usuario.email, nombre: usuario.nombre, roles: usuario.roles, debeCambiar }, token });
}
