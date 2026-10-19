'use client';
import { useEffect } from 'react';

// En celular, las tablas con encabezados se muestran como una tarjeta por fila: cada dato lleva al
// lado el nombre de su columna. Así no hay que desplazar de costado para ver las columnas de la
// derecha. En pantallas grandes no se hace nada: las tablas quedan exactamente como estaban.
//
// Este componente solo agrega atributos (data-label / data-titulo) y una clase; el aspecto de
// tarjeta lo da el CSS (ver "tabla-en-tarjetas" en globals.css). Una tabla puede excluirse
// agregándole el atributo data-sin-tarjetas.
const ANCHO_MAX_CELULAR = 640;
// Más de 8 columnas dan tarjetas demasiado altas (10 líneas) para recorrer una lista larga: esas tablas
// quedan como tabla que se desplaza de costado.
const MAX_COLUMNAS = 8;

function limpiar(txt) {
  return (txt || '').replace(/[▲▼↑↓↕⇅]/g, '').replace(/\s+/g, ' ').trim();
}

function prepararTabla(t) {
  if (t.hasAttribute('data-sin-tarjetas')) return;
  const ths = [...t.querySelectorAll(':scope > thead th')];
  if (ths.length < 2 || ths.length > MAX_COLUMNAS) return;
  const etiquetas = ths.map((th) => limpiar(th.textContent));
  if (etiquetas.filter(Boolean).length < ths.length - 1) return; // casi todas con texto
  t.classList.add('tabla-en-tarjetas');
  // El título de la tarjeta es la primera columna, salvo que sea una fecha.
  const tituloIdx = /^(fecha|cu[aá]ndo)/i.test(etiquetas[0]) ? 1 : 0;
  t.querySelectorAll(':scope > tbody > tr').forEach((tr) => {
    const tds = [...tr.children].filter((n) => n.tagName === 'TD');
    if (tds.length !== ths.length || tds.some((td) => td.colSpan > 1)) return; // fila especial (vacía, detalle)
    tds.forEach((td, i) => {
      if (etiquetas[i] && td.getAttribute('data-label') !== etiquetas[i]) td.setAttribute('data-label', etiquetas[i]);
      if (i === tituloIdx && !td.hasAttribute('data-titulo')) td.setAttribute('data-titulo', '');
    });
  });
}

export default function TablasEnTarjetas() {
  useEffect(() => {
    let timer = null;
    const aplicar = () => {
      if (window.innerWidth > ANCHO_MAX_CELULAR) return;
      document.querySelectorAll('table').forEach(prepararTabla);
    };
    const programar = () => { clearTimeout(timer); timer = setTimeout(aplicar, 80); };
    aplicar();
    const mo = new MutationObserver(programar);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', programar);
    return () => { mo.disconnect(); window.removeEventListener('resize', programar); clearTimeout(timer); };
  }, []);
  return null;
}
