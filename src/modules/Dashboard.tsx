import { useState, useEffect } from 'react';
import { standards } from '../data/standards';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

interface DashboardProps {
  onNavigate: (module: 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'users') => void;
}

interface Stats {
  overallCompliance: number;
  pendingReviews: number;
  activeRisks: number;
  criticalRisks: number;
  overdueActions: number;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user: string;
  standard: string | null;
}

interface StandardCompliance {
  standardId: string;
  name: string;
  fullName: string;
  description: string;
  color: string;
  icon: string;
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  pending: number;
  overallScore: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [complianceStatuses, setComplianceStatuses] = useState<StandardCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useThemeLanguage();

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, activitiesRes, complianceRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/activities'),
        api.get('/compliance/standards')
      ]);
      setStats(statsRes.data);
      setActivities(activitiesRes.data);
      setComplianceStatuses(complianceRes.data);
    } catch (error) {
      console.error('Error al cargar datos del dashboard', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStandardColor = (id: string) => {
    return standards.find(s => s.id === id)?.color || '#2563eb';
  };

  const getStandardName = (id: string) => {
    return standards.find(s => s.id === id)?.name || id;
  };

  const getStandardIconText = (id: string) => {
    return standards.find(s => s.id === id)?.icon || id;
  };

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>;
  }

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{t('dash.compliance')}</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{stats?.overallCompliance}%</span>
            <span className="text-sm text-accent-green font-medium flex items-center gap-1">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              {t('dash.stable')}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{t('dash.pendingDocs')}</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{stats?.pendingReviews}</span>
            <span className="text-sm text-secondary font-medium flex items-center gap-1">
              {t('dash.pending')}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{t('dash.activeRisks')}</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{stats?.activeRisks}</span>
            <span className="text-sm text-accent-red font-medium flex items-center gap-1">
              {stats?.criticalRisks} {t('dash.critical')}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{t('dash.overdueActions')}</span>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-accent-red">{stats?.overdueActions}</span>
            <span className="text-sm text-secondary font-medium flex items-center gap-1">
              {t('dash.attention')}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance by Standard */}
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">{t('dash.complianceByStd')}</h3>
        <div className="grid grid-cols-4 gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {complianceStatuses.map((status) => (
            <div 
              key={status.standardId} 
              className="card flex-col items-center justify-center cursor-pointer hover:border-blue-500" 
              onClick={() => onNavigate('compliance')}
            >
              <div className="flex items-center gap-2 mb-4 w-full">
                <div className="badge" style={{ background: `${getStandardColor(status.standardId)}15`, color: getStandardColor(status.standardId) }}>
                  {getStandardIconText(status.standardId)}
                </div>
                <span className="font-semibold text-primary truncate text-sm">{getStandardName(status.standardId)}</span>
              </div>
              
              <div className="relative flex items-center justify-center mb-4" style={{ width: '80px', height: '80px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
                  <circle 
                    cx="40" cy="40" r="36" 
                    fill="none" 
                    stroke={getStandardColor(status.standardId)} 
                    strokeWidth="6" 
                    strokeDasharray={`${status.overallScore * 2.26} 226`} 
                    strokeLinecap="round" 
                    transform="rotate(-90 40 40)" 
                  />
                </svg>
                <span className="absolute text-lg font-bold text-primary">{status.overallScore}%</span>
              </div>
              
              <div className="w-full flex gap-1 h-1.5 rounded-full overflow-hidden mt-2">
                <div style={{ width: `${(status.compliant / status.totalRequirements) * 100}%`, background: 'var(--accent-green)' }}></div>
                <div style={{ width: `${(status.partial / status.totalRequirements) * 100}%`, background: 'var(--accent-gold)' }}></div>
                <div style={{ width: `${(status.nonCompliant / status.totalRequirements) * 100}%`, background: 'var(--accent-red)' }}></div>
                <div style={{ width: `${(status.pending / status.totalRequirements) * 100}%`, background: 'var(--surface-2)' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Activity Feed */}
        <div className="card col-span-2 p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-primary">{t('dash.recentActivity')}</h3>
          </div>
          <div className="flex-col">
            {activities.map((activity, idx) => (
              <div key={activity.id} className={`flex gap-4 p-4 hover:bg-surface-1 transition-colors ${idx !== activities.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStandardColor(activity.standard || 'BASC'), marginTop: '8px' }}></div>
                <div className="flex-col flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold text-primary">{activity.action}</p>
                    <span className="text-xs text-muted">{activity.timestamp}</span>
                  </div>
                  <p className="text-sm text-secondary mt-1">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium text-secondary">{activity.user}</span>
                    {activity.standard && (
                      <span className="badge" style={{ background: `${getStandardColor(activity.standard)}10`, color: getStandardColor(activity.standard) }}>
                        {getStandardName(activity.standard)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-base font-bold text-primary mb-4">{t('dash.quickActions')}</h3>
          <div className="flex-col gap-2">
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('documents')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {t('dash.newDocReview')}
            </button>
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('risks')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {t('dash.registerRisk')}
            </button>
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('compliance')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              {t('dash.verifyCompliance')}
            </button>
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('evidence')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {t('dash.generateEvidence')}
            </button>
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('automation')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {t('dash.createActionPlan')}
            </button>
          </div>
          
          <div className="mt-6 p-4 rounded-lg border" style={{ background: 'var(--accent-blue-light)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start gap-3">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px', color: 'var(--accent-blue)', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <div>
                <h4 className="text-sm font-bold" style={{ color: 'var(--accent-blue)' }}>{t('dash.aiReview')}</h4>
                <p className="text-xs text-secondary mt-1">{stats?.pendingReviews || 0} {t('dash.aiPendingMsg')}</p>
                <button className="btn btn-primary btn-sm mt-3 w-full bg-blue-600 hover:bg-blue-700" onClick={() => onNavigate('documents')}>
                  {t('dash.aiStartBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
