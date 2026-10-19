import { timingSafeEqual } from 'crypto';

// La "llave técnica" (SETUP_TOKEN) protege las pantallas y rutas de mantenimiento (/api/setup, /estado, /api/status con detalle).
// Si la variable no está cargada, NADIE entra (se rechaza, no se deja abierto). Comparación en tiempo constante.
export function tokenValido(token) {
  const esperado = process.env.SETUP_TOKEN;
  if (!esperado || typeof token !== 'string' || !token) return false;
  const a = Buffer.from(token); const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
