import { useState, useEffect, useRef } from 'react';
import { standards } from '../data/standards';
import type { StandardId, Evidence as EvidenceType } from '../types';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

export default function Evidence() {
  const [evidence, setEvidence] = useState<EvidenceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StandardId>('BASC');
  const [activeStandards, setActiveStandards] = useState<any[]>([]);
  const { t, language } = useThemeLanguage();

  // Modal & Form States
  const [showModal, setShowModal] = useState(false);
  const [selectedClause, setSelectedClause] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceType, setEvidenceType] = useState<'DOCUMENT' | 'PHOTO' | 'RECORD' | 'REPORT' | 'CERTIFICATE'>('DOCUMENT');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEvidence = async () => {
    try {
      const res = await api.get('/evidence');
      setEvidence(res.data);
      return res.data;
    } catch (error) {
      console.error('Error al obtener evidencias', error);
      return [];
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get('/evidence'),
      api.get('/compliance/standards')
    ]).then(([evidenceRes, complianceRes]) => {
      setEvidence(evidenceRes.data);
      const activeIds = (complianceRes.data as any[]).map(s => s.standardId || s.id);
      const filtered = standards.filter(std => activeIds.includes(std.id));
      setActiveStandards(filtered);
      
      if (filtered.length > 0) {
        setActiveTab(filtered[0].id as StandardId);
      }
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Polling para actualizar las evidencias en revisión por la IA en tiempo real
  useEffect(() => {
    const hasPending = evidence.some(e => e.status.toLowerCase() === 'pending_review' || e.status.toLowerCase() === 'pending-review');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      const data = await fetchEvidence();
      const stillPending = data.some((e: any) => e.status.toLowerCase() === 'pending_review' || e.status.toLowerCase() === 'pending-review');
      if (!stillPending) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [evidence]);

  const activeStandard = standards.find(s => s.id === activeTab);
  const filteredEvidence = evidence.filter(e => e.standardId === activeTab);

  const getTranslatedStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return language === 'es' ? 'Vigente' : 'Valid';
      case 'expired':
        return language === 'es' ? 'Rechazada / Vencida' : 'Rejected / Expired';
      case 'pending_review':
      case 'pending-review':
      default:
        return language === 'es' ? 'Analizando...' : 'Analyzing...';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!selectedClause) {
      setErrorMsg(language === 'es' ? 'Por favor, selecciona una Cláusula antes.' : 'Please select a Clause first.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg(language === 'es' ? 'Por favor, ingresa un Título para la evidencia.' : 'Please enter a Title for the evidence.');
      return;
    }

    setErrorMsg('');
    setUploading(true);

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Subir archivo físico
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { name: compoundName } = uploadRes.data;

      // 2. Registrar evidencia en la base de datos
      const docRes = await api.post('/evidence', {
        title: `${title}|${compoundName}`,
        description: description || (language === 'es' ? 'Cargado por el usuario' : 'Uploaded by user'),
        standardId: activeTab,
        clause: selectedClause,
        type: evidenceType,
        expiryDate: expiryDate || null,
        status: 'PENDING_REVIEW'
      });

      setEvidence([docRes.data, ...evidence]);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || (language === 'es' ? 'Error al subir la evidencia.' : 'Error uploading evidence.'));
    } finally {
      setUploading(false);
    }
  };

  const triggerUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClause) {
      setErrorMsg(language === 'es' ? 'Por favor, selecciona una Cláusula.' : 'Please select a Clause.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg(language === 'es' ? 'Por favor, ingresa un Título.' : 'Please enter a Title.');
      return;
    }
    fileInputRef.current?.click();
  };

  const resetForm = () => {
    setSelectedClause('');
    setTitle('');
    setDescription('');
    setEvidenceType('DOCUMENT');
    setExpiryDate('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('evidence.loading')}</div>;
  }

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activeStandards.map(s => (
          <button
            key={s.id}
            className={`btn btn-sm ${activeTab === s.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(s.id as StandardId)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-bold text-primary">
          {language === 'es' ? 'Repositorio de Evidencias' : 'Evidence Repository'} - {activeTab}
        </h3>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {language === 'es' ? 'Vincular Evidencia' : 'Link Evidence'}
        </button>
      </div>

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvidence.map(ev => (
          <div key={ev.id} className="card flex-col gap-4 border border-gray-200 hover:border-blue-300 shadow-sm transition-all" style={{ minHeight: '300px' }}>
            <div className="flex justify-between items-start">
              <div className="badge bg-gray-100 text-gray-700 border border-gray-200">
                {language === 'es' ? 'Cláusula' : 'Clause'} {ev.clause}
              </div>
              <span className="badge text-xs font-bold" style={{ 
                background: ev.status === 'valid' ? 'var(--accent-green-bg)' : ev.status === 'expired' ? 'var(--accent-red-bg)' : 'var(--accent-gold-bg)',
                color: ev.status === 'valid' ? 'var(--accent-green)' : ev.status === 'expired' ? 'var(--accent-red)' : 'var(--accent-gold)'
              }}>
                {getTranslatedStatus(ev.status)}
              </span>
            </div>
            
            <div className="flex-col gap-1">
              <h4 className="font-bold text-primary text-base leading-snug">{ev.title}</h4>
              <p className="text-sm text-secondary leading-relaxed mt-1" style={{ whiteSpace: 'pre-wrap' }}>{ev.description}</p>
            </div>

            {ev.linkedDocuments && ev.linkedDocuments.length > 0 && (
              <div className="bg-surface-1 p-3 rounded border border-gray-200 mt-2">
                <div className="flex justify-between items-center text-xs text-secondary mb-2">
                  <span>{language === 'es' ? 'Archivo Adjunto' : 'Attached File'}</span>
                </div>
                <div className="flex-col gap-2">
                  {ev.linkedDocuments.map((docName, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100 shadow-sm">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      <span className="text-xs text-primary truncate" title={docName}>{docName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
              <div className="flex-col">
                <span className="text-xs text-muted">{language === 'es' ? 'Subido el' : 'Uploaded on'}</span>
                <span className="text-sm font-medium text-primary">{new Date(ev.uploadDate).toLocaleDateString()}</span>
              </div>
              {ev.expiryDate && (
                <div className="flex-col text-right">
                  <span className="text-xs text-muted">{language === 'es' ? 'Vence el' : 'Expires on'}</span>
                  <span className={`text-sm font-medium ${ev.status === 'expired' ? 'text-red-600' : 'text-primary'}`}>
                    {new Date(ev.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="card flex-col items-center justify-center border-dashed border-2 border-gray-300 bg-surface-1 cursor-pointer hover:bg-gray-50 transition-colors min-h-[300px]" onClick={() => setShowModal(true)}>
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-sm">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </div>
          <p className="font-semibold text-primary">{language === 'es' ? 'Añadir Evidencia' : 'Add Evidence'}</p>
          <p className="text-xs text-secondary mt-1">{language === 'es' ? 'Sube archivos para auditar con IA' : 'Upload files to audit with AI'}</p>
        </div>
      </div>

      {/* Modal: Vincular Evidencia */}
      {showModal && (
        <div className="modal-overlay flex-center" onClick={() => setShowModal(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary">
                {language === 'es' ? 'Vincular Nueva Evidencia' : 'Link New Evidence'} ({activeTab})
              </h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={triggerUpload} className="flex-col gap-4">
              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Cláusula / Requisito' : 'Clause / Requirement'}</label>
                <select
                  value={selectedClause}
                  onChange={(e) => setSelectedClause(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">{language === 'es' ? '-- Seleccione cláusula --' : '-- Select clause --'}</option>
                  {activeStandard?.requirements.map(r => (
                    <option key={r.id} value={r.clause}>
                      {r.clause} - {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Título de Evidencia' : 'Evidence Title'}</label>
                <input
                  type="text"
                  placeholder={language === 'es' ? 'Ej. Inspección de Contenedores Julio 2026' : 'e.g. Container Inspection July 2026'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Descripción' : 'Description'}</label>
                <textarea
                  placeholder={language === 'es' ? 'Detalles sobre la evidencia...' : 'Details about the evidence...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  rows={3}
                />
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Tipo de Documento' : 'Document Type'}</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value as any)}
                  className="form-input"
                >
                  <option value="DOCUMENT">{language === 'es' ? 'Documento' : 'Document'}</option>
                  <option value="PHOTO">{language === 'es' ? 'Foto' : 'Photo'}</option>
                  <option value="RECORD">{language === 'es' ? 'Registro' : 'Record'}</option>
                  <option value="REPORT">{language === 'es' ? 'Reporte' : 'Report'}</option>
                  <option value="CERTIFICATE">{language === 'es' ? 'Certificado' : 'Certificate'}</option>
                </select>
              </div>

              <div className="form-group flex-col gap-1">
                <label className="form-label font-semibold">{language === 'es' ? 'Fecha de Expiración (Opcional)' : 'Expiration Date (Optional)'}</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              />

              {errorMsg && (
                <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', fontWeight: 500 }}>
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploading}
                >
                  {uploading ? (language === 'es' ? 'Subiendo...' : 'Uploading...') : (language === 'es' ? 'Seleccionar y Auditar' : 'Select and Audit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
