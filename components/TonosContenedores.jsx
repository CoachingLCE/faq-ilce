'use client';
import { useEffect } from 'react';

// Cuando hay varios contenedores iguales uno al lado del otro (tarjetas de números, resúmenes, tarjetas
// de permisos, etc.) les da un fondo apenas distinto para que se diferencien: tres tonos que se repiten,
// pero nunca dos iguales pegados, ni al costado ni uno abajo del otro (tono = (columna + fila) mod 3).
// Solo agrega el atributo data-tono; los colores los define el CSS ("Tonos entre contenedores" en
// globals.css). No toca datos ni la estructura de nada.
const GRILLAS = [
  '.kpis', '.repx-kpis', '.evol-kpis', '.repx-insights', '.perm-grid-todas', '.ev-resumen', '.ins-kpis',
  '.metrica-grid', '.minikpis', '.dash-kpis', '.dash-grid', '.fgrid', '.pcard-grid', '.repx-actcards',
  '.wiz-eds-grid', '.wiz-grid-cursos', '.evol-paneles', '.cta-cards', '.finales-grid', '.ctr-estado',
].join(',');
const LISTAS = '.acc-lista';

function columnas(el) {
  const gtc = getComputedStyle(el).gridTemplateColumns;
  if (!gtc || gtc === 'none') return 1;
  return Math.max(1, gtc.split(/\s+/).filter(Boolean).length);
}

function pintar() {
  document.querySelectorAll(GRILLAS).forEach((g) => {
    if (getComputedStyle(g).display !== 'grid') return;
    const n = columnas(g);
    [...g.children].forEach((h, i) => {
      const t = String((i % n + Math.floor(i / n)) % 3);
      if (h.getAttribute('data-tono') !== t) h.setAttribute('data-tono', t);
    });
  });
  document.querySelectorAll(LISTAS).forEach((l) => {
    [...l.children].forEach((h, i) => {
      const t = String(i % 3);
      if (h.getAttribute('data-tono') !== t) h.setAttribute('data-tono', t);
    });
  });
}

export default function TonosContenedores() {
  useEffect(() => {
    let raf = 0;
    const pedir = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pintar); };
    pedir();
    const mo = new MutationObserver(pedir);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', pedir);
    return () => { mo.disconnect(); window.removeEventListener('resize', pedir); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
