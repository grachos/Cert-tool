import { useState, useEffect } from 'react';
import api from '../api';

interface PlantRecord {
  id: string; section: string; title: string; description: string;
  status: string; responsible: string; date: string; meta: string; result: string; extra: any;
}

type PlantTab = 'contratistas' | 'sst' | 'ambiente' | 'avc' | 'social' | 'negocios';

const sectionLabels: Record<string, string> = {
  contratistas: 'Contratistas', sst: 'Seguridad y Salud (SST)',
  ambiente: 'Gestión Ambiental', avc: 'AVC y Biodiversidad',
  social: 'Gestión Social', negocios: 'Plan de Negocios'
};

const sectionColors: Record<string, string> = {
  contratistas: '#2563eb', sst: '#dc2626', ambiente: '#16a34a', avc: '#7c3aed', social: '#d97706', negocios: '#0891b2'
};

export default function PlantExtractora() {
  const [activeTab, setActiveTab] = useState<PlantTab>('contratistas');
  const [records, setRecords] = useState<PlantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async (section?: string) => {
    setLoading(true);
    try {
      const params = section ? { section } : {};
      const { data } = await api.get('/plant/records', { params });
      setRecords(data);
    } catch (e) { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetch(activeTab); }, [activeTab]);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'OK' || s === 'COMPLIANT') return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>✓ OK</span>;
    if (s === 'WARN' || s === 'PARTIAL') return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>⚠ Revisar</span>;
    return <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>⏳ {status}</span>;
  };

  const tabs: { id: PlantTab; label: string }[] = [
    { id: 'contratistas', label: 'Contratistas' }, { id: 'sst', label: 'SST' },
    { id: 'ambiente', label: 'Ambiental' }, { id: 'avc', label: 'AVC y Biodiversidad' },
    { id: 'social', label: 'Social' }, { id: 'negocios', label: 'Plan de Negocios' },
  ];

  const ok = records.filter(r => r.status === 'OK').length;
  const warn = records.filter(r => r.status === 'WARN' || r.status === 'Pendiente').length;
  const score = records.length > 0 ? Math.round((ok / records.length) * 100) : 0;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Verificación</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{score}%</span><span className="text-sm text-muted">{ok}/{records.length} OK</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Controles Activos</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{records.length}</span><span className="text-sm text-muted">Indicadores</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>Atención</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{warn}</span><span className="text-sm text-muted">Requieren revisión</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Responsables</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{new Set(records.map(r => r.responsible)).size}</span><span className="text-sm text-muted">Asignados</span></div></div>
      </div>

      <div className="flex gap-1" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ borderRadius: '6px 6px 0 0' }} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <h3 className="text-lg font-bold text-primary" style={{ color: sectionColors[activeTab] }}>P&C Planta Extractora — {sectionLabels[activeTab]}</h3>

      {loading ? <div className="text-center text-muted" style={{ padding: '2rem' }}>Cargando...</div> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">Indicador</th><th className="p-4 text-xs font-bold text-secondary uppercase">Descripción</th><th className="p-4 text-xs font-bold text-secondary uppercase">Responsable</th><th className="p-4 text-xs font-bold text-secondary uppercase">Meta</th><th className="p-4 text-xs font-bold text-secondary uppercase">Resultado</th><th className="p-4 text-xs font-bold text-secondary uppercase">Estado</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b hover:bg-surface-1">
                  <td className="p-4 font-semibold text-sm">{r.title}</td>
                  <td className="p-4 text-sm text-secondary">{r.description}</td>
                  <td className="p-4 text-sm text-secondary">{r.responsible}</td>
                  <td className="p-4 text-sm font-mono">{r.meta || '—'}</td>
                  <td className="p-4 text-sm font-medium">{r.result || '—'}</td>
                  <td className="p-4">{getStatusBadge(r.status)}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted">Sin registros para esta sección</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'contratistas' && records.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b bg-surface-1"><h4 className="font-bold text-sm">Detalle de Contratistas</h4></div>
          <table className="w-full text-left">
            <thead><tr className="bg-white border-b"><th className="p-3 text-xs font-bold text-secondary uppercase">Contratista</th><th className="p-3 text-xs font-bold text-secondary uppercase">Servicio</th><th className="p-3 text-xs font-bold text-secondary uppercase">Trabajadores</th><th className="p-3 text-xs font-bold text-secondary uppercase">SST</th><th className="p-3 text-xs font-bold text-secondary uppercase">Vigencia Doc.</th><th className="p-3 text-xs font-bold text-secondary uppercase">Cumplimiento</th></tr></thead>
            <tbody>
              {records.map(r => (<tr key={r.id} className="border-b hover:bg-surface-1"><td className="p-3 font-semibold text-sm">{r.title}</td><td className="p-3 text-sm text-secondary">{r.description}</td><td className="p-3 text-sm">{r.extra?.workers || '—'}</td><td className="p-3">{r.extra?.sst === 'Completo' ? <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>Completo</span> : <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>Incompleto</span>}</td><td className="p-3 text-sm">{r.extra?.docValidity || '—'}</td><td className="p-3">{getStatusBadge(r.status)}</td></tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
