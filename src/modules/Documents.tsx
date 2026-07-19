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
    </div>
  );
}
