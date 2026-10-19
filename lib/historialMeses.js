// Historial de acciones "mes a mes" (pedido de Diego): en vez de traer y dibujar todo el registro de una vez, se carga el mes actual y
// un botón "Ver más" abre el mes anterior, y así sucesivamente. Función pura SIN imports, idéntica en todas las apps de ILCE.
//
// El mes se calcula en HORA DE ARGENTINA, no en UTC: una acción hecha el 30/09 a las 22 h se guarda como 01/10 en UTC, y con UTC caería
// en el mes equivocado respecto de lo que ve la persona en pantalla.

const ZONA = 'America/Argentina/Buenos_Aires';
const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** 'YYYY-MM' (hora de Argentina) de una fecha; '' si no es una fecha válida. */
export function mesDe(fecha, zona = ZONA) {
  if (fecha == null || fecha === '') return '';
  const s = String(fecha).trim();
  if (SOLO_FECHA.test(s)) return s.slice(0, 7);              // "2026-10-01" ya es una fecha del calendario: no se corre de día
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  try { return d.toLocaleDateString('en-CA', { timeZone: zona }).slice(0, 7); } catch { return ''; }
}

export function mesActual(ahora = new Date(), zona = ZONA) { return mesDe(ahora.toISOString(), zona); }

/** "2026-09" → "Septiembre 2026" */
export function etiquetaMes(mes) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mes || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return String(mes || '');
  const nombre = MESES[+m[2] - 1]; return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${m[1]}`;
}

/** [{ mes: '2026-10', n: 120 }, …] de más reciente a más viejo, solo meses con movimientos. */
export function contarPorMes(registros, campoFecha) {
  const c = new Map();
  (registros || []).forEach((r) => { const m = r ? mesDe(r[campoFecha]) : ''; if (m) c.set(m, (c.get(m) || 0) + 1); });
  return [...c.entries()].map(([mes, n]) => ({ mes, n })).sort((a, b) => b.mes.localeCompare(a.mes));
}

/** Mes con el que arranca: el actual si tiene movimientos; si no (por ejemplo el día 1), el último mes que sí tiene — nunca queda en blanco. */
export function mesInicial(meses, actual) {
  if (!meses || meses.length === 0) return actual || '';
  return meses.some((x) => x.mes === actual) ? actual : meses[0].mes;
}

/** Siguiente mes MÁS VIEJO que todavía no se cargó (se saltean los meses sin movimientos); null si no hay más. */
export function siguienteMes(meses, cargados) {
  const ya = new Set(cargados || []);
  const piso = [...ya].sort()[0];                              // el más viejo cargado
  const candidatos = (meses || []).filter((x) => !ya.has(x.mes) && (!piso || x.mes < piso));
  return candidatos.length ? candidatos[0] : null;
}

/**
 * Lo que devuelve la API. `registros` son TODOS los de la hoja (o los últimos N que ya se leen); `filtrar(registros)` aplica los filtros
 * propios de cada app (usuario, desde, hasta). Sin `todo` y sin filtros, devuelve solo UN mes. Con `todo` o con filtros, devuelve todo
 * lo que coincide (así una búsqueda o un filtro por persona encuentra movimientos de cualquier mes).
 */
export function paginaDeHistorial({ registros, campoFecha, mes, todo, hayFiltros, filtrar, ahora }) {
  const base = Array.isArray(registros) ? registros : [];
  const meses = contarPorMes(base, campoFecha);
  // Más reciente primero. Una fila vacía o con fecha ilegible no rompe el orden: va al final.
  const ms = (x) => { const v = x && x[campoFecha]; const t = Date.parse(SOLO_FECHA.test(String(v)) ? `${v}T12:00:00Z` : v); return Number.isNaN(t) ? 0 : t; };
  const ordenar = (arr) => arr.sort((a, b) => ms(b) - ms(a));
  if (todo || hayFiltros) {
    const lista = ordenar((filtrar ? filtrar(base) : base).slice());
    return { registros: lista, meses, mes: null };
  }
  const elegido = /^\d{4}-\d{2}$/.test(mes || '') ? mes : mesInicial(meses, mesActual(ahora || new Date()));
  return { registros: ordenar(base.filter((r) => r && mesDe(r[campoFecha]) === elegido)), meses, mes: elegido };
}
