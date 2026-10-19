'use client';

// Se muestra cuando alguien abre una sección del menú sin permiso para entrar.
// Ahora todas las secciones son visibles para todos en el menú; el acceso real se
// bloquea acá y, además, del lado del servidor (las APIs devuelven 403 sin permiso).
export default function AccesoDenegado({ seccion }) {
  return (
    <div style={{ maxWidth: 460, margin: '80px auto 0', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}></div>
      <h2 className="font-display" style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>
        No tenés acceso{seccion ? ` a ${seccion}` : ''}
      </h2>
      <p style={{ fontSize: 14, color: 'rgb(var(--textSec))', lineHeight: 1.5 }}>
        Si creés que deberías poder verla, pedile a un Admin que te dé acceso desde Accesos.
      </p>
    </div>
  );
}
