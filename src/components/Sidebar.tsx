import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useThemeLanguage } from './ThemeLanguageContext';

type ModuleId = 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'audits' | 'users' | 'scc' | 'stakeholders' | 'alerts' | 'plant' | 'ghg' | 'supply' | 'plantations';

interface SidebarProps {
  activeModule: ModuleId;
  onNavigate: (module: ModuleId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
}

interface NavItem {
  id: ModuleId;
  labelKey: any;
  icon: ReactNode;
  adminOnly?: boolean;
}

const Icons = {
  Dashboard: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  Documents: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Risks: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Compliance: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  Evidence: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Automation: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Audits: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Users: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Scc: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Stakeholders: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Alerts: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Plant: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
  Ghg: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Supply: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Plantations: <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
};

const navItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: Icons.Dashboard },
  { id: 'compliance', labelKey: 'nav.compliance', icon: Icons.Compliance },
  { id: 'plantations', labelKey: 'nav.plantations', icon: Icons.Plantations },
  { id: 'plant', labelKey: 'nav.plant', icon: Icons.Plant },
  { id: 'scc', labelKey: 'nav.scc', icon: Icons.Scc },
  { id: 'supply', labelKey: 'nav.supply', icon: Icons.Supply },
  { id: 'ghg', labelKey: 'nav.ghg', icon: Icons.Ghg },
  { id: 'documents', labelKey: 'nav.documents', icon: Icons.Documents },
  { id: 'evidence', labelKey: 'nav.evidence', icon: Icons.Evidence },
  { id: 'risks', labelKey: 'nav.risks', icon: Icons.Risks },
  { id: 'automation', labelKey: 'nav.automation', icon: Icons.Automation },
  { id: 'stakeholders', labelKey: 'nav.stakeholders', icon: Icons.Stakeholders },
  { id: 'audits', labelKey: 'nav.audits', icon: Icons.Audits },
  { id: 'alerts', labelKey: 'nav.alerts', icon: Icons.Alerts },
  { id: 'users', labelKey: 'nav.users', icon: Icons.Users, adminOnly: true },
];

export default function Sidebar({ activeModule, onNavigate, collapsed, onToggleCollapse, mobileOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t } = useThemeLanguage();

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-logo justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-blue-600 text-white rounded font-bold" style={{ width: '28px', height: '28px', fontSize: '12px' }}>CTC</div>
          {!collapsed && <span>Cert-TechCol</span>}
        </div>
        <button className="btn-icon" onClick={onToggleCollapse} style={{ padding: '4px' }}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems
          .filter(item => !item.adminOnly || user?.role === 'ADMIN')
          .map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeModule === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? t(item.labelKey as any) : undefined}
            >
              {item.icon}
              {!collapsed && <span>{t(item.labelKey as any)}</span>}
            </div>
          ))}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '1rem' }} className="flex-col gap-2">
        <div className="flex items-center gap-3">
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
            {user?.name?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          {!collapsed && (
            <div className="flex-col" style={{ overflow: 'hidden' }}>
              <span className="text-sm font-semibold text-primary" style={{ lineHeight: '1.2' }}>{user?.name}</span>
              <span className="text-xs text-muted truncate" style={{ maxWidth: '130px' }}>{user?.email}</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="btn btn-secondary w-full" onClick={logout} style={{ marginTop: '0.75rem', padding: '0.375rem', fontSize: '0.75rem' }}>
            {t('nav.logout')}
          </button>
        )}
      </div>
    </aside>
  );
}
