import { useState } from 'react';
import { mockRisks } from '../data/mock-data';
import { standards } from '../data/standards';
import type { StandardId } from '../types';

export default function Risks() {
  const [filter, setFilter] = useState<StandardId | 'Todos'>('Todos');
  const [showMatrix, setShowMatrix] = useState(true);

  const filteredRisks = filter === 'Todos' 
    ? mockRisks 
    : mockRisks.filter(r => r.standard === filter);

  const getLevelColor = (level: string) => {
    switch(level) {
      case 'critical': return 'var(--accent-red)';
      case 'high': return 'var(--accent-gold)';
      case 'medium': return 'var(--accent-blue)';
      case 'low': return 'var(--accent-green)';
      default: return 'var(--text-muted)';
    }
  };

  const getRiskCount = (p: number, i: number) => {
    return filteredRisks.filter(r => r.probability === p && r.impact === i).length;
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
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => setShowMatrix(!showMatrix)}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            {showMatrix ? 'Ver Lista' : 'Ver Matriz'}
          </button>
          <button className="btn btn-primary">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nuevo Riesgo
          </button>
        </div>
      </div>

      {showMatrix ? (
        <div className="card animate-slide-up border border-gray-200">
          <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
            Matriz de Probabilidad e Impacto
            <span className="badge bg-gray-100 text-gray-600 border border-gray-200 ml-2">{filteredRisks.length} Riesgos Evaluados</span>
          </h3>
          
          <div className="flex gap-4">
            <div className="flex-col justify-between items-center py-8" style={{ width: '40px' }}>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Probabilidad</span>
            </div>
            
            <div className="flex-1 grid grid-cols-5 gap-1" style={{ aspectRatio: '2/1' }}>
              {[5, 4, 3, 2, 1].map((p) => (
                [1, 2, 3, 4, 5].map((i) => {
                  const count = getRiskCount(p, i);
                  // Calculate risk score to determine background color (1-25)
                  const score = p * i;
                  let bg = 'var(--surface-1)'; // very low
                  let color = 'var(--text-secondary)';
                  if (score >= 15) { bg = 'var(--accent-red-bg)'; color = 'var(--accent-red)'; }
                  else if (score >= 10) { bg = 'var(--accent-gold-bg)'; color = 'var(--accent-gold)'; }
                  else if (score >= 5) { bg = 'var(--accent-blue-light)'; color = 'var(--accent-blue)'; }
                  else if (score >= 2) { bg = 'var(--accent-green-bg)'; color = 'var(--accent-green)'; }

                  return (
                    <div 
                      key={`${p}-${i}`} 
                      className={`flex items-center justify-center rounded-sm transition-all border ${count > 0 ? 'border-gray-300 shadow-sm hover:scale-105 cursor-pointer' : 'border-transparent opacity-60'}`}
                      style={{ background: bg, color: color }}
                    >
                      {count > 0 && (
                        <span className="font-bold text-lg">{count}</span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest pl-12">Impacto</span>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden animate-slide-up border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-1 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Riesgo</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Norma</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider text-center">Nivel</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Responsable</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.map(risk => (
                <tr key={risk.id} className="border-b border-gray-100 hover:bg-surface-1 transition-colors">
                  <td className="p-4">
                    <div className="flex-col">
                      <span className="font-semibold text-primary text-sm">{risk.title}</span>
                      <span className="text-xs text-secondary mt-1">{risk.category}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="badge bg-gray-100 text-gray-700 border border-gray-200">{risk.standard}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <span className="badge border" style={{ 
                        color: getLevelColor(risk.level), 
                        borderColor: getLevelColor(risk.level),
                        background: `${getLevelColor(risk.level)}10`
                      }}>
                        P:{risk.probability} x I:{risk.impact}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-secondary">{risk.owner}</td>
                  <td className="p-4">
                    <span className="text-sm font-medium" style={{ color: risk.status === 'open' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                      {risk.status === 'open' ? 'Abierto' : risk.status === 'mitigated' ? 'Mitigado' : 'Cerrado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
