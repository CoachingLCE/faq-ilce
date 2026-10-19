// Búsqueda de preguntas: sin tildes ni mayúsculas, por frase completa y, si no alcanza, por todas las palabras sueltas (en cualquier orden).
// Usado por las páginas públicas (en el navegador) y por Reportes (para saber si un término "ya tiene respuesta").
import { aTextoPlano } from './faqTexto';

export function normalizar(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]*>/g, '').replace(/[¿?¡!.,;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim();
}

const VACIAS = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'mi', 'me', 'mis', 'que', 'es', 'por', 'para', 'con', 'se', 'lo', 'al', 'del', 'como', 'cual', 'cuales', 'quiero', 'puedo', 'tengo']);

export function palabrasClave(q) {
  return normalizar(q).split(' ').filter((p) => p.length > 1 && !VACIAS.has(p));
}

export function textoBuscable(p) {
  return normalizar(`${p.pregunta} ${aTextoPlano(p.respuesta)} ${p.palabrasClave || ''}`);
}

/** Devuelve las preguntas que responden a `consulta` (ordenadas: primero las que contienen la frase, luego las de todas las palabras). */
export function buscar(preguntas, consulta) {
  const q = normalizar(consulta);
  if (!q) return preguntas;
  const palabras = palabrasClave(consulta);
  const sc = [];
  preguntas.forEach((p, i) => {
    const titulo = normalizar(p.pregunta);
    const todo = p._t || (p._t = textoBuscable(p));
    let puntos = 0;
    if (titulo.includes(q)) puntos = 3;
    else if (todo.includes(q)) puntos = 2;
    else if (palabras.length && palabras.every((w) => todo.includes(w))) puntos = 1;
    if (puntos) sc.push([puntos, i, p]);
  });
  sc.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return sc.map((x) => x[2]);
}
