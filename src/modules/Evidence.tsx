import { useState } from 'react';
import { mockEvidence } from '../data/mock-data';
import { standards } from '../data/standards';
import type { StandardId } from '../types';

export default function Evidence() {
  const [activeTab, setActiveTab] = useState<StandardId>('BASC');
  
  const filteredEvidence = mockEvidence.filter(e => e.standard === activeTab);

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
        <h3 className="text-lg font-bold text-primary">Repositorio de Evidencias - {activeTab}</h3>
        <button className="btn btn-primary">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Vincular Evidencia
        </button>
      </div>

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvidence.map(ev => (
          <div key={ev.id} className="card flex-col gap-4 border border-gray-200 hover:border-blue-300 shadow-sm transition-all">
            <div className="flex justify-between items-start">
              <div className="badge bg-gray-100 text-gray-700 border border-gray-200">Cláusula {ev.clause}</div>
              {ev.status === 'valid' && <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Vigente</span>}
              {ev.status === 'expired' && <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>Vencida</span>}
              {ev.status === 'pending-review' && <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>En Revisión</span>}
            </div>
            
            <div>
              <h4 className="font-bold text-primary text-base">{ev.title}</h4>
              <p className="text-sm text-secondary mt-1">{ev.description}</p>
            </div>

            <div className="bg-surface-1 p-3 rounded border border-gray-200 mt-2">
              <div className="flex justify-between items-center text-xs text-secondary mb-2">
                <span>Archivos Vinculados ({ev.linkedDocuments.length})</span>
                <button className="text-blue-600 hover:underline font-medium">Ver todos</button>
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
                <span className="text-xs text-muted">Subido el</span>
                <span className="text-sm font-medium text-primary">{ev.uploadDate}</span>
              </div>
              {ev.expiryDate && (
                <div className="flex-col text-right">
                  <span className="text-xs text-muted">Vence el</span>
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
          <p className="font-semibold text-primary">Añadir Evidencia</p>
          <p className="text-xs text-secondary mt-1">Sube archivos o vincula documentos existentes</p>
        </div>
      </div>
    </div>
  );
}
