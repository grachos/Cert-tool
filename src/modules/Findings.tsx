import { useEffect, useState } from 'react';
import api from '../api';

interface Finding { id: string; type: string; status: string; description: string; clause?: string; requirementTitle?: string; auditTitle?: string; }

export default function Findings({ onNavigate }: { onNavigate: (module: 'actionPlans') => void }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/audits/findings/all').then(({ data }) => setFindings(data)).finally(() => setLoading(false)); }, []);
  const open = findings.filter(f => f.status !== 'CLOSED').length;
  return (
    <div className="flex-col gap-4 animate-fade-in">
      <div className="stats-grid"><div className="card"><span className="text-secondary text-sm">Total</span><div className="stat-value-lg">{findings.length}</div></div><div className="card"><span className="text-secondary text-sm">Abiertos</span><div className="stat-value-lg">{open}</div></div><div className="card"><span className="text-secondary text-sm">Cerrados</span><div className="stat-value-lg">{findings.length - open}</div></div></div>
      <div className="card p-0 overflow-hidden"><div className="p-4 border-b flex-between"><h3 className="text-lg font-bold">Hallazgos consolidados</h3><button className="btn btn-primary btn-sm" onClick={() => onNavigate('actionPlans')}>Ver planes de acción</button></div><div className="table-responsive"><table className="w-full text-left min-w-[760px]">
        <thead><tr className="bg-surface-1 border-b"><th className="p-4">Auditoría</th><th className="p-4">Requisito</th><th className="p-4">Tipo</th><th className="p-4">Descripción</th><th className="p-4">Estado</th></tr></thead>
        <tbody>{loading && <tr><td colSpan={5} className="p-6 text-center">Cargando hallazgos…</td></tr>}{!loading && findings.map(f => <tr key={f.id} className="border-b"><td className="p-4">{f.auditTitle || '—'}</td><td className="p-4"><strong>{f.clause}</strong><br/><small>{f.requirementTitle}</small></td><td className="p-4">{f.type}</td><td className="p-4">{f.description}</td><td className="p-4"><span className={`badge ${f.status === 'CLOSED' ? 'badge-success' : 'badge-pending'}`}>{f.status}</span></td></tr>)}{!loading && findings.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-secondary">No hay hallazgos registrados.</td></tr>}</tbody>
      </table></div></div>
    </div>
  );
}
