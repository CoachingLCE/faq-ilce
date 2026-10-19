'use client';
// Solo existe para que lib/useSession.js (que instala el envío del token en cada pedido a la API) se cargue en todas las pantallas, aunque alguna no use el hook.
import '../lib/useSession';

export default function InstalarSesion() { return null; }
