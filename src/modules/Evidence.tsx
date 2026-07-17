import { useState, useEffect } from 'react';
import { standards } from '../data/standards';
import type { StandardId, Evidence as EvidenceType } from '../types';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

export default function Evidence() {
  const [evidence, setEvidence] = useState<EvidenceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StandardId>('BASC');
  const { t, language } = useThemeLanguage();
  
  useEffect(() => {
    api.get('/evidence').then(res => {
      setEvidence(res.data);
      setIsLoading(false);
    });
  }, []);

  const filteredEvidence = evidence.filter(e => e.standardId === activeTab);

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('evidence.loading')}</div>;
  }

  const getTranslatedStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'valid':
        return language === 'es' ? 'Vigente' : 'Valid';
      case 'expired':
        return language === 'es' ? 'Vencida' : 'Expired';
      case 'pending-review':
      default:
        return language === 'es' ? 'En Revisión' : 'Under Review';
    }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {standards.map(s => (
          <button
            key={s.id}
            className={`btn btn-sm ${activeTab === s.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(s.id as StandardId)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">
          {language === 'es' ? 'Repositorio de Evidencias' : 'Evidence Repository'} - {activeTab}
        </h3>
        <button className="btn btn-primary">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {language === 'es' ? 'Vincular Evidencia' : 'Link Evidence'}
        </button>
      </div>

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvidence.map(ev => (
          <div key={ev.id} className="card flex-col gap-4 border border-gray-200 hover:border-blue-300 shadow-sm transition-all">
            <div className="flex justify-between items-start">
              <div className="badge bg-gray-100 text-gray-700 border border-gray-200">
                {language === 'es' ? 'Cláusula' : 'Clause'} {ev.clause}
              </div>
              <span className="badge" style={{ 
                background: ev.status === 'valid' ? 'var(--accent-green-bg)' : ev.status === 'expired' ? 'var(--accent-red-bg)' : 'var(--accent-gold-bg)',
                color: ev.status === 'valid' ? 'var(--accent-green)' : ev.status === 'expired' ? 'var(--accent-red)' : 'var(--accent-gold)'
              }}>
                {getTranslatedStatus(ev.status)}
              </span>
            </div>
            
            <div>
              <h4 className="font-bold text-primary text-base">{ev.title}</h4>
              <p className="text-sm text-secondary mt-1">{ev.description}</p>
            </div>

            <div className="bg-surface-1 p-3 rounded border border-gray-200 mt-2">
              <div className="flex justify-between items-center text-xs text-secondary mb-2">
                <span>{language === 'es' ? 'Archivos Vinculados' : 'Linked Files'} ({ev.linkedDocuments.length})</span>
                <button className="text-blue-600 hover:underline font-medium">{language === 'es' ? 'Ver todos' : 'View all'}</button>
              </div>
              <div className="flex-col gap-2">
                {ev.linkedDocuments.slice(0, 2).map((docId, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100 shadow-sm">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <span className="text-xs text-primary truncate">{docId}.pdf</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
              <div className="flex-col">
                <span className="text-xs text-muted">{language === 'es' ? 'Subido el' : 'Uploaded on'}</span>
                <span className="text-sm font-medium text-primary">{ev.uploadDate}</span>
              </div>
              {ev.expiryDate && (
                <div className="flex-col text-right">
                  <span className="text-xs text-muted">{language === 'es' ? 'Vence el' : 'Expires on'}</span>
                  <span className={`text-sm font-medium ${ev.status === 'expired' ? 'text-red-600' : 'text-primary'}`}>{ev.expiryDate}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="card flex-col items-center justify-center border-dashed border-2 border-gray-300 bg-surface-1 cursor-pointer hover:bg-gray-50 transition-colors min-h-[300px]">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-sm">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </div>
          <p className="font-semibold text-primary">{language === 'es' ? 'Añadir Evidencia' : 'Add Evidence'}</p>
          <p className="text-xs text-secondary mt-1">{language === 'es' ? 'Sube archivos o vincula documentos existentes' : 'Upload files or link existing documents'}</p>
        </div>
      </div>
    </div>
  );
}
