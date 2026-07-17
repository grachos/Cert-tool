import { useState } from 'react';
import { mockComplianceStatuses } from '../data/mock-data';
import { standards } from '../data/standards';
import type { StandardId } from '../types';

export default function Compliance() {
  const [selectedStandard, setSelectedStandard] = useState<StandardId | null>(null);

  const getStandard = (id: StandardId) => standards.find(s => s.id === id);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      
      {!selectedStandard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockComplianceStatuses.map((status) => {
            const standard = getStandard(status.standardId);
            if (!standard) return null;

            return (
              <div 
                key={status.standardId} 
                className="card cursor-pointer hover:border-blue-500 flex-col gap-4 border border-gray-200 shadow-sm"
                onClick={() => setSelectedStandard(status.standardId)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-md font-bold" style={{ width: '40px', height: '40px', background: `${standard.color}15`, color: standard.color, fontSize: '12px' }}>
                      {standard.icon}
                    </div>
                    <div className="flex-col">
                      <h3 className="font-bold text-primary">{standard.name}</h3>
                      <span className="text-xs text-secondary truncate" style={{ maxWidth: '150px' }}>{standard.fullName}</span>
                    </div>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: standard.color }}>{status.overallScore}%</span>
                </div>

                <div className="flex-col gap-1">
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Progreso de Implementación</span>
                    <span>{status.compliant}/{status.totalRequirements} Requisitos</span>
                  </div>
                  <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ width: `${status.overallScore}%`, background: standard.color }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-surface-1 p-2 rounded text-center border border-gray-200">
                    <span className="block text-xl font-bold text-accent-green">{status.compliant}</span>
                    <span className="text-xs text-secondary uppercase">Cumple</span>
                  </div>
                  <div className="bg-surface-1 p-2 rounded text-center border border-gray-200">
                    <span className="block text-xl font-bold text-accent-red">{status.nonCompliant}</span>
                    <span className="text-xs text-secondary uppercase">No Cumple</span>
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
              Volver al resumen
            </button>
          </div>
          
          <div className="card p-0 overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-surface-1 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-primary">{getStandard(selectedStandard)?.name} - Requisitos</h2>
                <p className="text-sm text-secondary mt-1">{getStandard(selectedStandard)?.fullName}</p>
              </div>
              <button className="btn btn-primary">Ejecutar Auto-Evaluación IA</button>
            </div>
            
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-gray-200">
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Cláusula</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Requisito</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Evidencias</th>
                  <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody>
                {getStandard(selectedStandard)?.requirements.map(req => (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-surface-1 transition-colors">
                    <td className="p-4 font-mono text-sm text-secondary">{req.clause}</td>
                    <td className="p-4">
                      <div className="flex-col">
                        <span className="font-semibold text-primary">{req.title}</span>
                        <span className="text-xs text-secondary mt-1">{req.description}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {req.status === 'compliant' && <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Cumple</span>}
                      {req.status === 'partial' && <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>Parcial</span>}
                      {req.status === 'non-compliant' && <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>No Cumple</span>}
                      {req.status === 'pending' && <span className="badge bg-gray-100 text-gray-600">Pendiente</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        <span className="text-sm font-medium">{req.evidenceCount}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <button className="btn btn-sm btn-ghost border border-gray-200 hover:border-gray-300">Auditar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
