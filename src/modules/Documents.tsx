import { useState } from 'react';
import { mockDocuments } from '../data/mock-data';
import { standards } from '../data/standards';
import type { Document, StandardId } from '../types';

export default function Documents() {
  const [filter, setFilter] = useState<StandardId | 'Todos'>('Todos');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  const filteredDocs = filter === 'Todos' 
    ? mockDocuments 
    : mockDocuments.filter(d => d.standard === filter);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'reviewed': return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Revisado</span>;
      case 'pending': return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>Pendiente</span>;
      case 'issues-found': return <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>Observaciones</span>;
      default: return <span className="badge bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getAiScoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-gold)';
    return 'var(--accent-red)';
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
            Todos
          </button>
          {standards.map(s => (
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
          {showUpload ? 'Cancelar' : 'Subir Documento'}
        </button>
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <div className="card border-dashed border-2 border-blue-300 hover:border-blue-500 transition-colors animate-slide-up" style={{ background: 'var(--accent-blue-light)' }}>
          <div className="flex-col items-center justify-center p-8 text-center">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ width: '48px', height: '48px', color: 'var(--accent-blue)', marginBottom: '1rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="text-lg font-bold text-primary mb-2">Arrastra archivos aquí o haz clic para seleccionar</h3>
            <p className="text-sm text-secondary mb-6">Soporta PDF, DOCX, XLSX (Max 50MB). La IA analizará el documento automáticamente.</p>
            <div className="flex gap-4 items-center">
              <select className="bg-white border border-gray-300 text-gray-900 rounded p-2 text-sm shadow-sm">
                <option value="">Seleccionar Norma...</option>
                {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="btn btn-primary shadow-sm">Seleccionar Archivos</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document List */}
        <div className={`card col-span-1 ${selectedDoc ? 'lg:col-span-2' : 'lg:col-span-3'} p-0 overflow-hidden transition-all duration-300 shadow-sm border-gray-200`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-1 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Documento</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Norma</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Estado</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Puntuación</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Fecha</th>
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
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="flex-col">
                        <span className="font-semibold text-primary text-sm">{doc.name}</span>
                        <span className="text-xs text-muted">{doc.size} • v{doc.version}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="badge bg-gray-100 text-gray-700 border border-gray-200">{doc.standard}</span>
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
                      <span className="text-sm text-muted">Pendiente</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-secondary">{doc.uploadDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Document Detail / AI Analysis Panel */}
        {selectedDoc && (
          <div className="card animate-slide-right flex-col border-l-4 shadow-md" style={{ borderLeftColor: standards.find(s => s.id === selectedDoc.standard)?.color || 'var(--accent-blue)' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-base font-bold text-primary">{selectedDoc.name}</h3>
                <p className="text-xs text-secondary mt-1">Subido por {selectedDoc.reviewer || 'Sistema'} el {selectedDoc.uploadDate}</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedDoc(null)}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-surface-1 p-4 rounded-lg text-center border border-gray-200">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Puntuación</p>
                <p className="text-3xl font-bold" style={{ color: getAiScoreColor(selectedDoc.aiScore || 0) }}>
                  {selectedDoc.aiScore || 0}%
                </p>
              </div>
              <div className="bg-surface-1 p-4 rounded-lg text-center border border-gray-200 flex flex-col justify-center items-center">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Estado</p>
                <div>{getStatusBadge(selectedDoc.status)}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <h4 className="font-semibold text-primary mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '18px', height: '18px', color: 'var(--accent-blue)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                Análisis Automatizado
              </h4>
              
              {selectedDoc.aiFindings && selectedDoc.aiFindings.length > 0 ? (
                <div className="flex-col gap-4">
                  {selectedDoc.aiFindings.map(finding => (
                    <div key={finding.id} className="p-4 border rounded-lg bg-white shadow-sm" style={{ borderColor: 'var(--accent-red)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>Riesgo Crítico</span>
                        <span className="text-xs font-semibold text-secondary">Cláusula {finding.clause}</span>
                      </div>
                      <p className="text-sm text-primary mb-3">{finding.description}</p>
                      <button className="btn btn-sm btn-secondary w-full">Generar Acción Correctiva</button>
                    </div>
                  ))}
                </div>
              ) : selectedDoc.status === 'pending' ? (
                <div className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-surface-1">
                  <svg className="animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <p className="text-sm font-medium text-secondary">Análisis en progreso...</p>
                </div>
              ) : (
                <div className="p-6 text-center border rounded-lg" style={{ background: 'var(--accent-green-bg)', borderColor: 'var(--accent-green)' }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="mx-auto mb-2" style={{ width: '32px', height: '32px', color: 'var(--accent-green)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>Documento alineado a la normativa.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
              <button className="btn btn-primary flex-1">Aprobar Documento</button>
              <button className="btn btn-secondary flex-1 border-red-200 text-red-600 hover:bg-red-50">Devolver</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
