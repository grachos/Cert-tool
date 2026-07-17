import { useState, useEffect } from 'react';
import { standards } from '../data/standards';
import type { ActionPlan } from '../types';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

export default function Automation() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const { t, language } = useThemeLanguage();

  useEffect(() => {
    api.get('/automation').then(res => {
      setPlans(res.data);
      setIsLoading(false);
    });
  }, []);

  const pending = plans.filter(p => p.status === 'PENDING');
  const inProgress = plans.filter(p => p.status === 'IN_PROGRESS');
  const completed = plans.filter(p => p.status === 'COMPLETED');
  const overdue = plans.filter(p => p.status === 'OVERDUE');

  const columns = [
    { id: 'pending', title: t('auto.colPending'), items: pending, color: 'var(--surface-2)', headerColor: 'var(--text-primary)' },
    { id: 'in-progress', title: t('auto.colInProgress'), items: inProgress, color: 'var(--accent-blue-light)', headerColor: 'var(--accent-blue)' },
    { id: 'completed', title: t('auto.colCompleted'), items: completed, color: 'var(--accent-green-bg)', headerColor: 'var(--accent-green)' },
    { id: 'overdue', title: t('auto.colOverdue'), items: overdue, color: 'var(--accent-red-bg)', headerColor: 'var(--accent-red)' }
  ];

  const getStandardBadge = (id: string) => {
    const s = standards.find(st => st.id === id);
    if (!s) return null;
    return (
      <span className="badge" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
        {s.name}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    switch(p) {
      case 'high': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">{language === 'es' ? 'Alta' : 'High'}</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wider">{language === 'es' ? 'Media' : 'Medium'}</span>;
      case 'low': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">{language === 'es' ? 'Baja' : 'Low'}</span>;
      default: return null;
    }
  };

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('auto.loading')}</div>;
  }

  return (
    <div className="flex-col gap-6 animate-fade-in h-full">
      
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-md border flex" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
            <button 
              className="px-3 py-1.5 text-sm font-medium rounded transition-all"
              style={{
                background: view === 'kanban' ? 'var(--bg-card)' : 'transparent',
                color: view === 'kanban' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: view === 'kanban' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setView('kanban')}
            >
              {t('auto.kanban')}
            </button>
            <button 
              className="px-3 py-1.5 text-sm font-medium rounded transition-all"
              style={{
                background: view === 'list' ? 'var(--bg-card)' : 'transparent',
                color: view === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: view === 'list' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setView('list')}
            >
              {t('auto.list')}
            </button>
          </div>
          <span className="text-sm text-secondary pl-4 border-l border-gray-200">
            <strong className="text-primary">{plans.length}</strong> {t('auto.planesCount')}
          </span>
        </div>
        <button className="btn btn-primary">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t('auto.btnNewPlan')}
        </button>
      </div>

      {view === 'kanban' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start">
          {columns.map(col => (
            <div key={col.id} className="flex-col gap-3">
              <div className="flex justify-between items-center p-3 rounded-t-lg border-b-2" style={{ borderColor: col.headerColor, background: 'var(--surface-1)' }}>
                <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: col.headerColor }}>{col.title}</h3>
                <span className="bg-white text-xs font-bold px-2 py-1 rounded shadow-sm text-secondary border border-gray-200">{col.items.length}</span>
              </div>
              
              <div className="flex-col gap-3 min-h-[200px] p-2 rounded-b-lg border border-gray-200" style={{ background: col.color }}>
                {col.items.map(item => (
                  <div key={item.id} className="card p-3 cursor-grab hover:shadow-md border border-gray-200 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      {getStandardBadge(item.standard)}
                      {getPriorityBadge(item.priority)}
                    </div>
                    <h4 className="font-bold text-primary text-sm mb-1 leading-tight">{item.title}</h4>
                    <p className="text-xs text-secondary mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                          {item.assignee.charAt(0)}
                        </div>
                        <span className="text-xs text-secondary truncate max-w-[80px]">{item.assignee}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: item.status.toLowerCase() === 'overdue' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '12px', height: '12px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {item.dueDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card p-0 overflow-hidden border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-1 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Plan de Acción' : 'Action Plan'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thNorm')}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Prioridad' : 'Priority'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Progreso' : 'Progress'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('risks.thOwner')}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Vencimiento' : 'Due Date'}</th>
              </tr>
            </thead>
            <tbody>
              {[...pending, ...inProgress, ...completed, ...overdue].map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-surface-1 transition-colors">
                  <td className="p-4">
                    <div className="flex-col">
                      <span className="font-semibold text-primary text-sm">{item.title}</span>
                      <span className="text-xs text-secondary mt-1">{item.type}</span>
                    </div>
                  </td>
                  <td className="p-4">{getStandardBadge(item.standard)}</td>
                  <td className="p-4">{getPriorityBadge(item.priority)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-secondary">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-secondary">{item.assignee}</td>
                  <td className="p-4 text-sm font-medium" style={{ color: item.status.toLowerCase() === 'overdue' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {item.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
