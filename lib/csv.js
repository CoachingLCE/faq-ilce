// Descarga de CSV (con BOM para que Excel respete las tildes). Las celdas que empiezan con = + - @ se prefijan con una comilla
// para que Excel no las interprete como fórmulas (lo que escribe la gente en el buscador o en las consultas no puede ejecutar nada).
const celda = (v) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
export function descargarCSV(nombre, columnas, filas) {
  const cuerpo = [columnas.map(celda).join(','), ...filas.map((f) => f.map(celda).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + cuerpo], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
