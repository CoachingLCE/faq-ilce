import { NextResponse } from 'next/server';
import { usuarioDeSolicitud, tienePermisoImportarUsuarios } from '../../../../lib/auth';
import { readSheet, appendRows, updateRow, fichasConfigurada } from '../../../../lib/sheets';
import { leerUsuariosFichas } from '../../../../lib/fichasDatos';
import { hashPassword, generarTemporal } from '../../../../lib/passwords';
import { registrarAccion } from '../../../../lib/auditoria';
import { TABS, ROLES } from '../../../../lib/constants';

export const dynamic = 'force-dynamic';

const mismos = (a, b) => [...a].sort().join(',') === [...b].sort().join(',');

// POST /api/usuarios/importar { solicitanteEmail, accion: 'vista' | 'importar', copiarClaves, actualizarExistentes, emails?: [] }
//  · 'vista': lee la planilla de la app de fichas y dice, persona por persona, si es nueva, ya existe igual o existe con diferencias. No escribe nada.
//  · 'importar': agrega las personas nuevas (las elegidas, o todas). Si actualizarExistentes, también iguala nombre, roles y estado de las que ya existen. NUNCA pisa la contraseña de alguien que ya existe
//    y nunca borra a nadie. Con copiarClaves, quien entra a esta app usa la MISMA contraseña que en fichas (hace falta el mismo PASSWORD_ENCRYPTION_KEY en las dos apps si su clave está en el formato anterior).
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const admin = await usuarioDeSolicitud(req, b.solicitanteEmail);
  if (!admin || !tienePermisoImportarUsuarios(admin)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  if (!fichasConfigurada()) return NextResponse.json({ ok: false, error: 'Falta configurar la variable FICHAS_SHEET_ID (el ID de la planilla de la app de fichas) en Vercel.' }, { status: 400 });

  let origen;
  try { origen = await leerUsuariosFichas(); }
  catch (e) {
    console.error('[importar]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'No se pudo leer la planilla de fichas. Revisá que esté compartida con la cuenta de servicio de esta app y que FICHAS_SHEET_ID sea correcto.' }, { status: 502 });
  }
  const aca = await readSheet(TABS.USUARIOS, { noCache: true });
  const porEmail = new Map(aca.filter((u) => u.Email).map((u) => [String(u.Email).trim().toLowerCase(), u]));

  const personas = origen.map((o) => {
    const rolesOk = o.roles.filter((r) => ROLES.includes(r));
    const ya = porEmail.get(o.email.toLowerCase());
    let estado = 'nuevo';
    if (ya) {
      const rolesYa = String(ya.Roles || '').split(/[,+]/).map((r) => r.trim()).filter(Boolean);
      const activoYa = (ya.Activo || '') !== 'FALSE' && String(ya.Activo || '').toLowerCase() !== 'no';
      estado = (String(ya.Nombre || '').trim() === o.nombre && mismos(rolesYa, rolesOk) && activoYa === o.activo) ? 'igual' : 'difiere';
    }
    return { email: o.email, nombre: o.nombre, roles: rolesOk, rolesOriginales: o.roles, activo: o.activo, tieneClave: !!o.passwordHash, estado, _origen: o };
  });
  const resumen = { nuevos: personas.filter((p) => p.estado === 'nuevo').length, difieren: personas.filter((p) => p.estado === 'difiere').length, iguales: personas.filter((p) => p.estado === 'igual').length, total: personas.length };

  if (b.accion !== 'importar') {
    return NextResponse.json({ ok: true, resumen, personas: personas.map(({ _origen, ...p }) => p) });
  }

  const elegidos = Array.isArray(b.emails) && b.emails.length ? new Set(b.emails.map((e) => String(e).toLowerCase())) : null;
  const sel = personas.filter((p) => !elegidos || elegidos.has(p.email.toLowerCase()));
  const nuevas = sel.filter((p) => p.estado === 'nuevo');
  const aActualizar = b.actualizarExistentes ? sel.filter((p) => p.estado === 'difiere') : [];
  const claves = [];
  const filas = nuevas.map((p) => {
    let hash = '';
    if (b.copiarClaves && p._origen.passwordHash) hash = p._origen.passwordHash;
    else { const t = generarTemporal(); hash = hashPassword(t, { temporal: true }); claves.push({ email: p.email, nombre: p.nombre, clave: t }); }
    return [p.email, p.nombre, p.roles.join(','), hash, p.activo ? 'TRUE' : 'FALSE'];
  });
  if (filas.length) await appendRows(TABS.USUARIOS, filas);

  let actualizados = 0;
  for (const p of aActualizar) {
    const ya = porEmail.get(p.email.toLowerCase());
    // No se le quita el último Admin activo a esta app por una importación.
    const eraAdmin = String(ya.Roles || '').includes('Admin');
    if (eraAdmin && !p.roles.includes('Admin')) {
      const admins = aca.filter((u) => String(u.Roles || '').includes('Admin') && (u.Activo || '') !== 'FALSE');
      if (admins.length <= 1) continue;
    }
    await updateRow(TABS.USUARIOS, ya._rowIndex, [ya.Email, p.nombre || ya.Nombre, p.roles.join(','), ya.PasswordHash, p.activo ? 'TRUE' : 'FALSE']);
    actualizados++;
  }
  await registrarAccion(b.solicitanteEmail, admin.nombre, 'Importó usuarios desde la app de fichas', `${filas.length} nuevos · ${actualizados} actualizados${b.copiarClaves ? ' · con las mismas contraseñas' : ''}`);
  return NextResponse.json({ ok: true, agregados: filas.length, actualizados, clavesTemporales: claves });
}
