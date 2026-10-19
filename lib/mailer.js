// Envío de mails de Preguntas frecuentes (Gmail con nodemailer, con las MISMAS variables que la app de Fichas: GMAIL_SENDER_EMAIL y GMAIL_APP_PASSWORD).
// Reglas: un mail que falla NUNCA rompe lo que la persona estaba haciendo (las funciones no tiran error), y cada intento queda anotado en la pestaña "Emails".
import nodemailer from 'nodemailer';
import { appendRow, asegurarPestana } from './sheets';
import { TABS, HEADERS } from './constants';
import { REMITENTE_NOMBRE, AVISO_VIDEOLLAMADA, RESUMEN_SEMANAL_PARA, formatoDireccion } from './mailsAutomaticos';
import { asuntoResumen, htmlResumenSemanal } from './resumenSemanal';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Todo lo que la persona escribió y va a una cabecera del mail (asunto, "responder a") se limpia: sin saltos de línea ni comillas ni < > que permitan colar otras cabeceras.
const limpiarCabecera = (s, max = 80) => String(s ?? '').replace(/[\r\n\t<>",;]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const getTransporter = () => nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_SENDER_EMAIL, pass: process.env.GMAIL_APP_PASSWORD } });
const conTope = (promesa, ms = 9000) => Promise.race([promesa, new Promise((_, rej) => setTimeout(() => rej(new Error('El envío tardó demasiado')), ms))]);

export async function registrarMail(tipo, para, cc, asunto, estado, detalle = '') {
  try {
    await asegurarPestana(TABS.EMAILS, HEADERS[TABS.EMAILS]);
    await appendRow(TABS.EMAILS, [new Date().toISOString(), tipo, para || '', cc || '', asunto || '', estado, detalle]);
  } catch (err) { console.error('[mailer] no se pudo anotar el envío:', err?.message || err); }
}

const slotTexto = (s) => {
  const d = new Date(s.fecha + 'T12:00:00');
  const dia = isNaN(d) ? s.fecha : d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${dia} · ${s.desde} a ${s.hasta}`;
};

// Arma el aviso del pedido de videollamada (sin enviarlo): quién lo recibe, con copia a quién, a quién se responde, asunto y cuerpo.
export function armarAvisoVideollamada(sol, { panelUrl = '', remitente = '' } = {}) {
  const nombre = limpiarCabecera(sol.nombre, 70) || 'Sin nombre';
  const curso = limpiarCabecera(sol.curso, 60);
  const wa = String(sol.whatsapp || '').replace(/\D/g, '');
  const fila = (k, v) => v ? `<tr><td style="padding:7px 10px;color:#666;font-size:13px;width:150px;vertical-align:top;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:7px 10px;font-size:14px;border-bottom:1px solid #eee">${v}</td></tr>` : '';
  const slots = (sol.slots || []).map((s) => `<div>${esc(slotTexto(s))}</div>`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#222">
<div style="background:linear-gradient(135deg,#1e1b4b,#7c3aed);color:#fff;padding:20px 24px;border-radius:14px 14px 0 0"><div style="font-size:12px;letter-spacing:1px;opacity:.85">INSTITUTO ILCE · PREGUNTAS FRECUENTES</div><div style="font-size:20px;font-weight:700;margin-top:2px">Pedido de videollamada</div></div>
<div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 14px 14px;padding:16px 20px">
<p style="font-size:14px;margin:0 0 12px"><b>${esc(nombre)}</b> pidió que le coordinen una videollamada${sol.publico ? ` (desde la página de ${esc(sol.publico)})` : ''}. Para responderle, tocá "Responder": el mail le llega directo.</p>
<table role="presentation" width="100%" style="border-collapse:collapse">
${fila('Email', `<a href="mailto:${esc(sol.email)}">${esc(sol.email)}</a>`)}
${fila('WhatsApp', sol.whatsapp ? (wa ? `<a href="https://wa.me/${wa}">${esc(sol.whatsapp)}</a>` : esc(sol.whatsapp)) : '')}
${fila('Curso', esc([sol.curso, sol.edicion ? `edición ${sol.edicion}` : ''].filter(Boolean).join(' · ')))}
${fila('País / zona horaria', esc([sol.pais, sol.zona].filter(Boolean).join(' · ')))}
${fila('Qué necesita', esc(sol.consulta).replace(/\n/g, '<br>'))}
${fila('Días y horarios en que puede', slots)}
</table>
${panelUrl ? `<p style="margin:18px 0 0"><a href="${esc(panelUrl)}#videollamadas" style="background:#7c3aed;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block">Ver en el panel</a></p>` : ''}
</div></div>`;
  return {
    from: `${REMITENTE_NOMBRE} <${remitente}>`,
    to: formatoDireccion(AVISO_VIDEOLLAMADA.para),
    cc: AVISO_VIDEOLLAMADA.cc.map(formatoDireccion).join(', '),
    replyTo: `${nombre} <${limpiarCabecera(sol.email, 120)}>`,
    subject: `Pedido de videollamada · ${nombre}${curso ? ` (${curso})` : ''}`,
    html
  };
}

async function enviar(tipo, mail, { transporter = null, registrar = registrarMail } = {}) {
  const remitente = process.env.GMAIL_SENDER_EMAIL;
  if (!transporter && (!remitente || !process.env.GMAIL_APP_PASSWORD)) {
    await registrar(tipo, mail.to, mail.cc, mail.subject, 'No enviado', 'Falta configurar GMAIL_SENDER_EMAIL y GMAIL_APP_PASSWORD en Vercel');
    return { ok: false, motivo: 'sin-configurar' };
  }
  try {
    await conTope((transporter || getTransporter()).sendMail(mail));
    await registrar(tipo, mail.to, mail.cc, mail.subject, 'Enviado');
    return { ok: true };
  } catch (err) {
    await registrar(tipo, mail.to, mail.cc, mail.subject, 'Falló', String(err?.message || err).slice(0, 300));
    return { ok: false, motivo: String(err?.message || err) };
  }
}

export async function enviarAvisoVideollamada(sol, { panelUrl = '', ...opts } = {}) {
  const mail = armarAvisoVideollamada(sol, { panelUrl, remitente: process.env.GMAIL_SENDER_EMAIL || 'sin-configurar' });
  return enviar('Pedido de videollamada', mail, opts);
}

export async function enviarResumenSemanal(resumen, { panelUrl = '', ...opts } = {}) {
  const mail = {
    from: `${REMITENTE_NOMBRE} <${process.env.GMAIL_SENDER_EMAIL || 'sin-configurar'}>`,
    to: RESUMEN_SEMANAL_PARA.map(formatoDireccion).join(', '),
    subject: asuntoResumen(resumen),
    html: htmlResumenSemanal(resumen, { panelUrl })
  };
  return enviar('Resumen semanal', mail, opts);
}
