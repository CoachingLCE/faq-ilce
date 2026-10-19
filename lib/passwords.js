import crypto from 'crypto';
import { PASSWORD_GENERICA } from './constants';

// Dos formatos de contraseña guardada (revisión de seguridad de octubre de 2026):
//  · NUEVO, de una sola vía: "scrypt$N$sal$hash" (o "scryptt$..." si es una clave TEMPORAL que la persona debe cambiar). No se puede volver a la contraseña original.
//  · ANTERIOR, reversible (AES-256-GCM): "iv:tag:cifrado". Sigue aceptándose para que nadie quede afuera; Accesos le muestra al Admin la contraseña de quien todavía no la cambió.

// Clave de 32 bytes derivada de PASSWORD_ENCRYPTION_KEY (cualquier string sirve).
function getKey() {
  const base = process.env.PASSWORD_ENCRYPTION_KEY || process.env.SESSION_SECRET || 'ilce-fallback-key';
  return crypto.scryptSync(base, 'ilce-pwd-salt', 32);
}

export function decryptPassword(stored) {
  try {
    const [ivB, tagB, ctB] = String(stored).split(':');
    if (!ivB || !tagB || !ctB) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB, 'base64'));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]);
    return pt.toString('utf8');
  } catch {
    return null;
  }
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const LARGO = 32;

/** Hash de una sola vía. `temporal: true` marca una clave que la persona tiene que cambiar al ingresar. */
export function hashPassword(plain, { temporal = false } = {}) {
  const sal = crypto.randomBytes(16);
  const dk = crypto.scryptSync(String(plain), sal, LARGO, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `${temporal ? 'scryptt' : 'scrypt'}$${SCRYPT_N}$${sal.toString('hex')}$${dk.toString('hex')}`;
}

/** 'vacia' | 'temporal' | 'protegida' (hash de una sola vía) | 'legacy' (formato reversible anterior). */
export function estadoPassword(stored) {
  if (!stored) return 'vacia';
  if (/^scryptt\$/.test(stored)) return 'temporal';
  if (/^scrypt\$/.test(stored)) return 'protegida';
  return 'legacy';
}

/** ¿La contraseña guardada (formato anterior) es la genérica "Hola123"? Esas personas deben elegir la suya al ingresar. */
export function esPasswordGenerica(stored) {
  return estadoPassword(stored) === 'legacy' && decryptPassword(stored) === PASSWORD_GENERICA;
}

function verificarHash(password, stored) {
  const [, n, salHex, hashHex] = String(stored).split('$');
  // Formato estricto: sal de 16 bytes y hash de 32 bytes, en hexadecimal. Un dato corrupto o alterado NUNCA puede dar "vacío igual a vacío" y aceptar cualquier contraseña.
  if (!n || !/^[0-9a-f]{32}$/.test(salHex || '') || !/^[0-9a-f]{64}$/.test(hashHex || '')) return false;
  const N = Number(n); // costo guardado en el propio hash: se acota para que un dato alterado en la planilla no pueda colgar el ingreso
  if (!Number.isInteger(N) || N < 1024 || N > 262144 || (N & (N - 1)) !== 0) return false;
  let esperado;
  try { esperado = Buffer.from(hashHex, 'hex'); } catch { return false; }
  let calculado;
  try { calculado = crypto.scryptSync(String(password), Buffer.from(salHex, 'hex'), esperado.length, { N, r: SCRYPT_R, p: SCRYPT_P }); } catch { return false; }
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || !password) return false;
  const e = estadoPassword(stored);
  if (e === 'protegida' || e === 'temporal') return verificarHash(password, stored);
  if (e === 'vacia') return false;
  const actual = decryptPassword(stored); // formato anterior
  if (actual === null) return false;
  // Comparación en tiempo constante
  const bufA = Buffer.from(actual);
  const bufB = Buffer.from(password);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Clave temporal aleatoria (sin caracteres que se confundan: 0/O, 1/l/I). Reemplaza a "Hola123" en altas y restablecimientos. */
export function generarTemporal(largo = 10) {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < largo; i++) out += alfabeto[crypto.randomInt(alfabeto.length)];
  return out;
}

const COMUNES = new Set(['12345678', '123456789', '1234567890', 'password', 'password1', 'contraseña1', 'contrasena1', 'qwerty123', 'ilce1234', 'ilce2026', 'hola1234', 'hola12345', 'abc12345', 'iloveyou1']);
/** Texto del problema si la contraseña elegida no sirve, o null si está bien. */
export function validarNuevaPassword(nueva, { email = '', actual = '' } = {}) {
  const n = String(nueva == null ? '' : nueva);
  if (n.length < 8) return 'La contraseña nueva tiene que tener al menos 8 caracteres.';
  if (n.length > 100) return 'La contraseña nueva es demasiado larga (máximo 100 caracteres).';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(n) || !/\d/.test(n)) return 'La contraseña nueva tiene que incluir al menos una letra y un número.';
  if (n.toLowerCase() === String(PASSWORD_GENERICA).toLowerCase() || COMUNES.has(n.toLowerCase())) return 'Esa contraseña es demasiado común. Elegí otra.';
  const local = String(email).split('@')[0].toLowerCase();
  if (email && (n.toLowerCase() === String(email).toLowerCase() || (local.length >= 4 && n.toLowerCase() === local))) return 'La contraseña no puede ser igual a tu email.';
  if (actual && n === actual) return 'La contraseña nueva tiene que ser distinta de la actual.';
  return null;
}
