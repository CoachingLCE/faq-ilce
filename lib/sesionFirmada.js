import { createHmac, timingSafeEqual } from 'crypto';

// Sesión firmada (revisión de seguridad de octubre de 2026). Antes, el servidor creía en el email que mandaba el navegador (`solicitanteEmail`): quien conociera el
// email de un Admin podía llamar a la API como si fuera él. Ahora el login entrega un TOKEN FIRMADO (HMAC-SHA256) con vencimiento, el navegador lo manda en cada
// pedido y el servidor sabe quién sos por el token, no por el email.
//
// La clave de firma se DERIVA de SESSION_SECRET o, si no está, de PASSWORD_ENCRYPTION_KEY (que ya existe: cifra las contraseñas). Si no hay ninguna de las dos,
// no se emiten tokens y todo sigue funcionando como antes (falla seguro: nunca deja a nadie afuera por una variable que falta).
const VERSION = 1;
export const TTL_ADMIN_MS = 14 * 24 * 60 * 60 * 1000; // Admin: 14 días (antes nunca vencía)
export const TTL_OTROS_MS = 24 * 60 * 60 * 1000;      // el resto: 24 horas (en el navegador ya vencía a fin del día)

function secreto() {
  const s = process.env.SESSION_SECRET;
  const k = process.env.PASSWORD_ENCRYPTION_KEY;
  const base = s && s.length >= 16 ? s : (k || null);
  if (!base) return null;
  // La clave de firma SIEMPRE se deriva de la base con una etiqueta propia ("fichas" la separa de la de las otras apps): la clave que cifra las contraseñas nunca se usa
  // directamente para firmar, y un token de una app no sirve en otra.
  return createHmac('sha256', base).update('ilce-faq-sesion-v1').digest('hex');
}
export function sesionFirmadaDisponible() { return !!secreto(); }
const b64u = (buf) => Buffer.from(buf).toString('base64url');

/** Token para `email`, o null si no hay clave de firma configurada. */
/** `cp: true` = la persona entró con una contraseña genérica o temporal: ese token solo sirve para cambiarla (ver usuarioDeSolicitud). */
export function crearToken(email, esAdmin, ahora = Date.now(), { cp = false } = {}) {
  const s = secreto();
  if (!s) return null;
  const payload = b64u(JSON.stringify({ v: VERSION, e: String(email || '').trim().toLowerCase(), iat: ahora, exp: ahora + (esAdmin ? TTL_ADMIN_MS : TTL_OTROS_MS), ...(cp ? { cp: 1 } : {}) }));
  return payload + '.' + b64u(createHmac('sha256', s).update(payload).digest());
}

/** { email, exp } si el token es auténtico y no venció; si no, null (firma inválida, manipulado, vencido, de otra versión o sin clave configurada). */
export function verificarToken(token, ahora = Date.now()) {
  const s = secreto();
  if (!s || typeof token !== 'string' || token.length > 2000) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [payload, firma] = partes;
  const esperada = createHmac('sha256', s).update(payload).digest();
  let recibida;
  try { recibida = Buffer.from(firma, 'base64url'); } catch { return null; }
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  let d;
  try { d = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (!d || d.v !== VERSION || typeof d.e !== 'string' || !d.e || typeof d.exp !== 'number' || ahora >= d.exp) return null;
  if (typeof d.iat === 'number' && d.iat > ahora + 5 * 60 * 1000) return null; // emitido "en el futuro": no es creíble
  return { email: d.e, exp: d.exp, cp: d.cp === 1 };
}

/** Etapa estricta: con SESION_ESTRICTA=1 (y clave configurada) el email solo ya no vale. */
export function sesionEstricta() { return process.env.SESION_ESTRICTA === '1' && sesionFirmadaDisponible(); }
