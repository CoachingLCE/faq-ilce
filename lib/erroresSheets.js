// Traduce un error técnico al hablar con Google Sheets en una causa entendible + qué hacer.
// Se usa donde antes cualquier falla terminaba en el mismo cartel genérico de "no respondió a
// tiempo", aunque la causa real fuera otra (credenciales, permisos, cuota, pestaña inexistente).
// No devuelve el texto crudo del error (puede traer IDs o emails internos): ese queda solo en
// los Logs de Vercel (ver console.error en quien lo llame).
export function clasificarErrorSheets(err) {
  const msg = String(err?.message || err || '');
  const estado = Number(err?.code || err?.status || err?.response?.status || 0);

  if (/Timeout autenticando/i.test(msg)) {
    return { tipo: 'autenticacion-lenta', mensaje: 'Google tardó demasiado en validar la conexión de la aplicación. Probá de nuevo en un minuto; si sigue igual, revisá los Logs en Vercel (/api/auth/login).' };
  }
  if (/Timeout/i.test(msg)) {
    return { tipo: 'timeout', mensaje: 'No se pudo conectar con la base de datos (Google Sheets no respondió a tiempo). Probá de nuevo en un minuto.' };
  }
  if (estado === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED|too many requests/i.test(msg)) {
    return { tipo: 'cuota', mensaje: 'Google Sheets llegó al límite de lecturas por minuto (hay mucho movimiento a la vez). Esperá 1 o 2 minutos y probá de nuevo.' };
  }
  if (/invalid_grant|invalid_client|unauthorized_client|invalid jwt|DECODER|PEM|private key|no key|could not load the default credentials|client_email/i.test(msg) || estado === 401) {
    return { tipo: 'credenciales', mensaje: 'Falla en las credenciales de Google de la aplicación (cuenta de servicio). Si se cambiaron variables de entorno en Vercel, hace falta un Redeploy para que apliquen.' };
  }
  if (estado === 403 || /does not have permission|permission denied|insufficient/i.test(msg)) {
    return { tipo: 'permiso', mensaje: 'La cuenta de servicio no tiene acceso a la planilla. Verificá que el Sheet siga compartido con ella como editora.' };
  }
  if (estado === 404 || /requested entity was not found|unable to parse range|not found/i.test(msg)) {
    return { tipo: 'no-encontrada', mensaje: 'No se encuentra la planilla o la pestaña "Usuarios". Revisá que el ID de la planilla sea el correcto y que la pestaña no haya cambiado de nombre.' };
  }
  if (/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|socket hang up|network/i.test(msg)) {
    return { tipo: 'red', mensaje: 'Falló la conexión de red con Google. Probá de nuevo en un minuto.' };
  }
  return { tipo: 'desconocido', mensaje: 'No se pudo leer la base de datos por un error inesperado. Revisá los Logs en Vercel (/api/auth/login) para ver el detalle.' };
}
