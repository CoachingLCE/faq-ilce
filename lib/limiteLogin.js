// Límite de intentos FALLIDOS de login (revisión de seguridad de octubre de 2026): antes se podían probar contraseñas sin ningún freno.
//
// Se cuentan solo los fallos (contraseña incorrecta o email que no existe), en una ventana deslizante de 15 minutos, con tres límites a la vez:
//  - por CUENTA desde una misma CONEXIÓN: 5 fallos  -> frena a quien prueba contraseñas de una cuenta desde su casa u oficina;
//  - por CUENTA desde cualquier conexión: 25 fallos -> frena el ataque repartido entre muchas conexiones (a costa de que, con ese volumen,
//                                                      la persona real también tenga que esperar unos minutos);
//  - por CONEXIÓN con cualquier cuenta: 30 fallos    -> frena a quien prueba muchas cuentas a ver cuáles existen.
// Un login correcto borra el contador de esa cuenta en esa conexión. Si está bloqueado, se rechaza ANTES de leer la planilla de usuarios:
// así los intentos bloqueados no gastan la cuota de Google (que ya se agotó una vez) ni llenan el historial de acciones.
//
// Contadores en MEMORIA de cada instancia del servidor: frena el uso en bucle desde una misma conexión (lo habitual), pero no es una garantía
// absoluta (en Vercel puede haber varias instancias, cada una con su propio contador, y se reinician al "enfriarse"). Para algo más fuerte hace
// falta un almacenamiento compartido (por ejemplo Upstash Redis).
export function crearLimiteLogin(opc = {}) {
  const ventanaMs = opc.ventanaMs ?? 15 * 60 * 1000;
  const maxCuentaIp = opc.maxCuentaIp ?? 5;
  const maxCuenta = opc.maxCuenta ?? 25;
  const maxIp = opc.maxIp ?? 30;
  const maxClaves = opc.maxClaves ?? 5000;
  const cuentaIp = new Map();
  const cuenta = new Map();
  const ip = new Map();

  function vigentes(mapa, clave, ahora) {
    const v = (mapa.get(clave) || []).filter((t) => ahora - t < ventanaMs);
    if (v.length) mapa.set(clave, v); else mapa.delete(clave);
    return v;
  }
  // Segundos hasta que el fallo más viejo "estorbe" menos: cuando el contador baje de `max`.
  function espera(v, max, ahora) {
    return v.length >= max ? Math.max(1, Math.ceil((ventanaMs - (ahora - v[v.length - max])) / 1000)) : 0;
  }
  function purgar(ahora) {
    [cuentaIp, cuenta, ip].forEach((m) => {
      if (m.size <= maxClaves) return;
      for (const k of [...m.keys()]) vigentes(m, k, ahora);          // 1.º se tiran los vencidos
      while (m.size > maxClaves) m.delete(m.keys().next().value);      // 2.º si igual sobran, se tiran los más viejos (tope de memoria)
    });
  }
  const kCI = (email, ipc) => email + '|' + ipc;

  return {
    /** ¿Está bloqueado este intento? No registra nada. */
    verificar(email, ipc, ahora = Date.now()) {
      const seg = Math.max(
        espera(vigentes(cuentaIp, kCI(email, ipc), ahora), maxCuentaIp, ahora),
        espera(vigentes(cuenta, email, ahora), maxCuenta, ahora),
        espera(vigentes(ip, ipc, ahora), maxIp, ahora)
      );
      return { bloqueado: seg > 0, reintentarEnSeg: seg };
    },
    registrarFallo(email, ipc, ahora = Date.now()) {
      [[cuentaIp, kCI(email, ipc)], [cuenta, email], [ip, ipc]].forEach(([m, k]) => { const v = vigentes(m, k, ahora); v.push(ahora); m.set(k, v); });
      purgar(ahora);
    },
    /** Un login correcto borra el contador de esa cuenta en esa conexión (no los demás, para no "lavar" un ataque repartido). */
    registrarExito(email, ipc) { cuentaIp.delete(kCI(email, ipc)); },
    _tamanio() { return { cuentaIp: cuentaIp.size, cuenta: cuenta.size, ip: ip.size }; }
  };
}

export const limiteLogin = crearLimiteLogin();

/** Normaliza el email para usarlo como clave (minúsculas, sin espacios). */
export function claveEmail(email) { return String(email || '').trim().toLowerCase().slice(0, 254); }

/** IP de quien llama: Vercel manda la real como primer valor de x-forwarded-for. */
export function ipDe(request) {
  const h = request && request.headers && request.headers.get ? request.headers : { get: () => null };
  return ((h.get('x-forwarded-for') || '').split(',')[0] || h.get('x-real-ip') || 'sin-ip').trim() || 'sin-ip';
}

export function mensajeBloqueo(seg) {
  const min = Math.max(1, Math.ceil(seg / 60));
  return `Demasiados intentos fallidos. Esperá ${min} minuto${min === 1 ? '' : 's'} y probá de nuevo.`;
}

/** Pausa corta tras cada fallo: encarece probar contraseñas una atrás de otra. */
export function demoraTrasFallo(ms = 500) { return new Promise((r) => setTimeout(r, ms)); }
