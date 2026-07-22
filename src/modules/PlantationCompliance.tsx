import { useState } from 'react';
import { useUoc } from '../components/UoCContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

type PlantTab = 'panorama' | 'bpa' | 'mantenimiento' | 'sanidad' | 'documental';

interface Plantation {
  id: string; name: string; type: string; area: number; compliance: number; critical: number; status: string;
}

interface FieldRecord {
  id: string; task: string; plantation: string; lot: string; area: number; crew: string; date: string; status: string; meta: string; result: string;
}

interface SaniRecord {
  id: string; product: string; type: string; dose: string; lot: string; technician: string; date: string; status: string;
}

const plantations: Plantation[] = [
  { id: '1', name: 'Hacienda San Miguel', type: 'Propia', area: 1200, compliance: 92, critical: 0, status: 'Lista' },
  { id: '2', name: 'Finca El Roble', type: 'Propia', area: 850, compliance: 88, critical: 1, status: 'Lista' },
  { id: '3', name: 'Palmas del Río S.A.S.', type: 'Tercero', area: 1800, compliance: 65, critical: 3, status: 'Condicionada' },
  { id: '4', name: 'Asopalmar', type: 'Asociación', area: 650, compliance: 42, critical: 7, status: 'Riesgo Alto' },
  { id: '5', name: 'Cooperativa Horizonte', type: 'Grupo', area: 900, compliance: 28, critical: 12, status: 'Riesgo Crítico' },
];

const bpaRecords: FieldRecord[] = [
  { id: 'b1', task: 'Cobertura vegetal', plantation: 'San Miguel', lot: 'Lote A-1', area: 45, crew: 'Cuadrilla 3', date: '2026-07-12', status: 'OK', meta: '≥ 80% cobertura', result: '87%' },
  { id: 'b2', task: 'Manejo de suelos', plantation: 'El Roble', lot: 'Lote B-3', area: 32, crew: 'Cuadrilla 1', date: '2026-07-10', status: 'OK', meta: 'pH 5.5-6.5', result: 'pH 6.1' },
  { id: 'b3', task: 'Protección ribereña', plantation: 'San Miguel', lot: 'Ronda Río Claro', area: 8, crew: 'Cuadrilla 2', date: '2026-07-05', status: 'OK', meta: 'Franja ≥ 30m', result: '32m mantenida' },
  { id: 'b4', task: 'Cobertura vegetal', plantation: 'Palmas del Río', lot: 'Lote C-5', area: 60, crew: 'Cuadrilla 5', date: '2026-06-28', status: 'WARN', meta: '≥ 80% cobertura', result: '62%' },
  { id: 'b5', task: 'Manejo de suelos', plantation: 'Asopalmar', lot: 'Lote D-2', area: 25, crew: 'Cuadrilla 1', date: '2026-06-15', status: 'Pendiente', meta: 'pH 5.5-6.5', result: 'Pendiente' },
  { id: 'b6', task: 'Cobertura vegetal', plantation: 'El Roble', lot: 'Lote B-1', area: 38, crew: 'Cuadrilla 3', date: '2026-07-14', status: 'OK', meta: '≥ 80% cobertura', result: '91%' },
];

const maintRecords: FieldRecord[] = [
  { id: 'm1', task: 'Plateo', plantation: 'San Miguel', lot: 'Lote A-2', area: 28, crew: 'Cuadrilla 2', date: '2026-07-15', status: 'OK', meta: 'Ejecutado', result: 'Completo' },
  { id: 'm2', task: 'Poda', plantation: 'San Miguel', lot: 'Lote A-1', area: 45, crew: 'Cuadrilla 4', date: '2026-07-12', status: 'OK', meta: 'Ejecutado', result: 'Completo' },
  { id: 'm3', task: 'Control de arvenses', plantation: 'El Roble', lot: 'Lote B-2', area: 35, crew: 'Cuadrilla 1', date: '2026-07-10', status: 'OK', meta: 'Ejecutado', result: 'Completo' },
  { id: 'm4', task: 'Mantenimiento drenajes', plantation: 'Palmas del Río', lot: 'Lote C-3', area: 50, crew: 'Cuadrilla 3', date: '2026-07-08', status: 'WARN', meta: 'Ejecutado', result: 'Parcial 70%' },
  { id: 'm5', task: 'Plateo', plantation: 'El Roble', lot: 'Lote B-3', area: 32, crew: 'Cuadrilla 2', date: '2026-07-05', status: 'OK', meta: 'Ejecutado', result: 'Completo' },
  { id: 'm6', task: 'Poda', plantation: 'Asopalmar', lot: 'Lote D-1', area: 22, crew: 'Cuadrilla 1', date: '2026-06-20', status: 'Pendiente', meta: 'Ejecutado', result: 'No iniciado' },
  { id: 'm7', task: 'Control de arvenses', plantation: 'San Miguel', lot: 'Lote A-3', area: 30, crew: 'Cuadrilla 3', date: '2026-07-16', status: 'OK', meta: 'Ejecutado', result: 'Completo' },
];

const saniRecords: SaniRecord[] = [
  { id: 's1', product: 'KCl', type: 'Fertilizante', dose: '150 kg/ha', lot: 'San Miguel A-1', technician: 'Ing. Agrónomo San Miguel', date: '2026-07-10', status: 'Aplicado' },
  { id: 's2', product: 'Urea', type: 'Fertilizante', dose: '100 kg/ha', lot: 'El Roble B-2', technician: 'Ing. Agrónomo El Roble', date: '2026-07-08', status: 'Aplicado' },
  { id: 's3', product: 'Trichoderma spp.', type: 'Control biológico', dose: '2 L/ha', lot: 'San Miguel A-2', technician: 'Ing. Agrónomo San Miguel', date: '2026-07-05', status: 'Aplicado' },
  { id: 's4', product: 'Roca fosfórica', type: 'Fertilizante', dose: '200 kg/ha', lot: 'Palmas del Río C-4', technician: 'Técnico Palmas del Río', date: '2026-06-28', status: 'Pendiente' },
  { id: 's5', product: 'Beauveria bassiana', type: 'Control biológico', dose: '1.5 L/ha', lot: 'El Roble B-1', technician: 'Ing. Agrónomo El Roble', date: '2026-07-12', status: 'Aplicado' },
  { id: 's6', product: 'KCl', type: 'Fertilizante', dose: '180 kg/ha', lot: 'Asopalmar D-3', technician: 'Técnico Asopalmar', date: '2026-06-15', status: 'Pendiente' },
];

const docs = [
  { id: 'doc-1', doc: 'Plan de manejo agrícola', plantation: 'San Miguel', version: '3.2', validity: '2027-06-01', owner: 'Ing. Agrónomo San Miguel', status: 'Vigente' },
  { id: 'doc-2', doc: 'Inventario de agroquímicos', plantation: 'Todas', version: '2.1', validity: '2027-03-15', owner: 'Coordinador Ambiental', status: 'Vigente' },
  { id: 'doc-3', doc: 'Matriz legal', plantation: 'Todas', version: '4.0', validity: '2026-12-01', owner: 'Jurídica', status: 'Vigente' },
  { id: 'doc-4', doc: 'Plan de manejo agrícola', plantation: 'Palmas del Río', version: '1.5', validity: '2026-09-01', owner: 'Técnico Palmas del Río', status: 'Por actualizar' },
  { id: 'doc-5', doc: 'Procedimiento de fertilización', plantation: 'El Roble', version: '2.0', validity: '2027-01-15', owner: 'Ing. Agrónomo El Roble', status: 'Vigente' },
];

export default function PlantationCompliance() {
  const { selectedUoc } = useUoc();
  const { t, language } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState<PlantTab>('panorama');

  const tabs: { id: PlantTab; label: string }[] = [
    { id: 'panorama', label: language === 'es' ? 'Panorama' : 'Overview' },
    { id: 'bpa', label: language === 'es' ? 'BPA' : 'GAP' },
    { id: 'mantenimiento', label: language === 'es' ? 'Mantenimiento' : 'Maintenance' },
    { id: 'sanidad', label: language === 'es' ? 'Sanidad Vegetal' : 'Plant Health' },
    { id: 'documental', label: language === 'es' ? 'Control Documental' : 'Document Control' },
  ];

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'OK' || s === 'VIGENTE' || s === 'COMPLETO' || s === 'APLICADO' || s === 'LISTA') return <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{status}</span>;
    if (s === 'WARN' || s === 'CONDICIONADA' || s === 'POR ACTUALIZAR') return <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{status}</span>;
    return <span className="badge" style={{ background: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>{status}</span>;
  };

  const avgComp = Math.round(plantations.reduce((s, p) => s + p.compliance, 0) / plantations.length);
  const totalCritical = plantations.reduce((s, p) => s + p.critical, 0);
  const totalArea = plantations.reduce((s, p) => s + p.area, 0);

  const isMillOnly = selectedUoc?.type === 'MILL';

  const renderPanorama = () => (
    <div className="flex-col gap-6">
      {isMillOnly && (
        <div className="card p-4 flex items-center gap-3 border-l-4" style={{ background: 'var(--surface-2)', borderLeftColor: 'var(--accent-gold)' }}>
          <div className="text-xl">ℹ️</div>
          <div>
            <h4 className="font-bold text-sm text-primary">{t('plantations.naBannerTitle')}</h4>
            <p className="text-xs text-secondary mt-0.5">
              {language === 'es' 
                ? <>La UoC seleccionada <b>"{selectedUoc?.name}"</b> es de tipo <b>Solo Planta Extractora</b>. Las labores agronómicas de campo se administran en sus UoCs proveedoras de frutos.</>
                : <>Selected UoC <b>"{selectedUoc?.name}"</b> is <b>Mill Only</b>. Agronomic field operations are managed in supplying farm UoCs.</>}
            </p>
          </div>
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase">{t('plantations.count')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold text-primary">{plantations.length}</span><span className="text-sm text-muted">{totalArea.toLocaleString()} ha</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase">{t('plantations.avgCompliance')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>{avgComp}%</span><span className="text-sm text-muted">P&C 2024</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase" style={{ color: 'var(--accent-red)' }}>{t('plantations.criticalIssues')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{totalCritical}</span><span className="text-sm text-muted">{language === 'es' ? 'Pendientes' : 'Pending'}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase">{t('plantations.atRisk')}</div><div className="flex items-end justify-between mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{plantations.filter(p => p.status !== 'Lista').length}</span><span className="text-sm text-muted">{language === 'es' ? 'Plantaciones' : 'Farms'}</span></div></div>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[600px]">
            <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Plantación' : 'Plantation'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Tipo' : 'Type'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Área (ha)' : 'Area (ha)'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Cumplimiento' : 'Compliance'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Críticos' : 'Critical'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
            <tbody>
              {plantations.map(p => (
                <tr key={p.id} className="border-b hover:bg-surface-1">
                  <td className="p-4 font-semibold text-sm">{p.name}</td><td className="p-4 text-sm text-secondary">{p.type}</td>
                  <td className="p-4 text-sm">{p.area.toLocaleString()}</td>
                  <td className="p-4"><div className="flex items-center gap-2"><div className="w-16 bg-surface-2 h-1.5 rounded-full"><div className="h-full rounded-full" style={{ width: `${p.compliance}%`, background: 'var(--accent-blue)' }} /></div><span className="text-sm font-bold">{p.compliance}%</span></div></td>
                  <td className="p-4 text-sm font-bold" style={{ color: p.critical > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>{p.critical > 0 ? p.critical : '—'}</td>
                  <td className="p-4">{getStatusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFieldTable = (records: FieldRecord[]) => (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left min-w-[700px]">
          <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Labor' : 'Task'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Plantación' : 'Plantation'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Lote' : 'Lot'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Área (ha)' : 'Area (ha)'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Cuadrilla' : 'Crew'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Fecha' : 'Date'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Meta' : 'Target'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Resultado' : 'Result'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b hover:bg-surface-1">
                <td className="p-4 font-semibold text-sm">{r.task}</td><td className="p-4 text-sm text-secondary">{r.plantation}</td>
                <td className="p-4 text-sm font-mono">{r.lot}</td><td className="p-4 text-sm">{r.area}</td>
                <td className="p-4 text-sm">{r.crew}</td><td className="p-4 text-sm">{r.date}</td>
                <td className="p-4 text-sm">{r.meta}</td><td className="p-4 text-sm font-medium">{r.result}</td>
                <td className="p-4">{getStatusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex gap-1 flex-wrap overflow-x-auto" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={activeTab === tab.id ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ borderRadius: '6px 6px 0 0' }} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'panorama' && renderPanorama()}

      {activeTab === 'bpa' && (
        <div className="flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Buenas Prácticas Agrícolas (BPA)' : 'Good Agricultural Practices (GAP)'}</h3>
          {renderFieldTable(bpaRecords)}
        </div>
      )}

      {activeTab === 'mantenimiento' && (
        <div className="flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Mantenimiento del Cultivo' : 'Crop Maintenance'}</h3>
          {renderFieldTable(maintRecords)}
        </div>
      )}

      {activeTab === 'sanidad' && (
        <div className="flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Sanidad Vegetal y Manejo de Plagas' : 'Plant Health & Pest Management'}</h3>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Producto / Insumo' : 'Product / Input'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Tipo' : 'Type'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Dosis' : 'Dose'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Lote' : 'Lot'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Responsable Técnico' : 'Technician'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Fecha' : 'Date'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
                <tbody>
                  {saniRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-surface-1">
                      <td className="p-4 font-semibold text-sm">{r.product}</td><td className="p-4 text-sm">{r.type}</td>
                      <td className="p-4 text-sm font-mono">{r.dose}</td><td className="p-4 text-sm">{r.lot}</td>
                      <td className="p-4 text-sm text-secondary">{r.technician}</td>
                      <td className="p-4 text-sm">{r.date}</td>
                      <td className="p-4">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documental' && (
        <div className="flex-col gap-4">
          <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Control Documental de Fincas' : 'Farm Document Control'}</h3>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[600px]">
                <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Documento' : 'Document'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Plantación' : 'Plantation'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Versión' : 'Version'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Vigencia' : 'Validity'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Propietario' : 'Owner'}</th><th className="p-4 text-xs font-bold text-secondary uppercase">{language === 'es' ? 'Estado' : 'Status'}</th></tr></thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id} className="border-b hover:bg-surface-1">
                      <td className="p-4 font-semibold text-sm">{d.doc}</td><td className="p-4 text-sm text-secondary">{d.plantation}</td>
                      <td className="p-4 text-sm font-mono">{d.version}</td><td className="p-4 text-sm">{d.validity}</td>
                      <td className="p-4 text-sm">{d.owner}</td>
                      <td className="p-4">{getStatusBadge(d.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
