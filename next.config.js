/** @type {import('next').NextConfig} */

// Cabeceras de seguridad (revisión de seguridad de octubre de 2026):
//  - X-Content-Type-Options nosniff: el navegador no "adivina" el tipo de un archivo.
//  - Referrer-Policy: al salir a otro sitio no se manda la dirección completa de esta app.
//  - Permissions-Policy: la app no necesita cámara, micrófono ni ubicación, así que quedan apagados.
//  - Strict-Transport-Security: el navegador usa siempre HTTPS con este dominio.
//  - X-Frame-Options DENY: ningún otro sitio puede mostrar la pantalla INTERNA dentro de un marco (evita engañar con clics sobre una app oculta).
//    Solo en /panel (el login y el panel del equipo): las páginas públicas de preguntas frecuentes NO la llevan, porque se muestran dentro del campus (iframe).
// (La Content-Security-Policy se agrega aparte, de a poco, porque exige probar cada pantalla.)
const cabecerasBase = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
];
const sinMarcos = [{ key: 'X-Frame-Options', value: 'DENY' }];

const nextConfig = {
  async headers() {
    return [
      {
        // Evita que el navegador quede pegado con una versión vieja tras un deploy nuevo.
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]
      },
      { source: '/(.*)', headers: cabecerasBase },
      { source: '/panel/:path*', headers: sinMarcos }
    ];
  }
};
module.exports = nextConfig;
