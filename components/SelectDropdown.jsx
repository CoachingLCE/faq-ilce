'use client';
// Dropdown compacto de filtro (con búsqueda opcional) + chip de filtro activo.
// Vivían como funciones locales dentro de Panel.jsx (los usa el Dashboard); se sacaron acá
// para que Reportes.jsx también los pueda usar sin duplicar la lógica ni crear un import
// circular entre Panel.jsx y Reportes.jsx.
import { useState, useEffect, useRef } from 'react';

function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }

export function SelectDropdown({ label, value, options, onChange, placeholder = 'Todos', searchable, hidePlaceholderOption, onOpen, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const filtradas = searchable && q ? options.filter((o) => norm(o.label).includes(norm(q))) : options;
  const actual = options.find((o) => o.value === value);
  const toggle = () => setOpen((v) => { const next = !v; if (next && onOpen) onOpen(); return next; });
  return (
    <div className={'fdrop' + (className ? ' ' + className : '')} ref={ref}>
      {label && <div className="fdrop-label">{label}</div>}
      <button type="button" className={'fdrop-btn' + (value ? ' on' : '')} onClick={toggle}>
        <span>{actual ? actual.label : placeholder}</span><span className="fdrop-car">▾</span>
      </button>
      {open && (
        <div className="fdrop-panel">
          {searchable && options.length > 6 && (
            <input autoFocus className="fdrop-search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          )}
          <div className="fdrop-list">
            {!hidePlaceholderOption && (
              <div className={'fdrop-opt' + (!value ? ' on' : '')} onClick={() => { onChange(''); setOpen(false); setQ(''); }}>{placeholder}</div>
            )}
            {filtradas.map((o) => (
              <div key={o.value} className={'fdrop-opt' + (value === o.value ? ' on' : '')} onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}>{o.label}</div>
            ))}
            {filtradas.length === 0 && <div className="fdrop-empty">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function FiltroChip({ label, onClear }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(5,149,173,.12)', border: '1px solid rgba(5,149,173,.35)', color: 'rgb(var(--accentTeal))', borderRadius: 999, padding: '5px 10px', fontSize: 12.5, fontWeight: 500 }}>
      {label}
      <button onClick={onClear} aria-label="Quitar filtro" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
    </span>
  );
}
