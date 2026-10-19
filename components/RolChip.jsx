'use client';
// Etiqueta de rol con color propio y consistente (el mismo en toda la app). El nombre siempre se muestra: el color no es lo único que lo identifica.
import { nombreRol, INFO_ROL } from '../lib/rolesInfo';

export function RolChip({ rol, chico, titulo }) {
  const info = INFO_ROL[rol];
  return <span className={'rol-chip r-' + rol + (chico ? ' chico' : '')} title={titulo || (info ? info.corta : '')}>{nombreRol(rol)}</span>;
}

export function RolesChips({ roles, chico }) {
  const lista = (roles || []).filter(Boolean);
  if (!lista.length) return <span className="rol-chip r-Sin chico" title="Esta persona no tiene ningún rol: no puede usar ninguna función.">Sin rol</span>;
  return <span className="rol-chips">{lista.map((r) => <RolChip key={r} rol={r} chico={chico} />)}</span>;
}
