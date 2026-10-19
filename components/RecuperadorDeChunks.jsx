'use client';
import { useEffect } from 'react';

const CLAVE_RECARGA = 'ilce-recarga-por-chunk';
const CLAVE_ULTIMA_VEZ_VISIBLE = 'ilce-ultima-vez-visible';
const MINUTOS_PARA_CONSIDERAR_DORMIDA = 20;

function pareceErrorDeChunkViejo(mensaje) {
  const m = (mensaje || '').toLowerCase();
  return m.includes('chunkloaderror') || m.includes('loading chunk') ||
    m.includes('failed to fetch dynamically imported module') || m.includes('importing a module script failed');
}

// Si alguien tiene la app abierta y en el medio se sube una actualización nueva, el navegador
// puede intentar pedir un archivo de código que ya no existe en el servidor (porque cambió de nombre
// con el deploy nuevo) — eso deja la pantalla en blanco. Esto lo detecta y recarga la página una sola
// vez automáticamente, para que la persona nunca vea la pantalla blanca sin explicación.
//
// Además: si la laptop estuvo dormida/la pestaña oculta por un buen rato (20+ minutos, ej: se
// cerró la tapa y se volvió a abrir), la pestaña puede quedar en un estado viejo y roto SIN tirar
// ningún error de JavaScript — no hay nada que este componente pueda "escuchar" en ese caso, así
// que directamente se recarga sola apenas la pestaña vuelve a estar visible después de tanto tiempo.
export default function RecuperadorDeChunks() {
  useEffect(() => {
    function intentarRecargar(mensaje) {
      if (!pareceErrorDeChunkViejo(mensaje)) return;
      // Guard para no quedar en un loop infinito si el error persiste por otra razón.
      if (sessionStorage.getItem(CLAVE_RECARGA)) return;
      sessionStorage.setItem(CLAVE_RECARGA, '1');
      window.location.reload();
    }

    function onError(e) {
      intentarRecargar(e?.message || e?.error?.message);
    }
    function onRejection(e) {
      intentarRecargar(e?.reason?.message || String(e?.reason || ''));
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        localStorage.setItem(CLAVE_ULTIMA_VEZ_VISIBLE, String(Date.now()));
        return;
      }
      const ultimaVez = Number(localStorage.getItem(CLAVE_ULTIMA_VEZ_VISIBLE) || Date.now());
      const minutosDormida = (Date.now() - ultimaVez) / 60000;
      if (minutosDormida >= MINUTOS_PARA_CONSIDERAR_DORMIDA && !sessionStorage.getItem(CLAVE_RECARGA)) {
        sessionStorage.setItem(CLAVE_RECARGA, '1');
        window.location.reload();
      }
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    document.addEventListener('visibilitychange', onVisibilityChange);
    // Arranca con la marca de tiempo en cero, para no comparar contra un valor viejo que haya
    // quedado guardado de una sesión anterior (evita una recarga falsa apenas se abre la página).
    localStorage.setItem(CLAVE_ULTIMA_VEZ_VISIBLE, String(Date.now()));
    // Si la página cargó bien, se libera el guard para la próxima vez que haga falta.
    const t = setTimeout(() => sessionStorage.removeItem(CLAVE_RECARGA), 5000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(t);
    };
  }, []);

  return null;
}
