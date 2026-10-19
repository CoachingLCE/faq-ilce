'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const CLAVE = 'ilce-faq-tema';

function temaPorHorario() {
  const hora = new Date().getHours();
  return hora >= 7 && hora < 19 ? 'light' : 'dark';
}
function resolver(preferencia) {
  if (preferencia === 'auto') return temaPorHorario();
  return preferencia === 'claro' ? 'light' : 'dark';
}

export function ThemeProvider({ children }) {
  const [preferencia, setPreferencia] = useState('auto');
  const [resuelto, setResuelto] = useState('dark');

  useEffect(() => {
    const guardada = localStorage.getItem(CLAVE) || 'auto';
    setPreferencia(guardada);
    const r = resolver(guardada);
    setResuelto(r);
    document.documentElement.setAttribute('data-theme', r);
  }, []);

  useEffect(() => {
    if (preferencia !== 'auto') return;
    const intervalo = setInterval(() => {
      const r = temaPorHorario();
      setResuelto((prev) => { if (prev !== r) document.documentElement.setAttribute('data-theme', r); return r; });
    }, 60 * 1000);
    return () => clearInterval(intervalo);
  }, [preferencia]);

  function cambiarPreferencia(nueva) {
    setPreferencia(nueva);
    localStorage.setItem(CLAVE, nueva);
    const r = resolver(nueva);
    setResuelto(r);
    document.documentElement.setAttribute('data-theme', r);
  }

  return <ThemeContext.Provider value={{ preferencia, resuelto, cambiarPreferencia }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
