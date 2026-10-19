// Formato simple para las respuestas (así el equipo las escribe sin tocar HTML y nunca puede colarse código):
//   ![descripción](https://…/infografia.png)  muestra una imagen o infografía dentro de la respuesta (se puede tocar para verla grande)
//   **negrita**   *cursiva*   [texto del enlace](https://...)   [correo](mailto:alguien@dominio.com)   y cada salto de línea es un renglón nuevo.
// Se usa tanto para mostrar la respuesta (aHtml) como para buscar dentro de ella (aTextoPlano).

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const URL_OK = /^(https?:\/\/|mailto:|tel:)/i;

export function aHtml(texto) {
  let h = esc(texto);
  // Imágenes / infografías: ![descripción](https://...). Se guardan aparte para que el reemplazo de enlaces no las toque.
  const imgs = [];
  h = h.replace(/!\[([^\]\n]*)\]\((https?:\/\/[^)\s]+)\)/g, (m, alt, u) => {
    const url = u.replace(/&amp;/g, '&');
    imgs.push(`<a class="resp-img-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img class="resp-img" src="${esc(url)}" alt="${alt}" loading="lazy" /></a>`);
    return '\u0000IMG' + (imgs.length - 1) + '\u0000';
  });
  h = h.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
    const url = u.replace(/&amp;/g, '&');
    if (!URL_OK.test(url)) return t;
    const externo = /^https?:/i.test(url);
    return `<a href="${esc(url)}"${externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>${t}</a>`;
  });
  h = h.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  h = h.replace(/\r?\n/g, '<br>');
  return h.replace(/\u0000IMG(\d+)\u0000/g, (m, i) => imgs[Number(i)] || '');
}

export function aTextoPlano(texto) {
  return String(texto == null ? '' : texto)
    .replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1');
}

/** ID de YouTube (o null) para validar el campo Video. */
export function videoValido(url) {
  const u = String(url || '').trim();
  return !u || /^https?:\/\/[^\s]+$/i.test(u);
}
