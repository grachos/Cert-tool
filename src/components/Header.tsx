import { useState, useEffect, useRef } from 'react';
import { useThemeLanguage } from './ThemeLanguageContext';
import { useUoC } from './UoCContext';
import api from '../api';

interface HeaderProps {
  title: string;
  subtitle: string;
  onToggleSidebar?: () => void;
  onNavigateNotifications?: () => void;
}

interface UocSearchSelectProps {
  uocs: any[];
  selectedUocId: string;
  onSelectUoc: (id: string) => void;
  language: 'es' | 'en';
}

function UocSearchSelect({ uocs, selectedUocId, onSelectUoc, language }: UocSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedUoc = uocs.find(u => u.id === selectedUocId);

  const filteredUocs = uocs.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.companyName?.toLowerCase().includes(q) || u.type?.toLowerCase().includes(q);
  });

  const getUocIcon = (type: string) => {
    switch (type) {
      case 'PLANTATION': return '🌴';
      case 'MILL': return '🏭';
      case 'SMALLHOLDERS': return '🧑‍🌾';
      default: return '🌿';
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
      {/* Trigger Bar (Search-bar styled input box) */}
      <button
        type="button"
        className="uoc-search-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '0.45rem 0.75rem',
          fontSize: '0.8125rem',
          background: 'var(--bg-surface-1)',
          border: isOpen ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'var(--shadow-sm)',
          transition: 'all 200ms ease',
        }}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '15px', height: '15px', color: 'var(--accent-blue)', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <div style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
          {selectedUocId === 'all' || !selectedUoc ? (
            <span className="font-semibold text-primary">
              {language === 'es' ? 'Todas las UoCs' : 'All UoCs'}
            </span>
          ) : (
            <span className="font-semibold text-primary">
              {getUocIcon(selectedUoc.type)} {selectedUoc.name}
            </span>
          )}
        </div>
        <span className="badge text-[10px]" style={{ background: selectedUocId === 'all' ? 'var(--accent-blue-light)' : 'var(--accent-green-bg)', color: selectedUocId === 'all' ? 'var(--accent-blue)' : 'var(--accent-green)', padding: '2px 6px' }}>
          {selectedUocId === 'all' ? 'Σ' : (selectedUoc?.appliesAll ? '100%' : `${7 - selectedUoc?.applicablePrinciples.length} N/A`)}
        </span>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px', color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease', flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Floating Search Popover */}
      {isOpen && (
        <div
          className="card p-0 shadow-lg"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '320px',
            maxWidth: '90vw',
            zIndex: 200,
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
          }}
        >
          {/* Inner Search Field */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-surface-1)' }}>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'es' ? 'Buscar UoC por nombre...' : 'Search UoC by name...'}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.775rem', width: '100%', color: 'var(--text-primary)' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of UoCs */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '4px' }}>
            {/* Option: Consolidado / All */}
            <div
              className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${selectedUocId === 'all' ? 'bg-surface-2 font-bold' : 'hover:bg-surface-1'}`}
              onClick={() => { onSelectUoc('all'); setIsOpen(false); setSearchQuery(''); }}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex-center font-bold text-xs" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>Σ</span>
                <div className="flex-col">
                  <span className="text-xs font-semibold text-primary">{language === 'es' ? 'Todas las UoCs (Consolidado)' : 'All UoCs (Consolidated)'}</span>
                  <span className="text-[10px] text-secondary">{language === 'es' ? 'Sumatoria corporativa' : 'Corporate totals'}</span>
                </div>
              </div>
              {selectedUocId === 'all' && <span className="text-xs font-bold text-accent-blue">✓</span>}
            </div>

            <div className="my-1 border-t" style={{ borderColor: 'var(--border-light)' }} />

            {filteredUocs.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                {language === 'es' ? 'No se encontraron UoCs' : 'No UoCs found'}
              </div>
            ) : (
              filteredUocs.map(u => {
                const isSelected = u.id === selectedUocId;
                return (
                  <div
                    key={u.id}
                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-surface-2' : 'hover:bg-surface-1'}`}
                    onClick={() => { onSelectUoc(u.id); setIsOpen(false); setSearchQuery(''); }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-base">{getUocIcon(u.type)}</span>
                      <div className="flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-primary truncate">{u.name}</span>
                        <span className="text-[10px] text-secondary truncate">{u.companyName || u.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="badge text-[10px]" style={{ background: u.appliesAll ? 'var(--accent-green-bg)' : 'var(--accent-gold-bg)', color: u.appliesAll ? 'var(--accent-green)' : 'var(--accent-gold)' }}>
                        {u.appliesAll ? '100%' : `${7 - u.applicablePrinciples.length} N/A`}
                      </span>
                      {isSelected && <span className="text-xs font-bold text-accent-blue">✓</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ title, subtitle, onToggleSidebar, onNavigateNotifications }: HeaderProps) {
  const { theme, toggleTheme, language, setLanguage } = useThemeLanguage();
  const { selectedUocId, uocs, setSelectedUocId } = useUoC();
  const [alertCount, setAlertCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await api.get('/alerts');
        const active = data.filter((a: any) => a.dismissed === 0);
        setAlertCount(active.length);
        setRecentAlerts(active.slice(0, 5));
      } catch (e) { /* */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/alerts/${id}/dismiss`);
      setAlertCount(c => Math.max(0, c - 1));
      setRecentAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) { /* */ }
  };

  return (
    <header className="page-header">
      <div className="header-left">
        {onToggleSidebar && (
          <button className="btn-icon d-lg-none" onClick={onToggleSidebar}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex-col">
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {uocs.length > 0 && (
          <UocSearchSelect 
            uocs={uocs}
            selectedUocId={selectedUocId}
            onSelectUoc={setSelectedUocId}
            language={language}
          />
        )}

        <button className="lang-btn" onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}>
          {language === 'es' ? 'EN' : 'ES'}
        </button>

        <button className="header-icon-btn" onClick={toggleTheme}>
          {theme === 'light' ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </button>

        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button className="header-icon-btn" onClick={() => setShowDropdown(!showDropdown)}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {alertCount > 0 && <span className="notification-badge">{alertCount > 9 ? '9+' : alertCount}</span>}
          </button>

          {showDropdown && (
            <div className="notification-dropdown card p-0">
              <div className="p-3 flex justify-between items-center bg-surface-1" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <span className="text-sm font-bold">Notificaciones ({alertCount})</span>
                {onNavigateNotifications && (
                  <button className="btn btn-ghost btn-sm" onClick={onNavigateNotifications}>Ver todas</button>
                )}
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {recentAlerts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted">Sin alertas pendientes</div>
                ) : (
                  recentAlerts.map((a: any) => (
                    <div key={a.id} className="p-3 flex gap-2 items-start" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <span className="text-sm">{a.type === 'critico' ? '🔴' : a.type === 'alta' ? '🟠' : '🔵'}</span>
                      <div className="flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                        <span className="text-sm font-semibold">{a.title}</span>
                        <span className="text-xs text-secondary">{a.message}</span>
                        <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString('es-CO')}</span>
                      </div>
                      <button className="btn-icon" onClick={(e) => handleDismiss(a.id, e)} title="Descartar" style={{ padding: '2px', flexShrink: 0 }}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
