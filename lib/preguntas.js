import { readSheet, appendRow, updateRow, asegurarPestana } from './sheets';
import { TABS, HEADERS } from './constants';

export const idNuevo = (pref = 'P') => pref + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
const esSi = (v) => String(v == null ? '' : v).trim().toUpperCase() !== 'FALSE' && String(v).trim().toLowerCase() !== 'no' && String(v).trim() !== '';

export function filaAPregunta(f) {
  return {
    id: f.ID, orden: Number(f.Orden) || 0, publico: (f['Público'] || 'ambos').toLowerCase(), categoria: f['Categoría'] || 'gen',
    pregunta: f.Pregunta || '', respuesta: f.Respuesta || '', video: f.Video || '', palabrasClave: f['Palabras clave'] || '',
    destacada: String(f.Destacada).toUpperCase() === 'TRUE', activa: f.Activa === '' || f.Activa === undefined ? true : String(f.Activa).toUpperCase() !== 'FALSE',
    actualizado: f.Actualizado || '', creado: f.Creado || '', _rowIndex: f._rowIndex
  };
}
export function preguntaAFila(p) {
  return [p.id, p.orden, p.publico, p.categoria, p.pregunta, p.respuesta, p.video || '', p.palabrasClave || '', p.destacada ? 'TRUE' : 'FALSE', p.activa === false ? 'FALSE' : 'TRUE', p.actualizado || new Date().toISOString(), p.creado || new Date().toISOString()];
}

export async function leerPreguntas({ noCache = false } = {}) {
  await asegurarPestana(TABS.PREGUNTAS, HEADERS[TABS.PREGUNTAS]);
  const filas = await readSheet(TABS.PREGUNTAS, { noCache });
  return filas.filter((f) => f.ID && f.Pregunta).map(filaAPregunta).sort((a, b) => a.orden - b.orden);
}
export { appendRow, updateRow };
export { esSi };
