import { NextResponse } from 'next/server';
import { findUsuario, usuarioDeSolicitud } from '../../../lib/auth';
import { readSheet, appendRow, updateRow } from '../../../lib/sheets';
import { decryptPassword, hashPassword, generarTemporal, estadoPassword } from '../../../lib/passwords';
import { registrarAccion } from '../../../lib/auditoria';
import { PASSWORD_GENERICA, TABS } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

// Quién pide: la persona del token (o, en la etapa de transición, la del email declarado). Solo Admin.
async function esAdmin(request, email) {
  const u = await usuarioDeSolicitud(request, email);
  return u && u.roles.includes('Admin') ? u : null;
}

// GET /api/usuarios?list=true&solicitanteEmail=...  -> lista con contraseña visible (solo Admin)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('list') !== 'true') return NextResponse.json({ error: 'Parámetro inválido' }, { status: 400 });
  const admin = await esAdmin(request, searchParams.get('solicitanteEmail'));
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const usuarios = await readSheet(TABS.USUARIOS);
  return NextResponse.json({
    usuarios: usuarios.map((u) => ({
      Email: u.Email, Nombre: u.Nombre, Roles: u.Roles,
      Activo: (u.Activo || '') !== 'FALSE' && (u.Activo || '').toLowerCase() !== 'no',
      // Solo las contraseñas que todavía están en el formato reversible anterior se pueden mostrar; las ya protegidas (de una sola vía) no se pueden recuperar.
      passwordActual: estadoPassword(u.PasswordHash) === 'legacy' ? decryptPassword(u.PasswordHash) : null,
      estadoPassword: estadoPassword(u.PasswordHash)
    }))
  });
}

// POST -> alta de usuario. body: { solicitanteEmail, nuevoEmail, nombre, roles:[], password? }
export async function POST(request) {
  const body = await request.json();
  const admin = await esAdmin(request, body.solicitanteEmail);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const yaExiste = await findUsuario(body.nuevoEmail);
  if (yaExiste) return NextResponse.json({ error: 'Ese email ya existe' }, { status: 409 });

  // Sin contraseña elegida se genera una clave TEMPORAL aleatoria (ya no "Hola123"). Toda contraseña fijada por un Admin es temporal: la persona la cambia al ingresar.
  const password = (body.password || '').trim() || generarTemporal();
  await appendRow(TABS.USUARIOS, [body.nuevoEmail, body.nombre, (body.roles || []).join(','), hashPassword(password, { temporal: true }), 'TRUE']);

  await registrarAccion(body.solicitanteEmail, admin.nombre, 'Dio de alta un usuario', `${body.nombre} (${body.nuevoEmail}) — ${(body.roles || []).join(', ')}`);
  // Esta app no manda mails: el Admin ve la clave temporal una sola vez y se la pasa a la persona (la cambia al ingresar).
  return NextResponse.json({ ok: true, claveTemporal: password });
}

// PATCH -> editar. body: { solicitanteEmail, targetEmail, nuevaPassword?, nuevosRoles?, activo? }
export async function PATCH(request) {
  const body = await request.json();
  const admin = await esAdmin(request, body.solicitanteEmail);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const usuarios = await readSheet(TABS.USUARIOS, { noCache: true });
  const target = usuarios.find((u) => (u.Email || '').toLowerCase() === (body.targetEmail || '').toLowerCase());
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  // Proteger al último Admin
  const tocaQuitarAdmin =
    (body.nuevosRoles !== undefined && !body.nuevosRoles.includes('Admin') && (target.Roles || '').includes('Admin')) ||
    (body.activo === false && (target.Roles || '').includes('Admin'));
  if (tocaQuitarAdmin) {
    const admins = usuarios.filter((u) => (u.Roles || '').includes('Admin') && (u.Activo || '') !== 'FALSE');
    if (admins.length <= 1) return NextResponse.json({ error: 'No se puede desactivar/sacarle el rol al último administrador.' }, { status: 400 });
  }

  let passwordFinal = target.PasswordHash;
  let claveTemporal = null;
  if (body.nuevaPassword !== undefined) {
    const nueva = (body.nuevaPassword || '').trim() || generarTemporal();
    passwordFinal = hashPassword(nueva, { temporal: true });
    claveTemporal = nueva;
  }
  const rolesFinal = body.nuevosRoles !== undefined ? body.nuevosRoles.join(',') : target.Roles;
  const activoFinal = body.activo !== undefined ? (body.activo ? 'TRUE' : 'FALSE') : ((target.Activo || '') !== 'FALSE' ? 'TRUE' : 'FALSE');

  await updateRow(TABS.USUARIOS, target._rowIndex, [target.Email, target.Nombre, rolesFinal, passwordFinal, activoFinal]);

  const cambios = [];
  if (body.nuevaPassword !== undefined) cambios.push('Restableció contraseña');
  if (body.nuevosRoles !== undefined) cambios.push(`Cambió roles a: ${rolesFinal}`);
  if (body.activo !== undefined) cambios.push(body.activo ? 'Reactivó el usuario' : 'Desactivó el usuario');
  await registrarAccion(body.solicitanteEmail, admin.nombre, cambios.join(' · ') || 'Editó un usuario', `${target.Nombre} (${target.Email})`);

  return NextResponse.json({ ok: true, claveTemporal });
}

// DELETE -> borrar (marca fila vacía). body: { solicitanteEmail, targetEmail }
export async function DELETE(request) {
  const body = await request.json();
  const admin = await esAdmin(request, body.solicitanteEmail);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const usuarios = await readSheet(TABS.USUARIOS, { noCache: true });
  const target = usuarios.find((u) => (u.Email || '').toLowerCase() === (body.targetEmail || '').toLowerCase());
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

  if ((target.Roles || '').includes('Admin')) {
    const admins = usuarios.filter((u) => (u.Roles || '').includes('Admin'));
    if (admins.length <= 1) return NextResponse.json({ error: 'No se puede eliminar al último administrador.' }, { status: 400 });
  }
  // Sin deleteRows en este proyecto: vaciamos la fila (queda ignorada por findUsuario).
  await updateRow(TABS.USUARIOS, target._rowIndex, ['', '', '', '', 'FALSE']);
  await registrarAccion(body.solicitanteEmail, admin.nombre, 'Eliminó un usuario', `${target.Nombre} (${target.Email})`);
  return NextResponse.json({ ok: true });
}
