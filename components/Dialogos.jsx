'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Reemplaza los confirm() y alert() nativos del navegador por un cuadro y avisos de la app:
// respetan el tema claro/oscuro, se cierran con Esc y no rompen el diseño.
//
//   const { confirmar, avisar } = useDialogos();
//   if (!(await confirmar({ titulo, mensaje, textoConfirmar, peligro: true }))) return;
//   avisar('Enlace copiado');            // o avisar('Algo falló', 'error')

const Ctx = createContext(null);

// Si por algún motivo no hay proveedor, se vuelve al cuadro del navegador en vez de romper.
const RESPALDO = {
  confirmar: async (o) => window.confirm(typeof o === 'string' ? o : (o && o.mensaje) || ''),
  avisar: (m) => window.alert(m)
};

export function useDialogos() {
  return useContext(Ctx) || RESPALDO;
}

export function DialogosProvider({ children }) {
  const [dialogo, setDialogo] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const dialogoRef = useRef(null);
  const idRef = useRef(0);
  const cancelarRef = useRef(null);
  const confirmarRef = useRef(null);

  const cerrar = useCallback((valor) => {
    const d = dialogoRef.current;
    if (!d) return;
    dialogoRef.current = null;
    setDialogo(null);
    d.resolver(valor);
  }, []);

  const confirmar = useCallback((opciones) => new Promise((resolve) => {
    if (dialogoRef.current) { dialogoRef.current.resolver(false); } // si había uno abierto, se cancela
    const o = typeof opciones === 'string' ? { mensaje: opciones } : (opciones || {});
    const d = { ...o, resolver: resolve };
    dialogoRef.current = d;
    setDialogo(d);
  }), []);

  const avisar = useCallback((mensaje, tipo = 'ok') => {
    const id = ++idRef.current;
    setAvisos((a) => [...a.slice(-2), { id, mensaje, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500);
  }, []);

  // Esc cancela; el foco arranca en "Cancelar" (la opción segura) y Tab no se escapa del cuadro.
  useEffect(() => {
    if (!dialogo) return undefined;
    const previo = document.activeElement;
    setTimeout(() => cancelarRef.current && cancelarRef.current.focus(), 0);
    function teclas(e) {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(false); return; }
      if (e.key === 'Tab') {
        const a = cancelarRef.current, b = confirmarRef.current;
        if (!a || !b) return;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    }
    document.addEventListener('keydown', teclas);
    return () => { document.removeEventListener('keydown', teclas); if (previo && previo.focus) previo.focus(); };
  }, [dialogo, cerrar]);

  const valor = useMemo(() => ({ confirmar, avisar }), [confirmar, avisar]);
  const parrafos = dialogo ? String(dialogo.mensaje || '').split('\n\n').filter(Boolean) : [];

  return (
    <Ctx.Provider value={valor}>
      {children}

      {dialogo && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) cerrar(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(1,35,63,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogo-titulo"
            style={{ width: '100%', maxWidth: 440, background: 'rgb(var(--surface))', color: 'rgb(var(--text))', border: '1px solid rgb(var(--border))', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,.45)', padding: 24 }}
          >
            <h2 id="dialogo-titulo" style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 700, fontFamily: "'Dosis', system-ui, sans-serif" }}>
              {dialogo.titulo || 'Confirmar'}
            </h2>
            <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
              {parrafos.map((p, i) => (
                <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'rgb(var(--textSec))', whiteSpace: 'pre-line' }}>{p}</p>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button
                ref={cancelarRef}
                type="button"
                onClick={() => cerrar(false)}
                style={{ height: 40, padding: '0 18px', borderRadius: 999, border: '1px solid rgb(var(--border))', background: 'transparent', color: 'rgb(var(--text))', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {dialogo.textoCancelar || 'Cancelar'}
              </button>
              <button
                ref={confirmarRef}
                type="button"
                onClick={() => cerrar(true)}
                style={{
                  height: 40, padding: '0 20px', borderRadius: 999, border: 0, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  ...(dialogo.peligro
                    ? { background: 'rgb(var(--bad))', color: 'rgb(var(--bg))' }
                    : { background: 'linear-gradient(90deg, rgb(var(--accentPurple)), rgb(var(--accentMagenta)))', color: '#fff' })
                }}
              >
                {dialogo.textoConfirmar || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 310, display: 'grid', gap: 8, width: 'min(92vw, 420px)', pointerEvents: 'none' }}>
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            style={{
              pointerEvents: 'auto', background: 'rgb(var(--surface))', color: 'rgb(var(--text))', border: '1px solid rgb(var(--border))',
              borderLeft: `4px solid ${a.tipo === 'error' ? 'rgb(var(--bad))' : 'rgb(var(--good))'}`,
              borderRadius: 12, padding: '12px 14px', fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.35)'
            }}
          >
            {a.mensaje}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
