// Limitador de ritmo para las rutas PÚBLICAS (inscripción, formularios, actividades): evita que alguien las use en bucle para llenar la planilla,
// mandar mails a direcciones ajenas o agotar la cuota de Google (que ya se agotó una vez, el 03/10/2026, con un mail masivo, y nadie pudo entrar).
//
// Ventana deslizante en MEMORIA de cada instancia del servidor. Es una primera barrera honesta, no una garantía: en Vercel puede haber varias
// instancias a la vez, cada una con su propio contador, y se reinicia al "enfriarse". Frena el uso en bucle desde una misma conexión, que es
// lo habitual; para algo más fuerte hace falta un almacenamiento compartido (por ejemplo Upstash Redis).
export function crearLimitador(maxClaves = 5000) {
  const porClave = new Map(); // clave -> [marcas de tiempo (ms)]
  function purgar(ahora, ventanaMs) {
    if (porClave.size <= maxClaves) return;
    for (const [k, marcas] of porClave) {
      if (!marcas.length || ahora - marcas[marcas.length - 1] > ventanaMs) porClave.delete(k);
    }
  }
  return {
    /** Devuelve { permitido, reintentarEnSeg }. Si está permitido, REGISTRA este intento. */
    intentar(clave, max, ventanaMs, ahora = Date.now()) {
      const marcas = (porClave.get(clave) || []).filter((t) => ahora - t < ventanaMs);
      if (marcas.length >= max) {
        porClave.set(clave, marcas);
        return { permitido: false, reintentarEnSeg: Math.max(1, Math.ceil((ventanaMs - (ahora - marcas[0])) / 1000)) };
      }
      marcas.push(ahora);
      porClave.set(clave, marcas);
      purgar(ahora, ventanaMs);
      return { permitido: true, reintentarEnSeg: 0 };
    },
    _tamanio() { return porClave.size; }
  };
}

export const limitador = crearLimitador();

/** IP de quien llama: Vercel manda la real como primer valor de x-forwarded-for. */
export function ipDe(req) {
  const h = req && req.headers && req.headers.get ? req.headers : { get: () => null };
  const xf = h.get('x-forwarded-for') || '';
  return (xf.split(',')[0] || h.get('x-real-ip') || 'sin-ip').trim() || 'sin-ip';
}

export const MIN10 = 10 * 60 * 1000;
