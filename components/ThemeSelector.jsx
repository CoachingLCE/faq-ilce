'use client';
import { useTheme } from '../lib/ThemeContext';

const OPCIONES = [
  { valor: 'claro', icono: '', titulo: 'Modo claro' },
  { valor: 'oscuro', icono: '', titulo: 'Modo oscuro' },
  { valor: 'auto', icono: '', titulo: 'Automático (según la hora)' }
];

export default function ThemeSelector() {
  const { preferencia, cambiarPreferencia } = useTheme();
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgb(var(--surface2))', border: '1px solid rgb(var(--border))', borderRadius: 10, padding: 2 }}>
      {OPCIONES.map((o) => (
        <button key={o.valor} type="button" title={o.titulo} onClick={() => cambiarPreferencia(o.valor)}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, fontSize: 13, border: 0, cursor: 'pointer',
            background: preferencia === o.valor ? 'linear-gradient(135deg,rgb(var(--accentPurple)),rgb(var(--accentMagenta)))' : 'transparent'
          }}>
          {o.icono}
        </button>
      ))}
    </div>
  );
}
