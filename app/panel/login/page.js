'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../lib/useSession';
import ThemeSelector from '../../../components/ThemeSelector';
import { Isologo, IsologoDefs } from '../../../components/Isologo';

export default function LoginPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useSession();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo iniciar sesión'); return; }
      login({ ...data.usuario, token: data.token || undefined }, mantenerSesion);
      router.push('/panel');
    } catch (err) {
      setError('Error de conexión. Probá de nuevo.');
    } finally { setCargando(false); }
  }

  return (
    <div className="flex justify-center pt-24 px-6">
      <IsologoDefs />
      <div className="fixed top-4 right-4"><ThemeSelector /></div>
      <div className="w-80 bg-surface2 border border-border rounded-2xl p-7">
        <div className="flex justify-center mb-3"><Isologo size={44} /></div>
        <h1 className="text-center font-display text-lg font-bold text-text leading-tight">Preguntas frecuentes</h1>
        <p className="text-center text-textSec text-[13px] mb-5 mt-0.5">Ingresá con tu usuario y contraseña del equipo</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email" className="text-[13px] font-semibold text-textSec block mb-1">Email</label>
          <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@institutoilce.com"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm mb-3" />
          <label htmlFor="login-password" className="text-[13px] font-semibold text-textSec block mb-1">Contraseña</label>
          <div className="relative mb-3">
            <input id="login-password" type={verPassword ? 'text' : 'password'} required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 pr-9 text-sm" />
            <button type="button" onClick={() => setVerPassword(!verPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-textMuted hover:text-text"
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={verPassword ? 'Ocultar' : 'Mostrar'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {verPassword
                  ? <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61M2 2l20 20" />
                  : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>}
              </svg>
            </button>
          </div>
          {error && <p role="alert" className="text-warningText text-[13px] mb-3">{error}</p>}
          <label className="flex items-center gap-2 text-[13px] text-textSec mb-4 cursor-pointer">
            <input type="checkbox" className="accent-accentMagenta w-4 h-4" checked={mantenerSesion} onChange={(e) => setMantenerSesion(e.target.checked)} />
            Mantener sesión abierta
          </label>
          <button type="submit" disabled={cargando}
            className="w-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-60">
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="text-textMuted text-[13px] text-center mt-3">
          ¿No tenés contraseña todavía? Pedísela a un administrador.
        </p>
      </div>
    </div>
  );
}
