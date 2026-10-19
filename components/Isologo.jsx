// Logo oficial Instituto ILCE.
// Muestra el logo completo (isotipo + "INSTITUTO ILCE"), eligiendo la versión
// de color o blanca según el tema activo (data-theme), vía CSS en globals.css.
// `size` = alto en px; el ancho se ajusta solo manteniendo la proporción.

// Se mantiene exportado por compatibilidad: varias páginas hacen
// `import { Isologo, IsologoDefs }` y renderizan <IsologoDefs />.
// Ya no hace falta el gradiente SVG, así que no renderiza nada.
export function IsologoDefs() {
  return null;
}

export function Isologo({ size = 34 }) {
  const style = { height: size, width: 'auto' };
  return (
    <>
      <img
        src="/logo-ilce-color.png"
        alt="Instituto ILCE"
        className="ilce-logo ilce-logo-color"
        style={style}
      />
      <img
        src="/logo-ilce-blanco.png"
        alt="Instituto ILCE"
        className="ilce-logo ilce-logo-blanco"
        style={style}
      />
    </>
  );
}
