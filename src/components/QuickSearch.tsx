import { useState, useEffect, useRef } from 'react';

interface SearchItem { id: string; label: string; icon: string; group: string; }

const items: SearchItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'Principal' },
  { id: 'compliance', label: 'Cumplimiento P&C 2024', icon: '📋', group: 'Certificación' },
  { id: 'plantations', label: 'Cumpl. Plantaciones', icon: '🌿', group: 'Certificación' },
  { id: 'plant', label: 'P&C Extractora', icon: '🏭', group: 'Certificación' },
  { id: 'scc', label: 'Cadena SCC', icon: '📦', group: 'Certificación' },
  { id: 'supply', label: 'Base Suministro', icon: '🗺️', group: 'Certificación' },
  { id: 'ghg', label: 'Calculadora GHG', icon: '🌍', group: 'Certificación' },
  { id: 'documents', label: 'Documentos', icon: '📄', group: 'Gestión' },
  { id: 'evidence', label: 'Evidencias', icon: '🔍', group: 'Gestión' },
  { id: 'risks', label: 'Riesgos', icon: '⚠️', group: 'Gestión' },
  { id: 'automation', label: 'Planes de Acción', icon: '⚙️', group: 'Gestión' },
  { id: 'stakeholders', label: 'Partes Interesadas', icon: '👥', group: 'Gestión' },
  { id: 'audits', label: 'Auditorías', icon: '🛡️', group: 'Control' },
  { id: 'alerts', label: 'Alertas', icon: '🔔', group: 'Control' },
  { id: 'users', label: 'Usuarios', icon: '👤', group: 'Control' },
];

interface Props {
  onNavigate: (id: string) => void;
}

export default function QuickSearch({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === 'K' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') { setOpen(false); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const filtered = query
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.group.toLowerCase().includes(query.toLowerCase()))
    : items;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) {
      onNavigate(filtered[selectedIdx].id);
      setOpen(false);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay flex-center" onClick={() => setOpen(false)} style={{ zIndex: 200 }}>
      <div className="modal card" onClick={e => e.stopPropagation()}
        style={{ width: '500px', maxWidth: '95%', padding: 0, overflow: 'hidden' }}>
        <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input ref={inputRef} className="form-input" style={{ border: 'none', boxShadow: 'none', fontSize: '1rem' }}
            placeholder="Buscar módulo..." value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKey} />
          <span className="text-xs text-muted badge" style={{ background: 'var(--surface-1)', flexShrink: 0 }}>ESC</span>
        </div>
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          {filtered.map((item, i) => (
            <div key={item.id}
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-1"
              style={{ background: i === selectedIdx ? 'var(--surface-1)' : 'transparent' }}
              onClick={() => { onNavigate(item.id); setOpen(false); }}>
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <div className="flex-col" style={{ flex: 1 }}>
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs text-muted">{item.group}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-muted">Sin resultados para "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
