'use client';
import { useEffect, useRef, useState } from 'react';
import { actualizarSesionGuardada } from '../lib/useSession';

// Cuadro para elegir una contraseña propia. Dos usos:
//  · obligatorio: la persona entró con una contraseña genérica ("Hola123") o temporal (alta o restablecimiento). No se puede cerrar ni saltear: o la cambia o sale.
//  · voluntario: "Cambiar contraseña" en el menú.
// Antes no existía forma de cambiarla: solo la fijaba un Admin. El servidor es quien valida (aquí se repiten las reglas para avisar enseguida).
// Las mismas claves comunes que rechaza el servidor (lib/passwords.js): así el aviso es inmediato.
const COMUNES = ['hola123', '12345678', '123456789', '1234567890', 'password', 'password1', 'contraseña1', 'contrasena1', 'qwerty123', 'ilce1234', 'ilce2026', 'hola1234', 'hola12345', 'abc12345', 'iloveyou1'];
const MSG_NO_COINCIDE = 'La contraseña nueva no coincide. Volvé a introducirla.';
function revisar(nueva, repetida, email) {
  if (nueva !== repetida) return MSG_NO_COINCIDE;
  if (nueva.length < 8) return 'La contraseña nueva tiene que tener al menos 8 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(nueva) || !/\d/.test(nueva)) return 'La contraseña nueva tiene que incluir al menos una letra y un número.';
  if (COMUNES.includes(nueva.toLowerCase())) return 'Esa contraseña es demasiado común. Elegí otra.';
  if (email && nueva.toLowerCase() === String(email).toLowerCase()) return 'La contraseña no puede ser igual a tu email.';
  return '';
}

export default function CambiarPassword({ usuario, obligatorio = false, onCerrar, onSalir }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [repetidaTocada, setRepetidaTocada] = useState(false); // el aviso de "no coincide" aparece al salir del campo, no mientras se escribe
  const primero = useRef(null);
  useEffect(() => { const t = setTimeout(() => primero.current && primero.current.focus(), 60); return () => clearTimeout(t); }, []);
  // Voluntario: Esc lo cierra. Obligatorio: no hace nada.
  useEffect(() => {
    if (obligatorio) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [obligatorio, onCerrar]);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    const problema = revisar(nueva, repetida, usuario.email);
    if (problema) { setError(problema); return; }
    setGuardando(true);
    try {
      const res = await fetch('/api/auth/cambiar-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: usuario.email, actual, nueva }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'No se pudo cambiar la contraseña. Probá de nuevo.'); return; }
      // Token nuevo (sin la marca de "debe cambiarla") y a recargar para que toda la app lo tome.
      actualizarSesionGuardada({ debeCambiar: false, ...(data.token ? { token: data.token } : {}) });
      window.location.reload();
    } catch (err) {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  const noCoincide = repetidaTocada && repetida.length > 0 && nueva !== repetida;
  const tipo = ver ? 'text' : 'password';
  const campo = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3';
  const etiqueta = 'text-[13px] font-semibold text-textSec block mb-1';
  return (
    // Voluntario: se cierra con el fondo o con Esc. Obligatorio: ni el fondo ni Esc hacen nada.
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[95] px-4" onClick={(e) => { if (!obligatorio && e.target === e.currentTarget) onCerrar(); }}>
      <form onSubmit={guardar} className="w-full max-w-sm bg-surface2 border border-border rounded-2xl p-6 max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="cp-titulo">
        <h2 id="cp-titulo" className="text-lg font-bold text-text leading-tight">{obligatorio ? 'Elegí tu contraseña' : 'Cambiar mi contraseña'}</h2>
        <p className="text-textSec text-[13px] mt-1 mb-4">
          {obligatorio
            ? 'Entraste con una contraseña temporal. Para seguir, elegí una propia: desde ahora solo vos la vas a conocer.'
            : 'Elegí una contraseña nueva. Mínimo 8 caracteres, con letras y números.'}
        </p>
        <label htmlFor="cp-actual" className={etiqueta}>{obligatorio ? 'Contraseña temporal (la del mail)' : 'Contraseña actual'}</label>
        <input id="cp-actual" ref={primero} type={tipo} autoComplete="current-password" required value={actual} onChange={(e) => setActual(e.target.value)} className={campo} />
        <label htmlFor="cp-nueva" className={etiqueta}>Contraseña nueva</label>
        <input id="cp-nueva" type={tipo} autoComplete="new-password" required value={nueva} onChange={(e) => setNueva(e.target.value)} className={campo} />
        <label htmlFor="cp-repetida" className={etiqueta}>Repetí la contraseña nueva</label>
        <input id="cp-repetida" type={tipo} autoComplete="new-password" required value={repetida} onChange={(e) => { setRepetida(e.target.value); if (error === MSG_NO_COINCIDE) setError(''); }} onBlur={() => setRepetidaTocada(true)} aria-invalid={noCoincide} aria-describedby={noCoincide ? 'cp-nocoincide' : undefined} className={campo} style={noCoincide ? { borderColor: 'rgb(248 113 113)' } : undefined} />
        {noCoincide && <p id="cp-nocoincide" role="alert" className="text-[13px] -mt-2 mb-3" style={{ color: 'rgb(248 113 113)' }}>{MSG_NO_COINCIDE}</p>}
        <label className="flex items-center gap-2 text-[13px] text-textSec mb-3 cursor-pointer"><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar las contraseñas</label>
        {error && !(noCoincide && error === MSG_NO_COINCIDE) && <p role="alert" className="text-[13px] mb-3" style={{ color: 'rgb(248 113 113)' }}>{error}</p>}
        <div className="flex gap-2 items-center">
          <button type="submit" disabled={guardando} className="flex-1 bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60">{guardando ? 'Guardando…' : 'Guardar contraseña'}</button>
          {!obligatorio && <button type="button" onClick={onCerrar} className="bg-surface2 border border-border rounded-lg py-2.5 px-4 text-sm">Cancelar</button>}
        </div>
        {obligatorio && onSalir && <button type="button" onClick={onSalir} className="text-[12px] text-textMuted underline mt-3">Salir</button>}
      </form>
    </div>
  );
}
