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
          <select 
            className="uoc-select" 
            value={selectedUocId}
            onChange={e => setSelectedUocId(e.target.value)}
          >
            <option value="all">Todas las UoCs (Consolidado)</option>
            {uocs.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} {u.appliesAll ? '(Aplica 100%)' : `(${u.applicablePrinciples.length} Princ. N/A)`}
              </option>
            ))}
          </select>
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
