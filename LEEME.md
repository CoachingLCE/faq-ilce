# Preguntas frecuentes · Instituto ILCE

App Next.js 14 + Google Sheets (misma estructura, seguridad y login que fichas-ilce).

## Páginas
- `/estudiantes` y `/interesados`: páginas públicas (se pueden incrustar en un iframe). Antes de buscar piden nombre, email, curso y edición (interesados: nombre, email y curso de interés).
- `/panel`: panel interno (Reportes · Videollamadas · Preguntas · Accesos · Historial). Ingreso en `/panel/login`.

## Puesta en marcha
1. Crear la planilla de Google de esta app y compartirla con la cuenta de servicio (como en fichas).
2. Cargar las variables de `.env.example` en Vercel (`FICHAS_SHEET_ID` = planilla de fichas, compartida también con la cuenta de servicio).
3. Abrir `/api/setup?token=SETUP_TOKEN` una vez: crea las pestañas. Después `ALLOW_SETUP=0`.
4. Crear el primer Admin como en fichas (o importarlo): en la pestaña `Usuarios` de la planilla, o importando desde fichas desde Accesos una vez que haya un Admin.
5. En el panel → Preguntas → "Cargar las preguntas iniciales" (30 preguntas de las dos páginas actuales).

## Roles
| Rol | Preguntas | Videollamadas | Reportes | Exportar | Accesos / importar / Historial |
|---|---|---|---|---|---|
| Admin | todo | gestiona | ve | sí | sí |
| Coordinación académica | todo | gestiona | ve | sí | no |
| Coordinador de inscripciones, Inscripciones, Estudiantes | ve | ve | ve | no | no |
| Académico | ve | ve | ve | no | no |
| Docente | ve | no | no | no | no |

## Qué se registra (pestañas Visitantes y Eventos)
Cada visita identificada, cada búsqueda (con cuántos resultados tuvo; 0 = "buscado y no encontrado"), cada pregunta abierta, los "¿te ayudó?" y los clics en enlaces y botones. Los reportes se calculan con eso.

## Banner de promoción
Aparece arriba de las dos páginas públicas. Se configura en `lib/constants.js` (`PROMO`): `activa`, textos, `descuento` (insignia), `cursos` (si queda vacío rotan los de la planilla de fichas), `horas` (cuenta regresiva por visitante desde su primera visita, guardada en el navegador) o `cierre` (fecha fija), `boton` y `mensajeWa`. Al llegar a cero muestra "Promo finalizada". Los clics en el botón se ven en Reportes → Dónde hicieron clic.
