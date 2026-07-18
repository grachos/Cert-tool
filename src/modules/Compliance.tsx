import { useState, useEffect } from 'react';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import { useAuth } from '../components/AuthContext';
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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Modales y Form State para Normas
  const [showEditStdModal, setShowEditStdModal] = useState(false);
  const [stdName, setStdName] = useState('');
  const [stdFullName, setStdFullName] = useState('');
  const [stdDescription, setStdDescription] = useState('');
  const [stdColor, setStdColor] = useState('');
  const [stdIcon, setStdIcon] = useState('');

  // Modales y Form State para Requisitos
  const [showReqModal, setShowReqModal] = useState(false);
  const [isEditingReq, setIsEditingReq] = useState(false);
  const [editingReqId, setEditingReqId] = useState('');
  const [reqClause, setReqClause] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqStatus, setReqStatus] = useState<'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'PENDING'>('PENDING');

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

  const openEditStdModal = () => {
    const std = complianceStatuses.find(s => s.standardId === selectedStandard);
    if (std) {
      setStdName(std.name);
      setStdFullName(std.fullName);
      setStdDescription(std.description);
      setStdColor(std.color);
      setStdIcon(std.icon);
      setShowEditStdModal(true);
    }
  };

  const openAddReqModal = () => {
    setIsEditingReq(false);
    setEditingReqId('');
    setReqClause('');
    setReqTitle('');
    setReqDescription('');
    setReqStatus('PENDING');
    setShowReqModal(true);
  };

  const openEditReqModal = (req: Requirement) => {
    setIsEditingReq(true);
    setEditingReqId(req.id);
    setReqClause(req.clause);
    setReqTitle(req.title);
    setReqDescription(req.description);
    setReqStatus(req.status);
    setShowReqModal(true);
  };

  const handleSaveStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStandard) return;
    try {
      await api.put(`/compliance/standards/${selectedStandard}`, {
        name: stdName,
        fullName: stdFullName,
        description: stdDescription,
        color: stdColor,
        icon: stdIcon
      });
      setShowEditStdModal(false);
      await fetchCompliance();
      await fetchStandardDetail(selectedStandard);
    } catch (err) {
      console.error('Error al guardar norma:', err);
    }
  };

  const handleSaveRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStandard) return;
    try {
      if (isEditingReq) {
        await api.put(`/compliance/requirements/${editingReqId}`, {
          clause: reqClause,
          title: reqTitle,
          description: reqDescription,
          status: reqStatus
        });
      } else {
        await api.post(`/compliance/requirements`, {
          clause: reqClause,
          title: reqTitle,
          description: reqDescription,
          standardId: selectedStandard
        });
      }
      setShowReqModal(false);
      await fetchStandardDetail(selectedStandard);
      await fetchCompliance();
    } catch (err) {
      console.error('Error al guardar requisito:', err);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    if (!selectedStandard) return;
    const confirmDelete = window.confirm(
      language === 'es' 
        ? '¿Estás seguro de que deseas eliminar este requisito?' 
        : 'Are you sure you want to delete this requirement?'
    );
    if (!confirmDelete) return;

    try {
      await api.delete(`/compliance/requirements/${id}`);
      await fetchStandardDetail(selectedStandard);
      await fetchCompliance();
    } catch (err) {
      console.error('Error al eliminar requisito:', err);
    }
  };

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
        <div className="flex-col gap-6">
          <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-gray-200 shadow-sm no-print">
            <div>
              <h2 className="text-xl font-bold text-primary">{language === 'es' ? 'Estado General de Cumplimiento' : 'General Compliance Status'}</h2>
              <p className="text-sm text-secondary">{language === 'es' ? 'Resumen ejecutivo de todas las normas auditadas en el sistema' : 'Executive summary of all audited standards in the system'}</p>
            </div>
            <button className="btn btn-secondary flex items-center gap-2" onClick={() => window.print()}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              {language === 'es' ? 'Exportar Reporte PDF' : 'Export PDF Report'}
            </button>
          </div>
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
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-primary">{standardDetail.name} - {language === 'es' ? 'Requisitos' : 'Requirements'}</h2>
                    {isAdmin && (
                      <button className="btn btn-sm btn-secondary" onClick={openEditStdModal} style={{ padding: '4px 8px' }}>
                        ✏️ {language === 'es' ? 'Editar Norma' : 'Edit Standard'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-secondary mt-1">{standardDetail.fullName}</p>
                </div>
                
                <div className="flex gap-2">
                  {isAdmin && (
                    <button className="btn btn-secondary no-print" onClick={openAddReqModal}>
                      ➕ {language === 'es' ? 'Añadir Requisito' : 'Add Requirement'}
                    </button>
                  )}
                  <button className="btn btn-secondary flex items-center gap-2 no-print" onClick={() => window.print()}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {language === 'es' ? 'Exportar Reporte PDF' : 'Export PDF Report'}
                  </button>
                  <button className="btn btn-primary no-print">{t('compliance.evalBtn')}</button>
                </div>
              </div>
              
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white border-b border-gray-200">
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.clause')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.requirement')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.status')}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('compliance.evidence')}</th>
                    {isAdmin && <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Acciones' : 'Actions'}</th>}
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
                      {isAdmin && (
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary" onClick={() => openEditReqModal(req)} style={{ padding: '4px 8px' }}>
                              ✏️
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleDeleteRequirement(req.id)} style={{ padding: '4px 8px', color: 'var(--accent-red)' }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Editar Norma */}
      {showEditStdModal && (
        <div className="modal-overlay flex-center" onClick={() => setShowEditStdModal(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">
                {language === 'es' ? 'Editar Norma' : 'Edit Standard'}
              </h3>
              <button className="btn-icon" onClick={() => setShowEditStdModal(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveStandard} className="flex-col gap-4">
              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Nombre Corto' : 'Short Name'}</label>
                <input
                  type="text"
                  value={stdName}
                  onChange={(e) => setStdName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Nombre Completo' : 'Full Name'}</label>
                <input
                  type="text"
                  value={stdFullName}
                  onChange={(e) => setStdFullName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Descripción' : 'Description'}</label>
                <textarea
                  value={stdDescription}
                  onChange={(e) => setStdDescription(e.target.value)}
                  className="form-input"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Color (CSS Hex)' : 'Color (CSS Hex)'}</label>
                <input
                  type="text"
                  value={stdColor}
                  onChange={(e) => setStdColor(e.target.value)}
                  className="form-input"
                  placeholder="#3b82f6"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Emoji / Icono' : 'Emoji / Icon'}</label>
                <input
                  type="text"
                  value={stdIcon}
                  onChange={(e) => setStdIcon(e.target.value)}
                  className="form-input"
                  placeholder="🛡️"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditStdModal(false)}>{t('btn.cancel')}</button>
                <button type="submit" className="btn btn-primary">{language === 'es' ? 'Guardar Cambios' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agregar / Editar Requisito */}
      {showReqModal && (
        <div className="modal-overlay flex-center" onClick={() => setShowReqModal(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">
                {isEditingReq 
                  ? (language === 'es' ? 'Editar Requisito' : 'Edit Requirement') 
                  : (language === 'es' ? 'Añadir Nuevo Requisito' : 'Add New Requirement')}
              </h3>
              <button className="btn-icon" onClick={() => setShowReqModal(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSaveRequirement} className="flex-col gap-4">
              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Cláusula / Código' : 'Clause / Code'}</label>
                <input
                  type="text"
                  value={reqClause}
                  onChange={(e) => setReqClause(e.target.value)}
                  className="form-input"
                  placeholder="Ej. 9.3"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Título' : 'Title'}</label>
                <input
                  type="text"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="form-input"
                  placeholder="Ej. Revisión por la Dirección"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Descripción' : 'Description'}</label>
                <textarea
                  value={reqDescription}
                  onChange={(e) => setReqDescription(e.target.value)}
                  className="form-input"
                  rows={4}
                  placeholder="Detalle de la obligación normativa..."
                  required
                />
              </div>

              {isEditingReq && (
                <div className="form-group flex-col gap-1">
                  <label className="form-label font-semibold">{language === 'es' ? 'Estado Inicial' : 'Initial Status'}</label>
                  <select
                    value={reqStatus}
                    onChange={(e) => setReqStatus(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="COMPLIANT">{t('compliance.compliant')}</option>
                    <option value="NON_COMPLIANT">{t('compliance.nonCompliant')}</option>
                    <option value="PARTIAL">{t('compliance.partial')}</option>
                    <option value="PENDING">{t('compliance.pending')}</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReqModal(false)}>{t('btn.cancel')}</button>
                <button type="submit" className="btn btn-primary">{language === 'es' ? 'Guardar Requisito' : 'Save Requirement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
