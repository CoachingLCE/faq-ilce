// Utilidades de las rutas públicas: validación de datos de la persona y límites de tamaño.
export const recortar = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
export const emailValido = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(String(e || '').trim());
export const sesionValida = (s) => /^[A-Za-z0-9-]{8,48}$/.test(String(s || ''));
export const publicoValido = (p) => (p === 'interesados' ? 'interesados' : 'estudiantes');

export function identidadDe(d) {
  const x = d || {};
  return { nombre: recortar(x.nombre, 80), email: recortar(x.email, 120).toLowerCase(), curso: recortar(x.curso, 80), edicion: recortar(x.edicion, 80), whatsapp: recortar(x.whatsapp, 30) };
}
