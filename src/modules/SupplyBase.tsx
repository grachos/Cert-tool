import { useState } from 'react';

interface SupplyUnit {
  id: string;
  name: string;
  identifier: string;
  type: 'propia' | 'tercero' | 'asociacion' | 'grupo';
  area: number;
  predios: number;
  polygonsValidated: number;
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  progress: number;
  status: string;
  responsible: string;
  lastEvaluation: string;
}

const riskColors: Record<string, { bg: string; color: string }> = {
  bajo: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' },
  medio: { bg: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' },
  alto: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)' },
  critico: { bg: '#fee2e2', color: '#dc2626' },
};

const demoData: SupplyUnit[] = [
  { id: '1', name: 'Hacienda San Miguel', identifier: 'SM-001', type: 'propia', area: 1200, predios: 4, polygonsValidated: 100, riskLevel: 'bajo', progress: 92, status: 'Activa', responsible: 'Ing. Agrónomo San Miguel', lastEvaluation: '2026-06-15' },
  { id: '2', name: 'Finca El Roble', identifier: 'ER-002', type: 'propia', area: 850, predios: 3, polygonsValidated: 100, riskLevel: 'bajo', progress: 88, status: 'Activa', responsible: 'Ing. Agrónomo El Roble', lastEvaluation: '2026-06-20' },
  { id: '3', name: 'Palmas del Río S.A.S.', identifier: 'PR-003', type: 'tercero', area: 1800, predios: 12, polygonsValidated: 95, riskLevel: 'medio', progress: 65, status: 'Condicionada', responsible: 'Gestor de Proveedores', lastEvaluation: '2026-05-10' },
  { id: '4', name: 'Asopalmar', identifier: 'AP-004', type: 'asociacion', area: 650, predios: 22, polygonsValidated: 85, riskLevel: 'alto', progress: 42, status: 'Riesgo Alto', responsible: 'Gestor de Proveedores', lastEvaluation: '2026-04-01' },
  { id: '5', name: 'Cooperativa Horizonte', identifier: 'CH-005', type: 'grupo', area: 900, predios: 15, polygonsValidated: 78, riskLevel: 'critico', progress: 28, status: 'Riesgo Crítico', responsible: 'Gestor de Proveedores', lastEvaluation: '2026-03-15' },
  { id: '6', name: 'El Porvenir', identifier: 'EP-006', type: 'tercero', area: 500, predios: 6, polygonsValidated: 100, riskLevel: 'medio', progress: 73, status: 'Activa', responsible: 'Gestor de Proveedores', lastEvaluation: '2026-06-30' },
];

export default function SupplyBase() {
  const [units] = useState<SupplyUnit[]>(demoData);

  const totalArea = units.reduce((s, u) => s + u.area, 0);
  const totalPredios = units.reduce((s, u) => s + u.predios, 0);
  const avgPolygons = Math.round(units.reduce((s, u) => s + u.polygonsValidated, 0) / units.length);
  const highRisk = units.filter(u => u.riskLevel === 'alto' || u.riskLevel === 'critico').length;
  const avgProgress = Math.round(units.reduce((s, u) => s + u.progress, 0) / units.length);

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Área Total</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{totalArea.toLocaleString()}</span><span className="text-sm text-muted">hectáreas</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Predios Activos</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{totalPredios}</span><span className="text-sm text-muted">{units.length} unidades</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Polígonos Validados</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{avgPolygons}%</span><span className="text-sm text-muted">promedio</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accent-red)' }}>Riesgo Alto / Crítico</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{highRisk}</span><span className="text-sm text-muted">grupos</span></div></div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Registro de Base de Suministro</h3>
        <span className="text-sm text-secondary">Avance promedio: <b style={{ color: 'var(--accent-blue)' }}>{avgProgress}%</b></span>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">Unidad / Grupo</th><th className="p-4 text-xs font-bold text-secondary uppercase">ID</th><th className="p-4 text-xs font-bold text-secondary uppercase">Tipo</th><th className="p-4 text-xs font-bold text-secondary uppercase">Área (ha)</th><th className="p-4 text-xs font-bold text-secondary uppercase">Predios</th><th className="p-4 text-xs font-bold text-secondary uppercase">Riesgo</th><th className="p-4 text-xs font-bold text-secondary uppercase">Avance</th><th className="p-4 text-xs font-bold text-secondary uppercase">Estado</th><th className="p-4 text-xs font-bold text-secondary uppercase">Última Eval.</th></tr></thead>
          <tbody>
            {units.map(u => (
              <tr key={u.id} className="border-b hover:bg-surface-1">
                <td className="p-4 font-semibold text-sm">{u.name}</td>
                <td className="p-4 text-sm font-mono text-secondary">{u.identifier}</td>
                <td className="p-4 text-sm text-secondary">{u.type === 'propia' ? 'Propia' : u.type === 'tercero' ? 'Tercero' : u.type === 'asociacion' ? 'Asociación' : 'Grupo'}</td>
                <td className="p-4 text-sm">{u.area.toLocaleString()}</td>
                <td className="p-4 text-sm">{u.predios}</td>
                <td className="p-4"><span className="badge" style={{ background: riskColors[u.riskLevel].bg, color: riskColors[u.riskLevel].color }}>{u.riskLevel.charAt(0).toUpperCase() + u.riskLevel.slice(1)}</span></td>
                <td className="p-4">
                  <div className="flex items-center gap-2"><div className="w-16 bg-surface-2 h-1.5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${u.progress}%`, background: 'var(--accent-blue)' }} /></div><span className="text-sm font-bold">{u.progress}%</span></div>
                </td>
                <td className="p-4"><span className="badge" style={{ background: u.status === 'Activa' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)', color: u.status === 'Activa' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{u.status}</span></td>
                <td className="p-4 text-sm text-secondary">{u.lastEvaluation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
