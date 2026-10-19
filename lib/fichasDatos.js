// Datos que se leen de la planilla de la app de FICHAS (solo lectura): cursos con sus ediciones y usuarios.
import { readSheetFichas, fichasConfigurada } from './sheets';
import { TABS_FICHAS, CURSOS } from './constants';

let cacheOpc = null;
export async function opcionesCursos() {
  if (cacheOpc && Date.now() - cacheOpc.t < 5 * 60 * 1000) return cacheOpc.data;
  const porCurso = new Map(CURSOS.map((n) => [n, []]));
  let origen = 'local';
  if (fichasConfigurada()) {
    try {
      const filas = await readSheetFichas(TABS_FICHAS.FICHAS);
      filas.forEach((f) => {
        const nombre = String(f.Curso || '').trim();
        if (!nombre) return;
        let eds = [];
        try { const d = JSON.parse(f['Definición JSON'] || '{}'); if (Array.isArray(d.ediciones)) eds = d.ediciones; } catch { /* */ }
        const lista = porCurso.get(nombre) || [];
        eds.forEach((e) => {
          const label = String(e.label || (e.id ? 'Edición ' + e.id : '')).trim();
          if (label && !lista.some((x) => x.label === label)) lista.push({ id: String(e.id || ''), label });
        });
        porCurso.set(nombre, lista);
      });
      origen = 'fichas';
    } catch (e) { console.error('[fichasDatos] no se pudo leer la planilla de fichas:', e?.message || e); }
  }
  const cursos = [...porCurso.entries()].map(([nombre, ediciones]) => ({ nombre, ediciones }));
  const data = { cursos, origen };
  cacheOpc = { t: Date.now(), data };
  return data;
}

/** Usuarios de la app de fichas (Email, Nombre, Roles, PasswordHash, Activo). */
export async function leerUsuariosFichas() {
  const filas = await readSheetFichas(TABS_FICHAS.USUARIOS, { noCache: true });
  return filas.filter((u) => (u.Email || '').trim()).map((u) => ({
    email: String(u.Email).trim(), nombre: String(u.Nombre || '').trim(),
    roles: String(u.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean),
    passwordHash: String(u.PasswordHash || ''),
    activo: (u.Activo || '') !== 'FALSE' && String(u.Activo || '').toLowerCase() !== 'no'
  }));
}
