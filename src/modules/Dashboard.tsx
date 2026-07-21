import { useState, useEffect } from 'react';
import { standards } from '../data/standards';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import { useUoc } from '../components/UoCContext';
import api from '../api';

interface DashboardProps {
  onNavigate: (module: 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'users' | 'scc' | 'stakeholders') => void;
}

interface Stats {
  overallCompliance: number;
  pendingReviews: number;
  activeRisks: number;
  criticalRisks: number;
  overdueActions: number;
  openFindings: number;
  closedFindings: number;
  averagePlansProgress: number;
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
  const { selectedUoc, selectedUocId, isPrincipleApplicable, uocs } = useUoc();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [complianceStatuses, setComplianceStatuses] = useState<StandardCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sccStats, setSccStats] = useState<{ uocCount: number; txCount: number; stCount: number } | null>(null);
  const { t, language } = useThemeLanguage();

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
      try {
        const [sccDash, stResp] = await Promise.all([
          api.get('/scc/dashboard'),
          api.get('/stakeholders')
        ]);
        setSccStats({ uocCount: sccDash.data.uocCount, txCount: sccDash.data.volumes?.length || 0, stCount: stResp.data.length });
      } catch (e) { /* SCC module may not be seeded yet */ }
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
    return <div className="text-center text-muted" style={{ padding: '3rem' }}>Cargando...</div>;
  }

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      <div className="hero-banner card">
        <div className="flex justify-between items-start gap-4" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="text-xl font-bold mb-1">Cert-TechCol — RSPO P&C 2024</h2>
            <p className="text-sm">La operación sostenible, conectada de principio a fin.</p>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <span className="badge hero-badge">146 indicadores</span>
            <span className="badge hero-badge">7 principios</span>
            <span className="badge hero-badge">3 UoCs</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
          <span className="hero-hint">Ctrl+K para búsqueda rápida</span>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{t('dash.compliance')}</span>
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
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
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
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
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-accent-red">{stats?.overdueActions}</span>
            <span className="text-sm text-secondary font-medium flex items-center gap-1">
              {t('dash.attention')}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{language === 'es' ? 'No Conformidades' : 'Non-Conformances'}</span>
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{stats?.openFindings}</span>
            <span className="text-sm text-secondary font-medium flex items-center gap-1">
              {stats?.closedFindings} {language === 'es' ? 'Cerradas' : 'Closed'}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">{language === 'es' ? 'Avance de Planes' : 'Plans Progress'}</span>
                         <svg className="stat-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-primary">{stats?.averagePlansProgress}%</span>
            <span className="text-sm text-accent-blue font-medium flex items-center gap-1">
              {language === 'es' ? 'Promedio' : 'Average'}
            </span>
          </div>
        </div>
      </div>

      {/* Banner de Alcance de UoC Seleccionada */}
      <div className="card p-4 flex justify-between items-center flex-wrap gap-3" style={{ background: selectedUocId === 'all' ? 'var(--accent-blue-light)' : 'var(--accent-green-bg)', borderColor: selectedUocId === 'all' ? 'var(--accent-blue)' : 'var(--accent-green)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex-center font-bold text-lg" style={{ background: selectedUocId === 'all' ? 'var(--accent-blue)' : 'var(--accent-green)', color: 'white' }}>
            {selectedUocId === 'all' ? 'Σ' : 'UoC'}
          </div>
          <div>
            <h4 className="font-bold text-sm text-primary">
              {selectedUocId === 'all' 
                ? `Vista Consolidada — Sumatoria de ${uocs.length} Unidades de Certificación` 
                : `Evaluación Específica: ${selectedUoc?.name}`}
            </h4>
            <p className="text-xs text-secondary mt-0.5">
              {selectedUocId === 'all' 
                ? 'Agregación ponderada de indicadores, mediciones y riesgos para toda la organización' 
                : `Empresa: ${selectedUoc?.companyName} • Alcance: ${selectedUoc?.appliesAll ? '100% Norma RSPO 2024' : `${selectedUoc?.applicablePrinciples.length} Principios Aplicables`}`}
            </p>
          </div>
        </div>
        {selectedUoc && !selectedUoc.appliesAll && (
          <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
            ⚙ Alcance Ajustado ({7 - selectedUoc.applicablePrinciples.length} Princ. N/A)
          </span>
        )}
      </div>

      {/* Tablero Ejecutivo por Principios RSPO P&C 2024 (M1-M7) */}
      <div className="card p-0 overflow-hidden border border-gray-200 shadow-sm">
        <div className="p-4 bg-surface-1 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-primary">RSPO P&C 2024 — Desglose Ejecutivo por Principios (M1 a M7)</h3>
            <p className="text-xs text-secondary mt-0.5">Gestión de cumplimiento normativo versión 4.2 (162 indicadores oficiales)</p>
          </div>
          <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>Aplicación 2026</span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs font-bold text-secondary uppercase">
                <th className="p-3">Módulo Comercial</th>
                <th className="p-3">Principio</th>
                <th className="p-3 text-center">Indicadores</th>
                <th className="p-3 text-center">Cumple</th>
                <th className="p-3 text-center">Parcial</th>
                <th className="p-3 text-center">No Cumple</th>
                <th className="p-3 text-center">% Cumplimiento</th>
                <th className="p-3 text-center">Críticos</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'M1', module: 'M1 Gobierno, ética y DD. HH.', principle: 'Principio 1', total: 6, c: 5, p: 1, nc: 0, crit: 0 },
                { key: 'M2', module: 'M2 Cumplimiento legal y terceros', principle: 'Principio 2', total: 13, c: 11, p: 2, nc: 0, crit: 0 },
                { key: 'M3', module: 'M3 Estrategia, operación y trazabilidad', principle: 'Principio 3', total: 23, c: 20, p: 2, nc: 1, crit: 0 },
                { key: 'M4', module: 'M4 Tierra, FPIC y comunidades', principle: 'Principio 4', total: 30, c: 24, p: 5, nc: 1, crit: 1 },
                { key: 'M5', module: 'M5 Pequeños productores', principle: 'Principio 5', total: 7, c: 5, p: 2, nc: 0, crit: 0 },
                { key: 'M6', module: 'M6 Trabajo decente y SST', principle: 'Principio 6', total: 44, c: 38, p: 4, nc: 2, crit: 1 },
                { key: 'M7', module: 'M7 Ambiente, clima y biodiversidad', principle: 'Principio 7', total: 39, c: 32, p: 5, nc: 2, crit: 0 },
              ].map((p, idx) => {
                const isApp = isPrincipleApplicable(p.key);
                const pct = Math.round(((p.c + (p.p * 0.5)) / p.total) * 100);
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-surface-1 text-sm" style={{ opacity: isApp ? 1 : 0.6 }}>
                    <td className="p-3 font-semibold text-primary flex items-center gap-2">
                      <span>{p.module}</span>
                      {!isApp && <span className="badge text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>N/A</span>}
                    </td>
                    <td className="p-3 text-secondary">{p.principle}</td>
                    <td className="p-3 text-center font-mono font-medium">{p.total}</td>
                    <td className="p-3 text-center font-semibold text-accent-green">{isApp ? p.c : '—'}</td>
                    <td className="p-3 text-center font-semibold" style={{ color: 'var(--accent-gold)' }}>{isApp ? p.p : '—'}</td>
                    <td className="p-3 text-center font-semibold text-accent-red">{isApp ? p.nc : '—'}</td>
                    <td className="p-3 text-center">
                      {isApp ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 85 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
                          </div>
                          <span className="font-bold text-xs">{pct}%</span>
                        </div>
                      ) : (
                        <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>N/A (Excluido)</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {!isApp ? (
                        <span className="text-xs text-muted">N/A</span>
                      ) : p.crit > 0 ? (
                        <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)', fontWeight: 'bold' }}>{p.crit} Abierto</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {sccStats && (
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">RSPO — Cadena de Suministro (SCC)</h3>
        <div className="stats-grid">
          <div className="card" style={{ borderLeft: '4px solid var(--status-success)' }}>
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">Unidades de Certificación</span>
            <div className="flex items-end justify-between mt-3">
              <span className="text-3xl font-bold text-primary">{sccStats.uocCount}</span>
              <span className="text-sm text-accent-green font-medium">UoCs activas</span>
            </div>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--color-brand)' }}>
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">Transacciones SCC</span>
            <div className="flex items-end justify-between mt-3">
              <span className="text-3xl font-bold text-primary">{sccStats.txCount}</span>
              <span className="text-sm text-accent-blue font-medium">IP · SG · MB · BC</span>
            </div>
          </div>
          <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
            <span className="text-sm text-secondary font-medium uppercase tracking-wide">Partes Interesadas</span>
            <div className="flex items-end justify-between mt-3">
              <span className="text-3xl font-bold text-primary">{sccStats.stCount}</span>
              <span className="text-sm text-secondary font-medium">Stakeholders</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Compliance by Standard */}
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">{t('dash.complianceByStd')}</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
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
              
              <div className="compliance-ring relative flex items-center justify-center mb-4">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Feed */}
        <div className="card lg:col-span-2 p-0 overflow-hidden">
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
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('scc')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Cadena SCC (RSPO)
            </button>
            <button className="btn btn-secondary w-full justify-start" onClick={() => onNavigate('stakeholders')}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Partes Interesadas
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
