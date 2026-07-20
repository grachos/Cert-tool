import { useThemeLanguage } from './ThemeLanguageContext';
import { useUoC } from './UoCContext';

interface HeaderProps {
  title: string;
  subtitle: string;
  onToggleSidebar?: () => void;
}

export default function Header({ title, subtitle, onToggleSidebar }: HeaderProps) {
  const { theme, toggleTheme, language, setLanguage } = useThemeLanguage();
  const { selectedUocId, uocs, setSelectedUoc } = useUoC();

  return (
    <header className="page-header">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button className="btn-icon d-lg-none" onClick={onToggleSidebar}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="flex-col">
          <h1 className="text-xl font-bold text-primary" style={{ lineHeight: '1.2' }}>{title}</h1>
          <p className="text-sm text-secondary">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {uocs.length > 0 && (
          <select
            value={selectedUocId}
            onChange={e => {
              const uoc = uocs.find(u => u.id === e.target.value);
              setSelectedUoc(e.target.value, uoc?.name || '');
            }}
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              fontWeight: 600,
              maxWidth: '200px'
            }}
          >
            <option value="">🌐 Todas las UoCs</option>
            {uocs.map(u => (
              <option key={u.id} value={u.id}>🏭 {u.name.length > 25 ? u.name.slice(0,25) + '...' : u.name}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-2.5 text-muted" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder={language === 'es' ? 'Buscar en plataforma...' : 'Search platform...'} 
            style={{ 
              background: 'var(--surface-1)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              padding: '0.5rem 1rem 0.5rem 2.25rem', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              width: '200px'
            }}
          />
        </div>

        {/* Language Switcher */}
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}
        >
          {language === 'es' ? 'EN' : 'ES'}
        </button>

        {/* Theme Switcher */}
        <button className="btn-icon" onClick={toggleTheme} style={{ padding: '0.5rem' }} title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
          {theme === 'light' ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          )}
        </button>

        {/* Notifications */}
        <button className="btn-icon relative" style={{ padding: '0.5rem' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span style={{ position: 'absolute', top: '6px', right: '8px', width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></span>
        </button>
      </div>
    </header>
  );
}
