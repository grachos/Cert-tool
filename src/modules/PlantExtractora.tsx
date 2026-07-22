import { useState, useEffect } from 'react';
import { useUoc } from '../components/UoCContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

interface PlantRecord {
  id: string; section: string; title: string; description: string;
  status: string; responsible: string; date: string; meta: string; result: string; extra: any;
}

type PlantTab = 'contratistas' | 'sst' | 'ambiente' | 'avc' | 'social' | 'negocios';

export default function PlantExtractora() {
  const { selectedUoc } = useUoc();
  const { t, language } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState<PlantTab>('contratistas');
  const [records, setRecords] = useState<PlantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isPlantationOnly = selectedUoc?.type === 'PLANTATION';

  const sectionLabels: Record<string, string> = {
    contratistas: language === 'es' ? 'Contratistas' : 'Contractors',
    sst: language === 'es' ? 'Seguridad y Salud (SST)' : 'OHS & Safety',
    ambiente: language === 'es' ? 'Gestión Ambiental' : 'Environmental Management',
    avc: language === 'es' ? 'AVC y Biodiversidad' : 'HCV & Biodiversity',
    social: language === 'es' ? 'Gestión Social' : 'Social Management',
    negocios: language === 'es' ? 'Plan de Negocios' : 'Business Plan'
  };

  const sectionColors: Record<string, string> = {
    contratistas: '#2563eb', sst: '#dc2626', ambiente: '#16a34a', avc: '#7c3aed', social: '#d97706', negocios: '#0891b2'
  };

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
    if (s === 'WARN' || s === 'PARTIAL') return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>⚠ {language === 'es' ? 'Revisar' : 'Review'}</span>;
    return <span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-muted)' }}>⏳ {status}</span>;
  };

  const tabs: { id: PlantTab; label: string }[] = [
    { id: 'contratistas', label: language === 'es' ? 'Contratistas' : 'Contractors' },
    { id: 'sst', label: 'SST / OHS' },
    { id: 'ambiente', label: language === 'es' ? 'Ambiental' : 'Environment' },
    { id: 'avc', label: language === 'es' ? 'AVC y Biodiversidad' : 'HCV & Biodiversity' },
    { id: 'social', label: 'Social' },
    { id: 'negocios', label: language === 'es' ? 'Plan de Negocios' : 'Business Plan' },
  ];

  const ok = records.filter(r => r.status === 'OK').length;
  const warn = records.filter(r => r.status === 'WARN' || r.status === 'Pendiente').length;
  const score = records.length > 0 ? Math.round((ok / records.length) * 100) : 0;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      {isPlantationOnly && (
        <div className="card p-4 flex items-center gap-3 border-l-4" style={{ background: 'var(--surface-2)', borderLeftColor: 'var(--accent-gold)' }}>
          <div className="text-xl">ℹ️</div>
          <div>
            <h4 className="font-bold text-sm text-primary">{t('plant.naBannerTitle')}</h4>
            <p className="text-xs text-secondary mt-0.5">
              {language === 'es' 
                ? <>La UoC seleccionada <b>"{selectedUoc?.name}"</b> es de tipo <b>Solo Plantación / Finca</b>. Las operaciones industriales de refinación y laboratorio de extractora aplican N/A (No Aplica) a nivel directo de esta finca.</>
                : <>Selected UoC <b>"{selectedUoc?.name}"</b> is <b>Plantation Only</b>. Industrial refining & mill lab operations apply N/A for this farm.</>}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('plant.verification')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{score}%</span><span className="text-sm text-muted">{ok}/{records.length} OK</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('plant.activeControls')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{records.length}</span><span className="text-sm text-muted">{language === 'es' ? 'Indicadores' : 'Indicators'}</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>{t('plant.attention')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{warn}</span><span className="text-sm text-muted">{language === 'es' ? 'Requieren revisión' : 'Need review'}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('plant.responsibles')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{new Set(records.map(r => r.responsible)).size}</span><span className="text-sm text-muted">{language === 'es' ? 'Asignados' : 'Assigned'}</span></div></div>
      </div>

      <div className="flex gap-1 flex-wrap overflow-x-auto" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ borderRadius: '6px 6px 0 0' }} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      <h3 className="text-lg font-bold text-primary" style={{ color: sectionColors[activeTab] }}>{t('plant.title')} — {sectionLabels[activeTab]}</h3>

      {loading ? <div className="text-center text-muted" style={{ padding: '2rem' }}>{language === 'es' ? 'Cargando...' : 'Loading...'}</div> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[600px]">
              <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Indicador' : 'Indicator'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Descripción' : 'Description'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Responsable' : 'Owner'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Meta' : 'Target'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Resultado' : 'Result'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
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
                {records.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted">{language === 'es' ? 'Sin registros para esta sección' : 'No records for this section'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contratistas' && records.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b bg-surface-1"><h4 className="font-bold text-sm">{language === 'es' ? 'Detalle de Contratistas' : 'Contractors Detail'}</h4></div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[600px]">
              <thead><tr className="bg-surface-1 border-b"><th className="p-3 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Contratista' : 'Contractor'}</th><th className="p-3 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Servicio' : 'Service'}</th><th className="p-3 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Trabajadores' : 'Workers'}</th><th className="p-3 text-xs font-bold text-secondary uppercase">SST</th><th className="p-3 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Vigencia Doc.' : 'Doc Expiry'}</th><th className="p-3 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Cumplimiento' : 'Compliance'}</th></tr></thead>
              <tbody>
                {records.map(r => (<tr key={r.id} className="border-b hover:bg-surface-1"><td className="p-3 font-semibold text-sm">{r.title}</td><td className="p-3 text-sm text-secondary">{r.description}</td><td className="p-3 text-sm">{r.extra?.workers || '—'}</td><td className="p-3">{r.extra?.sst === 'Completo' ? <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{language === 'es' ? 'Completo' : 'Complete'}</span> : <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>{language === 'es' ? 'Incompleto' : 'Incomplete'}</span>}</td><td className="p-3 text-sm">{r.extra?.docValidity || '—'}</td><td className="p-3">{getStatusBadge(r.status)}</td></tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
