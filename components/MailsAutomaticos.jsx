'use client';
// Pestaña Accesos: qué mails manda esta app, a quién y cuándo, más el registro de lo que realmente se envió (y si falló). Mismo criterio que "Mails automáticos" de Fichas.
import { useEffect, useState } from 'react';
import { MAILS_AUTOMATICOS } from '../lib/mailsAutomaticos';

const fmt = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }).replace(',', ''); };
// Las celdas de estas tablas parten línea (si no, la primera columna se estiraba y las demás quedaban escondidas a la derecha).
const parte = { whiteSpace: 'normal', overflowWrap: 'break-word' };
const colorEstado = (e) => (e === 'Enviado' ? 'rgb(var(--good))' : 'rgb(var(--bad))');

export default function MailsAutomaticos({ usuario }) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {
    let vivo = true; setError('');
    fetch('/api/emails?solicitanteEmail=' + encodeURIComponent(usuario.email)).then((r) => r.json().then((j) => ({ r, j })))
      .then(({ r, j }) => { if (!vivo) return; if (!r.ok || !j.ok) { setError(j.error || 'No se pudo leer el registro.'); setFilas([]); } else setFilas(j.filas); })
      .catch(() => { if (vivo) { setError('No se pudo conectar para leer el registro.'); setFilas([]); } });
    return () => { vivo = false; };
  }, [usuario.email, recarga]);
  return (
    <div data-seccion="mails-automaticos">
      <div className="faqa-card" style={{ marginTop: 18 }}>
        <div className="faqa-card-h"><div><h3>Mails automáticos</h3><p>Los mails que manda esta app por su cuenta. Lo que ves acá es exactamente lo que se envía.</p></div></div>
        <div className="tablewrap"><table className="faqa-tabla">
          <thead><tr><th>Cuándo se envía</th><th>A quién</th><th>Con copia a</th><th>Desde</th><th>Asunto</th></tr></thead>
          <tbody>{MAILS_AUTOMATICOS.map((m) => (
            <tr key={m.tipo} data-mail={m.tipo}>
              <td style={{ ...parte, minWidth: 200, width: '26%' }}><b>{m.tipo}</b><div style={{ color: 'rgb(var(--textSec))', fontSize: 12.5, marginTop: 2 }}>{m.cuando}</div><div style={{ color: 'rgb(var(--textMuted))', fontSize: 12, marginTop: 4 }}>{m.contenido}</div></td>
              <td style={{ ...parte, minWidth: 250 }}>{m.para}</td><td style={{ ...parte, minWidth: 215 }}>{m.cc || '—'}</td><td style={{ ...parte, minWidth: 100 }}>{m.remitente}</td><td style={{ ...parte, minWidth: 130 }}>{m.asunto}</td>
            </tr>))}</tbody>
        </table></div>
      </div>
      <div className="faqa-card">
        <div className="faqa-card-h"><div><h3>Registro de envíos</h3><p>Los últimos mails que se mandaron y si salieron o fallaron.</p></div><button className="btn-sm" onClick={() => { setFilas(null); setRecarga((n) => n + 1); }} data-accion="actualizar-registro">Actualizar</button></div>
        {error && <div className="note" style={{ borderLeftColor: 'rgb(var(--bad))' }} role="alert">{error}</div>}
        {filas === null ? <div className="spin" /> : filas.length === 0 && !error ? <p style={{ color: 'rgb(var(--textMuted))', fontSize: 14 }}>Todavía no se envió ningún mail.</p> : (
          <div className="tablewrap"><table className="faqa-tabla" data-registro>
            <thead><tr><th>Fecha</th><th>Mail</th><th>Estado</th><th>Para</th><th>Asunto</th></tr></thead>
            <tbody>{filas.map((f, i) => (
              <tr key={i}><td style={{ whiteSpace: 'nowrap' }}>{fmt(f.fecha)}</td><td style={{ ...parte, minWidth: 120 }}>{f.tipo}</td>
                <td style={{ ...parte, minWidth: 110 }}><b style={{ color: colorEstado(f.estado) }}>{f.estado}</b>{f.detalle ? <div style={{ color: 'rgb(var(--textMuted))', fontSize: 12 }}>{f.detalle}</div> : null}</td>
                <td style={{ ...parte, minWidth: 270 }}>{f.para}{f.cc ? <div style={{ color: 'rgb(var(--textMuted))', fontSize: 12 }}>cc: {f.cc}</div> : null}</td><td style={{ ...parte, minWidth: 190 }}>{f.asunto}</td></tr>))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
