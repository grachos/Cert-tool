interface HeaderProps {
  title: string;
  subtitle: string;
  onToggleSidebar?: () => void;
}

export default function Header({ title, subtitle, onToggleSidebar }: HeaderProps) {
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
        <div className="relative">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-2.5 text-muted" style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Buscar en plataforma..." 
            style={{ 
              background: 'var(--surface-1)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              padding: '0.5rem 1rem 0.5rem 2.25rem', 
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              width: '250px'
            }}
          />
        </div>
        <button className="btn-icon relative" style={{ padding: '0.5rem' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span style={{ position: 'absolute', top: '6px', right: '8px', width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '50%', border: '2px solid white' }}></span>
        </button>
      </div>
    </header>
  );
}
