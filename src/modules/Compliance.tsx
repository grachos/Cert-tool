import { useState, useEffect } from 'react';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

interface Requirement {
  id: string;
  clause: string;
  title: string;
  description: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'PENDING';
  evidenceCount: number;
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

interface StandardDetail {
  id: string;
  name: string;
  fullName: string;
  requirements: Requirement[];
}

export default function Compliance() {
  const [complianceStatuses, setComplianceStatuses] = useState<StandardCompliance[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [standardDetail, setStandardDetail] = useState<StandardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const { t, language } = useThemeLanguage();

  const fetchCompliance = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/compliance/standards');
      setComplianceStatuses(res.data);
    } catch (error) {
      console.error('Error al obtener cumplimiento', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStandardDetail = async (id: string) => {
    try {
      setIsDetailLoading(true);
      const res = await api.get(`/compliance/standards/${id}`);
      setStandardDetail(res.data);
    } catch (error) {
      console.error('Error al obtener detalles del estándar', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  useEffect(() => {
    if (selectedStandard) {
      fetchStandardDetail(selectedStandard);
    } else {
      setStandardDetail(null);
    }
  }, [selectedStandard]);

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('compliance.loading')}</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLIANT':
        return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{t('compliance.compliant')}</span>;
      case 'PARTIAL':
        return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{t('compliance.partial')}</span>;
      case 'NON_COMPLIANT':
        return <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>{t('compliance.nonCompliant')}</span>;
      case 'PENDING':
      default:
        return <span className="badge bg-gray-100 text-gray-600">{t('compliance.pending')}</span>;
    }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {!selectedStandard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complianceStatuses.map((status) => {
            return (
              <div 
                key={status.standardId} 
                className="card cursor-pointer hover:border-blue-500 flex-col gap-4 border border-gray-200 shadow-sm"
                onClick={() => setSelectedStandard(status.standardId)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-md font-bold" style={{ width: '40px', height: '40px', background: `${status.color}15`, color: status.color, fontSize: '12px' }}>
                      {status.icon}
                    </div>
                    <div className="flex-col" style={{ overflow: 'hidden' }}>
                      <h3 className="font-bold text-primary truncate" style={{ maxWidth: '150px' }}>{status.name}</h3>
                      <span className="text-xs text-secondary truncate" style={{ display: 'block', maxWidth: '150px' }}>{status.fullName}</span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: status.color }}>{status.overallScore}%</span>
                </div>

                <div className="flex-col gap-1">
                  <div className="flex justify-between text-xs text-secondary">
                    <span>{t('compliance.progress')}</span>
                    <span>{status.compliant}/{status.totalRequirements} {language === 'es' ? 'Requisitos' : 'Requirements'}</span>
                  </div>
                  <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${status.overallScore}%`, background: status.color }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-surface-1 p-2 rounded text-center border border-gray-200">
                    <span className="block text-xl font-bold text-accent-green">{status.compliant}</span>
                    <span className="text-xs text-secondary uppercase">{t('compliance.compliant')}</span>
                  </div>
                  <div className="bg-surface-1 p-2 rounded text-center border border-gray-200">
                    <span className="block text-xl font-bold text-accent-red">{status.nonCompliant}</span>
                    <span className="text-xs text-secondary uppercase">{t('compliance.nonCompliant')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="animate-slide-right">
          {/* Detail View */}
          <div className="mb-4">
            <button className="btn btn-ghost text-secondary" onClick={() => setSelectedStandard(null)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {t('compliance.backBtn')}
            </button>
          </div>
          
          {isDetailLoading || !standardDetail ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('compliance.loadingReqs')}</div>
          ) : (
            <div className="card p-0 overflow-hidden border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-surface-1 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-primary">{standardDetail.name} - {language === 'es' ? 'Requisitos' : 'Requirements'}</h2>
                  <p className="text-sm text-secondary mt-1">{standardDetail.fullName}</p>
                </div>
                <button className="btn btn-primary">{t('compliance.evalBtn')}</button>
              </div>
              
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.clause')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.requirement')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.status')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.evidence')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {standardDetail.requirements.map(req => (
                    <tr key={req.id} className="border-b border-gray-100 hover:bg-surface-1 transition-colors">
                      <td className="p-4 font-mono text-sm text-secondary">{req.clause}</td>
                      <td className="p-4">
                        <div className="flex-col">
                          <span className="font-semibold text-primary">{req.title}</span>
                          <span className="text-xs text-secondary mt-1">{req.description}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          <span className="text-sm font-medium">{req.evidenceCount}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button className="btn btn-sm btn-ghost border border-gray-200 hover:border-gray-300">{t('btn.audit')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
