import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import { useToast } from '../components/ToastContext';
import api from '../api';

interface Audit {
  id: string;
  title: string;
  date: string;
  type: 'INTERNAL' | 'EXTERNAL' | 'CERTIFICATION';
  auditorName: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'CLOSED';
}

interface Finding {
  id: string;
  auditId: string;
  requirementId: string;
  requirementTitle?: string;
  clause?: string;
  type: 'MAJOR_NC' | 'MINOR_NC' | 'OBSERVATION' | 'OPPORTUNITY';
  description: string;
  status: 'OPEN' | 'PENDING_AI_REVIEW' | 'CLOSED' | 'REJECTED_BY_AI';
  createdAt: string;
}

export default function Audits() {
  const { user } = useAuth();
  const { t, language } = useThemeLanguage();
  const { addToast } = useToast();

  const [audits, setAudits] = useState<Audit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  // New Audit Form State
  const [showNewAuditModal, setShowNewAuditModal] = useState(false);
  const [newAudit, setNewAudit] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'INTERNAL',
    auditorName: ''
  });

  // New Finding Modal State
  const [showNewFindingModal, setShowNewFindingModal] = useState(false);
  const [requirements, setRequirements] = useState<{id: string, clause: string, title: string, standardId: string}[]>([]);
  const [newFinding, setNewFinding] = useState({
    requirementId: '',
    type: 'MAJOR_NC',
    description: ''
  });

  // AI Verdict Modal State
  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [verdict, setVerdict] = useState<{ isApproved: boolean; justification: string } | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  useEffect(() => {
    fetchAudits();
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      const res = await api.get('/audits/requirements');
      setRequirements(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audits');
      setAudits(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (auditId: string) => {
    try {
      const res = await api.get(`/audits/${auditId}/findings`);
      setFindings(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuditClick = (audit: Audit) => {
    setSelectedAudit(audit);
    fetchFindings(audit.id);
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/audits', newAudit);
      if (res.status === 201 || res.status === 200) {
        setShowNewAuditModal(false);
        fetchAudits();
        addToast({ type: 'success', title: 'Éxito', message: language === 'es' ? 'Auditoría registrada exitosamente' : 'Audit logged successfully' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    try {
      const res = await api.post(`/audits/${selectedAudit.id}/findings`, newFinding);
      if (res.status === 201 || res.status === 200) {
        setShowNewFindingModal(false);
        fetchFindings(selectedAudit.id);
        addToast({ type: 'success', title: 'Éxito', message: language === 'es' ? 'Hallazgo registrado exitosamente' : 'Finding logged successfully' });
        // Reset form
        setNewFinding({ requirementId: '', type: 'MAJOR_NC', description: '' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleVerifyFinding = async (findingId: string) => {
    setVerdictLoading(true);
    setShowVerdictModal(true);
    setVerdict(null);
    try {
      const res = await api.post(`/audits/findings/${findingId}/ai-verify`);
      setVerdict({ isApproved: res.data.isApproved, justification: res.data.aiJustification });
      // Refresh findings to show updated status
      if (selectedAudit) fetchFindings(selectedAudit.id);
    } catch (error) {
      console.error(error);
    } finally {
      setVerdictLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'MAJOR_NC': return 'var(--accent-red)';
      case 'MINOR_NC': return 'var(--accent-orange)';
      case 'OBSERVATION': return 'var(--accent-blue)';
      case 'OPPORTUNITY': return 'var(--accent-green)';
      default: return 'var(--text-primary)';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPEN': return 'var(--accent-red)';
      case 'PENDING_AI_REVIEW': return 'var(--accent-orange)';
      case 'CLOSED': return 'var(--accent-green)';
      case 'REJECTED_BY_AI': return 'var(--accent-red)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="animate-fade-in flex-col gap-6">
      {!selectedAudit ? (
        // AUDITS LIST VIEW
        <div className="card p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-surface-1 flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary">{t('audits.listTitle')}</h2>
            {(user?.role === 'ADMIN' || user?.role === 'AUDITOR' || user?.role === 'MANAGER') && (
              <button className="btn btn-primary" onClick={() => setShowNewAuditModal(true)}>
                ➕ {t('audits.newBtn')}
              </button>
            )}
          </div>
          
          <div className="p-0 table-container">
            <table className="data-table w-full text-left">
              <thead>
                <tr>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('audits.thTitle')}</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('audits.thDate')}</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('audits.thType')}</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('audits.thAuditor')}</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('audits.thStatus')}</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-secondary">
                      <div className="flex-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Cargando...
                      </div>
                    </td>
                  </tr>
                ) : audits.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-secondary">No hay auditorías registradas</td></tr>
                ) : (
                  audits.map(audit => (
                    <tr key={audit.id} className="hover:bg-surface-2 transition-colors cursor-pointer" onClick={() => handleAuditClick(audit)}>
                      <td className="p-4 font-medium text-primary">{audit.title}</td>
                      <td className="p-4 text-secondary">{new Date(audit.date).toLocaleDateString()}</td>
                      <td className="p-4">
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)' }}>{audit.type}</span>
                      </td>
                      <td className="p-4 text-secondary">{audit.auditorName}</td>
                      <td className="p-4">
                        <span className="badge" style={{ backgroundColor: audit.status === 'CLOSED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)', color: audit.status === 'CLOSED' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="btn btn-sm btn-ghost text-accent-blue" onClick={(e) => { e.stopPropagation(); handleAuditClick(audit); }}>
                          {t('audits.viewFindings')} &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // FINDINGS LIST VIEW
        <div className="animate-slide-right flex-col gap-4">
          <button className="btn btn-ghost text-secondary self-start" onClick={() => setSelectedAudit(null)}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            {t('audits.backBtn')}
          </button>

          <div className="card p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-1">{selectedAudit.title}</h2>
                <p className="text-secondary">{selectedAudit.auditorName} • {new Date(selectedAudit.date).toLocaleDateString()} • {selectedAudit.type}</p>
              </div>
              <span className="badge" style={{ fontSize: '14px', padding: '6px 12px', backgroundColor: selectedAudit.status === 'CLOSED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)', color: selectedAudit.status === 'CLOSED' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                {selectedAudit.status}
              </span>
            </div>

            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
              <h3 className="text-xl font-bold text-primary">{t('audits.findingsTitle')}</h3>
              <button 
                className="btn btn-sm btn-primary flex items-center gap-1"
                onClick={() => setShowNewFindingModal(true)}
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                {language === 'es' ? 'Registrar Hallazgo' : 'Log Finding'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {findings.length === 0 ? (
                <div className="p-8 text-center text-secondary bg-surface-1 rounded border border-gray-200">No hay hallazgos registrados para esta auditoría.</div>
              ) : (
                findings.map(finding => (
                  <div key={finding.id} className="bg-surface-1 border border-gray-200 rounded-lg p-5 flex-col gap-3 transition-colors hover:border-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm" style={{ color: getTypeColor(finding.type) }}>
                          {finding.type === 'MAJOR_NC' ? t('audits.type.major') : finding.type === 'MINOR_NC' ? t('audits.type.minor') : finding.type === 'OBSERVATION' ? t('audits.type.obs') : t('audits.type.opp')}
                        </span>
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)', border: `1px solid ${getStatusColor(finding.status)}`, color: getStatusColor(finding.status) }}>
                          {finding.status === 'OPEN' ? t('audits.finding.open') : finding.status === 'CLOSED' ? t('audits.finding.closed') : finding.status === 'REJECTED_BY_AI' ? t('audits.finding.rejected') : finding.status}
                        </span>
                      </div>
                      <div className="text-sm font-medium bg-card px-3 py-1 rounded shadow-sm border border-gray-200 text-secondary">
                        {finding.clause} - {finding.requirementTitle}
                      </div>
                    </div>
                    
                    <p className="text-primary mt-2 p-3 bg-card rounded border border-gray-200">{finding.description}</p>
                    
                    <div className="flex justify-end mt-2 pt-3 border-t border-gray-200">
                      {finding.status !== 'CLOSED' && (
                        <button className="btn btn-sm btn-primary flex items-center gap-2" onClick={() => handleVerifyFinding(finding.id)}>
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          {t('audits.aiVerifyBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Audit Modal */}
      {showNewAuditModal && (
        <div className="modal-overlay flex-center">
          <div className="modal card p-0 w-full" style={{ maxWidth: '500px' }}>
            <div className="modal-header p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary">{t('audits.newBtn')}</h3>
              <button className="btn-icon" onClick={() => setShowNewAuditModal(false)}>✕</button>
            </div>
            <div className="modal-body p-6">
              <form onSubmit={handleCreateAudit} className="flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">{t('audits.thTitle')}</label>
                  <input type="text" className="form-input" required value={newAudit.title} onChange={e => setNewAudit({...newAudit, title: e.target.value})} placeholder="Ej. Auditoría Externa ISO 9001:2015" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('audits.thDate')}</label>
                  <input type="date" className="form-input" required value={newAudit.date} onChange={e => setNewAudit({...newAudit, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('audits.thType')}</label>
                  <select className="form-select" required value={newAudit.type} onChange={e => setNewAudit({...newAudit, type: e.target.value})}>
                    <option value="INTERNAL">Interna</option>
                    <option value="EXTERNAL">Externa</option>
                    <option value="CERTIFICATION">Certificación</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('audits.thAuditor')}</label>
                  <input type="text" className="form-input" required value={newAudit.auditorName} onChange={e => setNewAudit({...newAudit, auditorName: e.target.value})} placeholder="Nombre de la firma o auditor" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowNewAuditModal(false)}>{t('btn.cancel')}</button>
                  <button type="submit" className="btn btn-primary">{t('btn.save')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Verdict Modal */}
      {showVerdictModal && (
        <div className="modal-overlay flex-center">
          <div className="modal card p-0 w-full" style={{ maxWidth: '600px' }}>
            <div className="modal-header p-4 border-b border-gray-200 flex justify-between items-center bg-surface-1">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <svg className="text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                {t('audits.aiTitle')}
              </h3>
              <button className="btn-icon" onClick={() => setShowVerdictModal(false)}>✕</button>
            </div>
            <div className="modal-body p-8">
              {verdictLoading ? (
                <div className="flex-col flex-center gap-4 py-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-md bg-accent-blue opacity-50 animate-pulse"></div>
                    <svg className="animate-spin relative z-10 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                  <p className="text-secondary text-lg">Analizando evidencias y planes de acción...</p>
                </div>
              ) : verdict ? (
                <div className="flex-col gap-6">
                  <div className={`p-4 rounded-lg border flex items-start gap-4 ${verdict.isApproved ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
                    <div className={`rounded-full p-2 flex-shrink-0 ${verdict.isApproved ? 'bg-green-500/20 text-accent-green' : 'bg-red-500/20 text-accent-red'}`}>
                      {verdict.isApproved ? (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </div>
                    <div>
                      <h4 className={`text-lg font-bold mb-1 ${verdict.isApproved ? 'text-accent-green' : 'text-accent-red'}`}>
                        {verdict.isApproved ? 'No Conformidad Cerrada' : 'Cierre Rechazado'}
                      </h4>
                      <p className="text-primary leading-relaxed">{verdict.justification}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button className="btn btn-secondary" onClick={() => setShowVerdictModal(false)}>{t('btn.close')}</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* New Finding Modal */}
      {showNewFindingModal && (
        <div className="modal-overlay flex-center">
          <div className="modal card w-full max-w-md animate-scale-in">
            <form onSubmit={handleCreateFinding}>
              <div className="modal-header border-b border-color-dark p-4">
                <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Registrar Hallazgo' : 'Log Finding'}</h3>
              </div>
              <div className="modal-body p-4 flex-col gap-3">
                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Requisito / Cláusula' : 'Requirement / Clause'}</label>
                  <select 
                    className="form-select mt-1"
                    required
                    value={newFinding.requirementId}
                    onChange={(e) => setNewFinding({...newFinding, requirementId: e.target.value})}
                  >
                    <option value="">{language === 'es' ? 'Seleccionar requisito...' : 'Select requirement...'}</option>
                    {requirements.map(req => (
                      <option key={req.id} value={req.id}>{req.standardId} - {req.clause}: {req.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('audits.thType')}</label>
                  <select 
                    className="form-select mt-1"
                    value={newFinding.type}
                    onChange={(e) => setNewFinding({...newFinding, type: e.target.value})}
                  >
                    <option value="MAJOR_NC">{t('audits.type.major')}</option>
                    <option value="MINOR_NC">{t('audits.type.minor')}</option>
                    <option value="OBSERVATION">{t('audits.type.obs')}</option>
                    <option value="OPPORTUNITY">{t('audits.type.opp')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Descripción del Hallazgo' : 'Finding Description'}</label>
                  <textarea 
                    className="form-textarea mt-1"
                    rows={4}
                    required
                    value={newFinding.description}
                    onChange={(e) => setNewFinding({...newFinding, description: e.target.value})}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer border-t border-color-dark p-4 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost text-secondary" onClick={() => setShowNewFindingModal(false)}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'es' ? 'Guardar' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
