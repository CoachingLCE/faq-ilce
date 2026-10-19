'use client';
import { useEffect, useState } from 'react';
import { useSession } from '../lib/useSession';
import CambiarPassword from './CambiarPassword';

// Contenedor único (está en el layout, así vale para todas las pantallas): muestra el cuadro de cambio de contraseña
//  · SIEMPRE y sin poder cerrarlo cuando la sesión es de alguien que entró con una contraseña genérica o temporal (usuario.debeCambiar), y
//  · cuando se toca "Cambiar contraseña" en el menú (evento "ilce:cambiar-password").
export default function CambioPasswordGlobal() {
  const { usuario, logout } = useSession();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener('ilce:cambiar-password', abrir);
    return () => window.removeEventListener('ilce:cambiar-password', abrir);
  }, []);
  if (!usuario) return null;
  const obligatorio = !!usuario.debeCambiar;
  if (!obligatorio && !abierto) return null;
  return <CambiarPassword usuario={usuario} obligatorio={obligatorio} onCerrar={() => setAbierto(false)} onSalir={() => { logout(); window.location.href = '/panel/login'; }} />;
}
