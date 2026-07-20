import { useState, useEffect, useRef } from 'react';
import { standards } from '../data/standards';
import type { StandardId, Document } from '../types';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StandardId | 'Todos'>('Todos');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { t, language } = useThemeLanguage();

  // Upload States
  const [activeStandards, setActiveStandards] = useState<any[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Approval/signing states
  const [showSignModal, setShowSignModal] = useState(false);
  const [signAction, setSignAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [signToken, setSignToken] = useState('');
  const [signStep, setSignStep] = useState<'request' | 'input'>('request');
  const [signError, setSignError] = useState('');
  const [signLoading, setSignLoading] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
      return res.data;
    } catch (error) {
      console.error('Error al obtener documentos', error);
      return [];
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get('/documents'),
      api.get('/compliance/standards')
    ]).then(([docsRes, complianceRes]) => {
      setDocuments(docsRes.data);
      const activeIds = (complianceRes.data as any[]).map(s => s.standardId || s.id);
      const filtered = standards.filter(std => activeIds.includes(std.id));
      setActiveStandards(filtered);
      
      if (filtered.length > 0) {
        setSelectedStandard(filtered[0].id);
      }
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Polling para documentos con estado PENDING (análisis en progreso)
  useEffect(() => {
    const hasPending = documents.some(doc => doc.status.toUpperCase() === 'PENDING');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      const docs = await fetchDocuments();
      const stillPending = docs.some((doc: any) => doc.status.toUpperCase() === 'PENDING');
      if (!stillPending) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents]);

  // Mantener el selectedDoc sincronizado con los cambios en documents (ej. cuando pasa de PENDING a REVIEWED)
  useEffect(() => {
    if (selectedDoc) {
      const updated = documents.find(d => d.id === selectedDoc.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDoc)) {
        setSelectedDoc(updated);
      }
    }
  }, [documents, selectedDoc]);

  // Cerrar el detalle del documento si ya no pertenece a la norma filtrada
  useEffect(() => {
    if (selectedDoc && filter !== 'Todos' && selectedDoc.standardId !== filter) {
      setSelectedDoc(null);
    }
  }, [filter, selectedDoc]);

  // Sincronizar norma seleccionada con el filtro activo al abrir la carga
  useEffect(() => {
    if (showUpload) {
      if (filter !== 'Todos') {
        setSelectedStandard(filter);
        setErrorMsg('');
      } else {
        setSelectedStandard('');
      }
    }
  }, [showUpload, filter]);

  const filteredDocs = filter === 'Todos' 
    ? documents 
    : documents.filter(d => d.standardId === filter);

  const getStatusBadge = (status: string) => {
    switch(status.toUpperCase()) {
      case 'REVIEWED': return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{t('docs.status.reviewed')}</span>;
      case 'PENDING': return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{t('docs.status.pending')}</span>;
      case 'ISSUES_FOUND': return <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>{t('docs.status.issuesFound')}</span>;
      default: return <span className="badge bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getAiScoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-gold)';
    return 'var(--accent-red)';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selectedStandard) {
      setErrorMsg(language === 'es' ? 'Por favor, selecciona una Norma antes de subir el archivo.' : 'Please select a Standard before uploading the file.');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Subir archivo al servidor local
      const uploadRes = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const { name, size } = uploadRes.data;

      // 2. Guardar registro del documento en la BD relacionándolo con el Standard
      const docRes = await api.post('/documents', {
        name,
        type: 'POLICY', // por defecto
        standardId: selectedStandard,
        size,
        version: '1.0'
      });

      setDocuments([docRes.data, ...documents]);
      setShowUpload(false);
      setSelectedStandard('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (!selectedStandard) {
      setErrorMsg(language === 'es' ? 'Por favor, selecciona una Norma antes de subir el archivo.' : 'Please select a Standard before uploading the file.');
      return;
    }
    fileInputRef.current?.click();
  };

  const openSignModal = (doc: Document, action: 'APPROVE' | 'REJECT') => {
    setSignDoc(doc);
    setSignAction(action);
    setSignStep('request');
    setSignToken('');
    setSignError('');
    setShowSignModal(true);
  };

  const requestSignToken = async () => {
    if (!signDoc) return;
    setSignLoading(true); setSignError('');
    try {
      await api.post(`/approvals/documents/${signDoc.id}/request-token`, { action: signAction });
      setSignStep('input');
    } catch (err: any) {
      setSignError(err.response?.data?.error || 'Error al solicitar token');
    }
    setSignLoading(false);
  };

  const submitSignature = async () => {
    if (!signDoc || signToken.length !== 6) { setSignError('El token debe ser de 6 dígitos'); return; }
    setSignLoading(true); setSignError('');
    try {
      await api.post(`/approvals/documents/${signDoc.id}/sign`, { token: signToken, comment: '' });
      await fetchDocuments();
      setShowSignModal(false);
      if (selectedDoc?.id === signDoc.id) {
        const updated = documents.find(d => d.id === signDoc.id);
        if (updated) setSelectedDoc(updated);
      }
    } catch (err: any) {
      setSignError(err.response?.data?.error || 'Token inválido');
    }
    setSignLoading(false);
  };

  const fetchApprovalHistory = async (docId: string) => {
    try {
      const { data } = await api.get(`/approvals/documents/${docId}/history`);
      setApprovalHistory(data);
    } catch (e) { setApprovalHistory([]); }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex gap-2">
          <button 
            className={`btn btn-sm ${filter === 'Todos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('Todos')}
          >
            {language === 'es' ? 'Todos' : 'All'}
          </button>
          {activeStandards.map(s => (
            <button 
              key={s.id}
              className={`btn btn-sm ${filter === s.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(s.id as StandardId)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          {showUpload ? t('btn.cancel') : t('docs.btnUpload')}
        </button>
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <div className="card border-dashed border-2 border-blue-300 hover:border-blue-500 transition-colors animate-slide-up" style={{ background: 'var(--accent-blue-light)' }}>
          <div className="flex-col items-center justify-center p-8 text-center">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width: '48px', height: '48px', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-lg font-bold text-primary mb-2">{t('docs.uploadTitle')}</h3>
            <p className="text-sm text-secondary mb-6">{t('docs.uploadSub')}</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }}
              accept=".pdf,.docx,.doc,.xlsx,.xls"
            />
            
            <div className="flex gap-4 items-center justify-center">
              {filter === 'Todos' ? (
                <select 
                  value={selectedStandard}
                  onChange={(e) => {
                    setSelectedStandard(e.target.value);
                    setErrorMsg('');
                  }}
                  className="form-input"
                  style={{ width: '200px', padding: '0.5rem 0.75rem' }}
                >
                  <option value="">{t('docs.selectNorm')}</option>
                  {activeStandards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', padding: '0.5rem 1rem', fontSize: '0.875rem', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                  {t('docs.activeNorm')}: <strong>{filter}</strong>
                </span>
              )}
              
              <button 
                className="btn btn-primary shadow-sm"
                onClick={triggerFileInput}
                disabled={uploading}
              >
                {uploading ? t('docs.btnUploading') : t('docs.btnSelect')}
              </button>
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', marginTop: '1rem', fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document List */}
        <div className={`card col-span-1 ${selectedDoc ? 'lg:col-span-2' : 'lg:col-span-3'} p-0 overflow-hidden transition-all duration-300 shadow-sm border-gray-200`}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('docs.loading')}</div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('docs.noDocs')}</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-1 border-b border-gray-200">
                  <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thDoc')}</th>
                  <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thNorm')}</th>
                  <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thStatus')}</th>
                  <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thScore')}</th>
                  <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thDate')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map(doc => (
                  <tr 
                    key={doc.id} 
                    className={`border-b border-gray-100 hover:bg-surface-1 cursor-pointer transition-colors ${selectedDoc?.id === doc.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--surface-2)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex-col">
                          <span className="font-semibold text-primary text-sm">{doc.name}</span>
                          <span className="text-xs text-muted">{doc.size} • v{doc.version}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="badge bg-gray-100 text-gray-700 border border-gray-200">{doc.standardId}</span>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="p-4">
                      {doc.aiScore ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${doc.aiScore}%`, backgroundColor: getAiScoreColor(doc.aiScore) }}
                            />
                          </div>
                          <span className="text-sm font-bold" style={{ color: getAiScoreColor(doc.aiScore) }}>{doc.aiScore}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted">{language === 'es' ? 'Pendiente' : 'Pending'}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-secondary">{new Date(doc.uploadDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Document Detail / AI Analysis Panel */}
        {selectedDoc && (
          <div className="card animate-slide-right flex-col border-l-4 shadow-md" style={{ borderLeftColor: standards.find(s => s.id === selectedDoc.standardId)?.color || 'var(--accent-blue)' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-primary">{selectedDoc.name}</h3>
                <p className="text-xs text-secondary mt-1">{language === 'es' ? 'Subido el' : 'Uploaded on'} {new Date(selectedDoc.uploadDate).toLocaleDateString()}</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedDoc(null)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-1 p-4 rounded-lg text-center border border-gray-200">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">{t('docs.thScore')}</p>
                <p className="text-3xl font-bold" style={{ color: getAiScoreColor(selectedDoc.aiScore || 0) }}>
                  {selectedDoc.aiScore || 0}%
                </p>
              </div>
              <div className="bg-surface-1 p-4 rounded-lg text-center border border-gray-200 flex flex-col justify-center items-center">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">{t('docs.thStatus')}</p>
                <div>{getStatusBadge(selectedDoc.status)}</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {selectedDoc.status.toUpperCase() !== 'PENDING' && (
              <div className="p-4 rounded-lg border mb-4 flex-1" style={{ 
                background: selectedDoc.status.toUpperCase() === 'REVIEWED' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', 
                borderColor: selectedDoc.status.toUpperCase() === 'REVIEWED' ? 'var(--accent-green)' : 'var(--accent-red)' 
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '1.5rem' }}>{selectedDoc.status.toUpperCase() === 'REVIEWED' ? '✓' : '⚠'}</span>
                  <span className="font-bold" style={{ color: selectedDoc.status.toUpperCase() === 'REVIEWED' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {selectedDoc.status.toUpperCase() === 'REVIEWED' ? 'IA recomienda APROBAR' : 'IA encuentra OBSERVACIONES'}
                  </span>
                </div>
                <p className="text-xs">
                  Score IA: <b>{selectedDoc.aiScore || 0}%</b> · 
                  {selectedDoc.status.toUpperCase() === 'REVIEWED' 
                    ? ' El documento cumple con los criterios del estándar.'
                    : ` ${selectedDoc.findings?.length || 0} hallazgo(s) detectado(s). Revise antes de aprobar.`}
                </p>
                {selectedDoc.findings && selectedDoc.findings.length > 0 && (
                  <div className="mt-2 flex-col gap-1">
                    {selectedDoc.findings.slice(0, 3).map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span className="badge" style={{ background: f.severity === 'HIGH' ? 'var(--accent-red-bg)' : 'var(--accent-gold-bg)', color: f.severity === 'HIGH' ? 'var(--accent-red)' : 'var(--accent-gold)', fontSize: '0.6rem', padding: '0 4px' }}>{f.type}</span>
                        <span className="text-secondary" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>{f.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="flex gap-2 mb-4">
              <button className="btn btn-primary btn-sm flex-1" onClick={() => openSignModal(selectedDoc, 'APPROVE')}>
                ✓ Firmar y Aprobar
              </button>
              <button className="btn btn-secondary btn-sm flex-1" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => openSignModal(selectedDoc, 'REJECT')}>
                ✗ Firmar y Rechazar
              </button>
            </div>
            <button className="btn btn-ghost btn-sm w-full mb-4" onClick={() => { fetchApprovalHistory(selectedDoc.id); }}>
              Ver historial de firmas
            </button>
            {approvalHistory.length > 0 && (
              <div className="flex-col gap-2 mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
                <p className="text-xs font-bold text-secondary uppercase">Historial de Firmas</p>
                {approvalHistory.map((a: any) => (
                  <div key={a.id} className="text-xs text-secondary flex justify-between">
                    <span><b>{a.userName}</b> ({a.userEmail})</span>
                    <span className="badge" style={{ background: a.action === 'APPROVED' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', color: a.action === 'APPROVED' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {a.action === 'APPROVED' ? 'Aprobó' : 'Rechazó'}
                    </span>
                    <span>{new Date(a.createdAt).toLocaleString('es-CO')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-semibold text-primary mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', color: 'var(--accent-blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                {t('docs.aiAnalysis')}
              </h4>
              
              {selectedDoc.status.toUpperCase() === 'PENDING' ? (
                <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-surface-1">
                  <p className="text-sm font-medium text-secondary">{t('docs.aiLoading')}</p>
                </div>
              ) : (
                <div className="flex-col gap-4">
                  {/* Banner de estado */}
                  {selectedDoc.status.toUpperCase() === 'REVIEWED' ? (
                    <div className="p-4 text-center border rounded-lg mb-4" style={{ background: 'var(--accent-green-bg)', borderColor: 'var(--accent-green)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>{t('docs.aiAligned')}</p>
                    </div>
                  ) : (
                    <div className="p-4 text-center border rounded-lg mb-4" style={{ background: 'var(--accent-red-bg)', borderColor: 'var(--accent-red)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                        {language === 'es' ? 'Se encontraron observaciones en el documento.' : 'Observations were found in the document.'}
                      </p>
                    </div>
                  )}

                  {/* Listado de Hallazgos */}
                  {selectedDoc.findings && selectedDoc.findings.length > 0 ? (
                    <div className="flex-col gap-3">
                      <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                        {language === 'es' ? 'Hallazgos de IA Detectados' : 'Detected AI Findings'}
                      </p>
                      {selectedDoc.findings.map((finding: any) => {
                        const getSeverityColor = (sev: string) => {
                          switch(sev.toUpperCase()) {
                            case 'HIGH': return 'var(--accent-red)';
                            case 'MEDIUM': return 'var(--accent-gold)';
                            default: return 'var(--accent-blue)';
                          }
                        };
                        const getSeverityBg = (sev: string) => {
                          switch(sev.toUpperCase()) {
                            case 'HIGH': return 'var(--accent-red-bg)';
                            case 'MEDIUM': return 'var(--accent-gold-bg)';
                            default: return 'var(--accent-blue-bg)';
                          }
                        };
                        const getTypeLabel = (type: string) => {
                          switch(type.toUpperCase()) {
                            case 'GAP': return language === 'es' ? 'Brecha (GAP)' : 'Gap';
                            case 'RISK': return language === 'es' ? 'Riesgo' : 'Risk';
                            case 'RECOMMENDATION': return language === 'es' ? 'Recomendación' : 'Recommendation';
                            default: return language === 'es' ? 'Mejora' : 'Improvement';
                          }
                        };

                        return (
                          <div 
                            key={finding.id} 
                            className="p-3 rounded-lg border flex-col gap-2 bg-surface-1"
                            style={{ 
                              borderLeft: `4px solid ${getSeverityColor(finding.severity)}`,
                              borderColor: 'var(--border-color)',
                              marginBottom: '0.75rem'
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="badge text-xs font-bold" style={{ background: getSeverityBg(finding.severity), color: getSeverityColor(finding.severity) }}>
                                {getTypeLabel(finding.type)}
                              </span>
                              <span className="text-xs text-secondary font-semibold">
                                {language === 'es' ? `Cláusula ${finding.clause}` : `Clause ${finding.clause}`}
                              </span>
                            </div>
                            <p className="text-xs text-primary leading-relaxed">{finding.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-secondary text-center py-4">
                      {language === 'es' ? 'No se reportaron hallazgos detallados.' : 'No detailed findings reported.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
              <button className="btn btn-primary flex-1">{language === 'es' ? 'Aprobar Documento' : 'Approve Document'}</button>
              <button className="btn btn-secondary flex-1 border-red-200 text-red-600 hover:bg-red-50">{language === 'es' ? 'Devolver' : 'Return'}</button>
            </div>
          </div>
        )}

      </div>

      {showSignModal && signDoc && (
        <div className="modal-overlay flex-center" onClick={() => setShowSignModal(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">
                {signStep === 'request' ? 'Firma Electrónica' : 'Ingresar Token de Firma'}
              </h3>
              <button className="btn-icon" onClick={() => setShowSignModal(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--surface-1)' }}>
              <p className="text-sm font-semibold">Documento: {signDoc.name}</p>
              <p className="text-xs text-secondary mt-1">
                Acción: <span style={{ color: signAction === 'APPROVE' ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {signAction === 'APPROVE' ? 'APROBAR' : 'RECHAZAR'}
                </span>
              </p>
            </div>

            {signStep === 'request' ? (
              <div className="flex-col gap-4">
                <div className="p-4 rounded-lg text-center" style={{ background: 'var(--accent-blue-light)', border: '1px dashed var(--accent-blue)' }}>
                  <p className="text-sm text-secondary mb-2">Se generará un token de 6 dígitos y se enviará a su correo electrónico.</p>
                  <p className="text-xs text-muted">Este token es de un solo uso y sirve como su firma electrónica.</p>
                </div>
                <button className="btn btn-primary w-full" onClick={requestSignToken} disabled={signLoading}>
                  {signLoading ? 'Generando token...' : 'Solicitar Token de Firma'}
                </button>
              </div>
            ) : (
              <div className="flex-col gap-4">
                <div className="p-4 rounded-lg text-center" style={{ background: 'var(--accent-green-bg)', border: '1px dashed var(--accent-green)' }}>
                  <p className="text-sm text-secondary mb-1">Token enviado a su correo electrónico.</p>
                  <p className="text-xs text-muted">Revise su bandeja de entrada y copie el código de 6 dígitos.</p>
                </div>
                <div className="form-group flex-col gap-1">
                  <label className="form-label font-semibold">Token de Firma (6 dígitos)</label>
                  <input
                    className="form-input text-center"
                    style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 700 }}
                    maxLength={6}
                    value={signToken}
                    onChange={e => setSignToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted text-center">Revise la consola del servidor para ver el token generado.</p>
                <button className="btn btn-primary w-full" onClick={submitSignature} disabled={signLoading || signToken.length !== 6}>
                  {signLoading ? 'Verificando...' : `Confirmar ${signAction === 'APPROVE' ? 'Aprobación' : 'Rechazo'}`}
                </button>
              </div>
            )}

            {signError && (
              <div className="mt-3 p-3 rounded-lg text-sm font-medium text-center" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                {signError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
