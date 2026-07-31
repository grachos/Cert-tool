import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useAuth } from '../components/AuthContext';
import { useUoc } from '../components/UoCContext';
import Evidence from './Evidence';
import Findings from './Findings';
import ActionPlans from './ActionPlans';
import Audits from './Audits';

type PcTab = 'overview' | 'matrix' | 'evidence' | 'findings' | 'audits' | 'review' | 'reports';
type EvaluationStatus = 'NOT_EVALUATED' | 'IN_PROGRESS' | 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'PENDING_VERIFICATION' | 'CLOSED';

interface PcSummary {
  uoc: Record<string, any>;
  metrics: Record<string, number>;
  compliance: Record<string, any>;
  principleStats: Array<Record<string, any>>;
  processStats: Array<Record<string, any>>;
  alerts: Array<{ type: string; severity: string; count: number; label: string }>;
  latestManagementReview: Record<string, any> | null;
  plantationCompliance?: Array<Record<string, any>>;
  nucleusCompliance?: number;
}

interface PcIndicator {
  id: string;
  clause: string;
  title: string;
  description: string;
  principleCode: string;
  criterionCode: string;
  indicatorText?: string;
  officialText?: string;
  officialSourceUrl?: string;
  sourceLanguage?: string;
  officialImportedAt?: string;
  standardVersion: string;
  isCritical: boolean;
  expectedEvidence: string[];
  processCodes: string[];
  status: EvaluationStatus;
  applicability: string;
  complianceLevel: number | null;
  responsible?: string;
  processes: string[];
  result?: string;
  observation?: string;
  evaluatedAt?: string;
  dueDate?: string;
  noApplyJustification?: string;
  noApplyEvidenceId?: string;
  noApplyApprovedBy?: string;
  evidenceCount: number;
  findingCount: number;
  evidence?: Array<Record<string, any>>;
  findings?: Array<Record<string, any>>;
  actionPlans?: Array<Record<string, any>>;
  history?: Array<Record<string, any>>;
}

interface ManagementReview {
  id: string;
  reviewDate: string;
  participantsJson: string[];
  auditResults?: string;
  objectivesStatus?: string;
  indicatorsSummary?: string;
  legalCompliance?: string;
  risksSummary?: string;
  findingsSummary?: string;
  actionPlansSummary?: string;
  improvementNeeds?: string;
  decisions?: string;
  responsible?: string;
  dueDate?: string;
  status: string;
  progress: number;
}

const tabItems: Array<{ id: PcTab; label: string; short: string }> = [
  { id: 'overview', label: 'Resumen de la planta extractora', short: 'Resumen' },
  { id: 'matrix', label: 'Matriz P&C de la planta extractora', short: 'Matriz P&C' },
  { id: 'evidence', label: 'Evidencias', short: 'Evidencias' },
  { id: 'findings', label: 'Hallazgos y acciones', short: 'Hallazgos' },
  { id: 'audits', label: 'Auditorías', short: 'Auditorías' },
  { id: 'review', label: 'Revisión por la Dirección', short: 'Dirección' },
  { id: 'reports', label: 'Indicadores y reportes', short: 'Reportes' }
];

const statusLabels: Record<string, string> = {
  NOT_EVALUATED: 'No evaluado',
  IN_PROGRESS: 'En gestión',
  COMPLIANT: 'Cumple',
  PARTIAL: 'Cumplimiento parcial',
  NON_COMPLIANT: 'No cumple',
  NOT_APPLICABLE: 'No aplica',
  PENDING_VERIFICATION: 'Pendiente de verificación',
  CLOSED: 'Cerrado'
};

const statusTone: Record<string, string> = {
  COMPLIANT: 'success', CLOSED: 'success', PARTIAL: 'warning', IN_PROGRESS: 'info',
  NON_COMPLIANT: 'danger', NOT_APPLICABLE: 'neutral', PENDING_VERIFICATION: 'warning', NOT_EVALUATED: 'neutral'
};

const processOptions = [
  'Gerencia','Sostenibilidad','Planta extractora','Producción','Mantenimiento','Laboratorio',
  'Gestión humana','Seguridad y salud en el trabajo','Gestión ambiental','Compras','Contratistas',
  'Comunidades','Derechos humanos','Base de suministro','Plantaciones','Productores externos',
  'Cadena de suministro','Gestión documental','Auditoría interna'
];

function readPcTab(): PcTab {
  const [root, tab] = window.location.hash.replace(/^#/, '').split('/');
  if (root === 'pc' && tabItems.some(item => item.id === tab)) return tab as PcTab;
  return 'overview';
}

function StatCard({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: string }) {
  return <article className={`pc-stat ${tone ? `pc-stat-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function ComplianceBar({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return <div className="pc-progress">
    <div><strong>{label}</strong><span>{value}%</span></div>
    <div className="pc-progress-track"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    {detail && <small>{detail}</small>}
  </div>;
}

function Overview({ summary, loading, onOpen, onChanged }: {
  summary: PcSummary | null;
  loading: boolean;
  onOpen: (tab: PcTab) => void;
  onChanged: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [uocForm, setUocForm] = useState<Record<string, any>>({});
  const canEdit = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR'].includes(user?.role || '');
  useEffect(() => {
    if (summary?.uoc) setUocForm({ ...summary.uoc });
  }, [summary]);
  if (loading) return <div className="pc-loading">Cargando información real de la UoC…</div>;
  if (!summary) return <div className="pc-empty">No fue posible cargar el resumen P&C.</div>;
  const { uoc, metrics, compliance } = summary;
  const saveUoc = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setEditError('');
    try {
      await api.put(`/scc/uocs/${uoc.id}`, uocForm);
      await onChanged();
      setEditing(false);
    } catch (error: any) {
      setEditError(error.response?.data?.error || 'No fue posible guardar los datos de la UoC.');
    } finally { setSaving(false); }
  };
  return <div className="pc-view-stack">
    <section className="pc-executive">
      <div>
        <p className="pc-eyebrow">UNIDAD DE CERTIFICACIÓN · RSPO P&C 2024 V4.2</p>
        <h2>{uoc.name}</h2>
        <p>{uoc.scopeDescription || 'Alcance operativo y de certificación de la planta extractora.'}</p>
        <div className="pc-tags">
          <span>{uoc.millName || uoc.companyName}</span>
          <span>{uoc.certificationCode || 'Código por registrar'}</span>
          <span>{uoc.certificationBody || 'Organismo por registrar'}</span>
        </div>
      </div>
      <div className="pc-score">
        <strong>{compliance.overall}%</strong>
        <span>Cumplimiento condicionado por criticidad</span>
        <small>Base ponderada: {compliance.baseScore}%</small>
      </div>
    </section>
    {canEdit && <div className="pc-overview-actions"><button className="btn btn-secondary btn-sm" onClick={() => setEditing(value => !value)}>{editing ? 'Cancelar edición' : 'Editar datos de la UoC'}</button></div>}
    {editing && <form className="card pc-review-form pc-uoc-form" onSubmit={saveUoc}>
      <div className="pc-form-wide"><p className="pc-eyebrow">DATOS EJECUTIVOS</p><h3>Alcance de la Unidad de Certificación</h3><p>Estos datos identifican los reportes y el tablero P&amp;C.</p></div>
      <label>Nombre de la UoC<input className="form-input" required value={uocForm.name || ''} onChange={event => setUocForm({ ...uocForm, name: event.target.value })} /></label>
      <label>Empresa o razón social<input className="form-input" required value={uocForm.companyName || ''} onChange={event => setUocForm({ ...uocForm, companyName: event.target.value })} /></label>
      <label>Nombre de la planta extractora<input className="form-input" value={uocForm.millName || ''} onChange={event => setUocForm({ ...uocForm, millName: event.target.value })} /></label>
      <label>Número de membresía<input className="form-input" value={uocForm.membershipNumber || ''} onChange={event => setUocForm({ ...uocForm, membershipNumber: event.target.value })} /></label>
      <label>Código de certificación<input className="form-input" value={uocForm.certificationCode || ''} onChange={event => setUocForm({ ...uocForm, certificationCode: event.target.value })} /></label>
      <label>Organismo de certificación<input className="form-input" value={uocForm.certificationBody || ''} onChange={event => setUocForm({ ...uocForm, certificationBody: event.target.value })} /></label>
      <label>Tipo de certificación<input className="form-input" value={uocForm.certificationType || ''} onChange={event => setUocForm({ ...uocForm, certificationType: event.target.value })} /></label>
      <label>Capacidad de procesamiento (t)<input className="form-input" type="number" min="0" step="0.001" value={uocForm.processingCapacityMt ?? 0} onChange={event => setUocForm({ ...uocForm, processingCapacityMt: Number(event.target.value) })} /></label>
      <label>RFF estimado (t)<input className="form-input" type="number" min="0" step="0.001" value={uocForm.estimatedRffMt ?? 0} onChange={event => setUocForm({ ...uocForm, estimatedRffMt: Number(event.target.value) })} /></label>
      <label>RFF procesado (t)<input className="form-input" type="number" min="0" step="0.001" value={uocForm.processedRffMt ?? 0} onChange={event => setUocForm({ ...uocForm, processedRffMt: Number(event.target.value) })} /></label>
      <label>CPO producido (t)<input className="form-input" type="number" min="0" step="0.001" value={uocForm.cpoProducedMt ?? 0} onChange={event => setUocForm({ ...uocForm, cpoProducedMt: Number(event.target.value) })} /></label>
      <label>PK producido (t)<input className="form-input" type="number" min="0" step="0.001" value={uocForm.pkProducedMt ?? 0} onChange={event => setUocForm({ ...uocForm, pkProducedMt: Number(event.target.value) })} /></label>
      <label className="pc-form-wide">Alcance<textarea className="form-input" rows={3} value={uocForm.scopeDescription || ''} onChange={event => setUocForm({ ...uocForm, scopeDescription: event.target.value })} /></label>
      {editError && <div className="integration-note pc-form-wide">{editError}</div>}
      <div className="pc-review-submit"><button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar datos de la UoC'}</button></div>
    </form>}

    <section className="pc-stats-grid">
      <StatCard label="Capacidad de procesamiento" value={`${Number(uoc.processingCapacityMt).toLocaleString()} t`} />
      <StatCard label="RFF estimado" value={`${Number(uoc.estimatedRffMt).toLocaleString()} t`} />
      <StatCard label="RFF procesado" value={`${Number(uoc.processedRffMt).toLocaleString()} t`} />
      <StatCard label="CPO / PK" value={`${Number(uoc.cpoProducedMt).toLocaleString()} / ${Number(uoc.pkProducedMt).toLocaleString()} t`} />
    </section>

    <section className="pc-two-columns">
      <article className="card pc-panel">
        <div className="pc-panel-heading"><div><p className="pc-eyebrow">CONTROL NORMATIVO</p><h3>Estado de indicadores</h3></div><button className="btn btn-secondary btn-sm" onClick={() => onOpen('matrix')}>Abrir matriz</button></div>
        <div className="pc-status-grid">
          <StatCard label="Críticos conformes" value={`${compliance.criticalCompliant}/${compliance.criticalTotal}`} tone="success" />
          <StatCard label="Críticos pendientes" value={compliance.criticalPending} tone="warning" />
          <StatCard label="Críticos no conformes" value={compliance.criticalNonCompliant} tone="danger" />
          <StatCard label="No aplicables aprobados" value={compliance.notApplicable} />
          <StatCard label="No evaluados" value={compliance.statusCounts.NOT_EVALUATED || 0} />
          <StatCard label="Parciales" value={compliance.statusCounts.PARTIAL || 0} />
        </div>
        <div className="pc-progress-list">
          {summary.principleStats.map(item => <ComplianceBar key={item.name} label={item.name} value={item.overall} detail={`${item.applicable} indicadores aplicables`} />)}
        </div>
      </article>
      <article className="card pc-panel">
        <div className="pc-panel-heading"><div><p className="pc-eyebrow">SEGUIMIENTO</p><h3>Brechas y alertas</h3></div></div>
        <div className="pc-status-grid">
          <StatCard label="Hallazgos abiertos" value={metrics.openFindings} tone={metrics.openFindings ? 'danger' : 'success'} />
          <StatCard label="Acciones vencidas" value={metrics.overdueActions} tone={metrics.overdueActions ? 'danger' : 'success'} />
          <StatCard label="Documentos por vencer" value={metrics.expiringDocuments} tone={metrics.expiringDocuments ? 'warning' : 'success'} />
          <StatCard label="Riesgos críticos" value={metrics.criticalRisks} tone={metrics.criticalRisks ? 'danger' : 'success'} />
        </div>
        <div className="pc-alert-list">
          {summary.alerts.map(alert => <button key={alert.type} onClick={() => onOpen(alert.type.includes('AUDIT') ? 'audits' : 'matrix')}><span className={`pc-alert-dot ${alert.severity.toLowerCase()}`} /><strong>{alert.label}</strong><b>{alert.count}</b></button>)}
          {!summary.alerts.length && <div className="pc-empty compact">No hay alertas P&C calculadas.</div>}
        </div>
        <button className="btn btn-secondary w-full" onClick={() => onOpen('review')}>Revisión por la Dirección</button>
      </article>
    </section>
  </div>;
}

export function MatrixView({ farmPlotId, scopeTitle, onChanged }: {
  farmPlotId?: string;
  scopeTitle?: string;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<PcIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PcIndicator | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scopeMeta, setScopeMeta] = useState<Record<string, any>>({});
  const [filters, setFilters] = useState({ search: '', principle: '', status: '', critical: '', process: '' });
  const canEdit = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR','PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN'].includes(user?.role || '');
  const canApprove = ['SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','COORDINATOR','AUDITOR'].includes(user?.role || '');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
        ...(farmPlotId ? { farmPlotId } : {})
      };
      const { data } = await api.get('/pc/indicators', { params });
      setItems(Array.isArray(data?.indicators) ? data.indicators : Array.isArray(data) ? data : []);
      setScopeMeta(data?.scope || {});
    } catch (err: any) { setError(err.response?.data?.error || 'No fue posible cargar la matriz.'); setItems([]); }
    finally { setLoading(false); }
  }, [filters, farmPlotId]);

  useEffect(() => { const timer = setTimeout(load, 180); return () => clearTimeout(timer); }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/pc/indicators/${id}`, { params: farmPlotId ? { farmPlotId } : {} });
      setSelected(data);
    }
    catch (err: any) { setError(err.response?.data?.error || 'No fue posible abrir el indicador.'); }
    finally { setDetailLoading(false); }
  };

  const saveEvaluation = async (payload: Record<string, any>) => {
    if (!selected) return;
    await api.put(`/pc/indicators/${selected.id}/evaluation`, { ...payload, farmPlotId: farmPlotId || null });
    await openDetail(selected.id); await load(); onChanged();
  };

  const approveNoApply = async (approved: boolean) => {
    if (!selected) return;
    await api.post(`/pc/indicators/${selected.id}/no-applicability/approval`, { approved, farmPlotId: farmPlotId || null });
    await openDetail(selected.id); await load(); onChanged();
  };

  return <div className="pc-view-stack">
    <section className="pc-view-heading">
      <div>
        <p className="pc-eyebrow">{farmPlotId ? 'EVALUACIÓN POR PLANTACIÓN' : 'PLANTA EXTRACTORA'}</p>
        <h2>{scopeTitle || (farmPlotId ? scopeMeta?.farmPlot?.farmName || scopeMeta?.farmPlot?.name : 'Matriz P&C de la planta extractora')}</h2>
        <p>{farmPlotId
          ? `${scopeMeta.profileLabel || 'Plantación'} · evaluación independiente con evidencias propias.`
          : 'Único sitio de evaluación de los indicadores aplicables a la planta extractora.'}</p>
      </div>
      <span className="pc-version-badge">RSPO P&C 2024 · v4.2</span>
    </section>
    <section className="card pc-filters">
      <input className="form-input" aria-label="Buscar indicador" placeholder="Buscar código, indicador o texto…" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} />
      <select className="form-select" aria-label="Filtrar principio" value={filters.principle} onChange={event => setFilters({ ...filters, principle: event.target.value })}><option value="">Todos los principios</option>{[1,2,3,4,5,6,7].map(value => <option key={value} value={`P${value}`}>Principio {value}</option>)}</select>
      <select className="form-select" aria-label="Filtrar estado" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className="form-select" aria-label="Filtrar criticidad" value={filters.critical} onChange={event => setFilters({ ...filters, critical: event.target.value })}><option value="">Críticos y no críticos</option><option value="true">Solo críticos</option><option value="false">No críticos</option></select>
      <select className="form-select" aria-label="Filtrar proceso" value={filters.process} onChange={event => setFilters({ ...filters, process: event.target.value })}><option value="">Todos los procesos</option>{processOptions.map(process => <option key={process}>{process}</option>)}</select>
    </section>
    {error && <div className="integration-note">{error}</div>}
    {loading ? <div className="pc-loading">Cargando matriz…</div> : <div className="pc-indicator-list">
      {items.map(item => <button key={item.id} className="pc-indicator-card" onClick={() => openDetail(item.id)}>
        <div className="pc-indicator-code"><strong>{item.clause}</strong><span>{item.principleCode}</span></div>
        <div className="pc-indicator-copy"><div><h3>{item.title}</h3>{item.isCritical && <span className="pc-critical">CRÍTICO</span>}</div><p>{item.indicatorText || item.description}</p><small>{item.processes.length ? item.processes.join(' · ') : 'Proceso por asignar'}</small></div>
        <div className="pc-indicator-state"><span className={`pc-status pc-status-${statusTone[item.status]}`}>{statusLabels[item.status]}</span><small>{item.evidenceCount} evid. · {item.findingCount} hall.</small></div>
      </button>)}
      {!items.length && <div className="pc-empty">No hay indicadores que coincidan con los filtros.</div>}
    </div>}

    {(selected || detailLoading) && <IndicatorDrawer indicator={selected} farmPlotId={farmPlotId} loading={detailLoading} canEdit={canEdit} canApprove={canApprove} onClose={() => setSelected(null)} onSave={saveEvaluation} onApprove={approveNoApply} onRefresh={async () => { if (selected) await openDetail(selected.id); }} />}
  </div>;
}

function IndicatorDrawer({ indicator, farmPlotId, loading, canEdit, canApprove, onClose, onSave, onApprove, onRefresh }: {
  indicator: PcIndicator | null; loading: boolean; canEdit: boolean; canApprove: boolean;
  farmPlotId?: string;
  onClose: () => void;
  onSave: (payload: Record<string, any>) => Promise<void>;
  onApprove: (approved: boolean) => Promise<void>;
  onRefresh: () => Promise<void> | void;
}) {
  const [section, setSection] = useState<'evaluation' | 'evidence' | 'findings' | 'history'>('evaluation');
  const [saving, setSaving] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  useEffect(() => {
    if (!indicator) return;
    setForm({
      status: indicator.status, complianceLevel: indicator.complianceLevel ?? '',
      responsible: indicator.responsible || '', processes: indicator.processes || [],
      result: indicator.result || '', observation: indicator.observation || '',
      evaluatedAt: indicator.evaluatedAt?.slice(0, 10) || '', dueDate: indicator.dueDate?.slice(0, 10) || '',
      noApplyJustification: indicator.noApplyJustification || '', noApplyEvidenceId: indicator.noApplyEvidenceId || ''
    });
  }, [indicator]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { await onSave({ ...form, complianceLevel: form.complianceLevel === '' ? null : Number(form.complianceLevel) }); }
    finally { setSaving(false); }
  };
  const uploadEvidence = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!indicator || !evidenceFiles.length) return;
    setUploadingEvidence(true);
    setEvidenceError('');
    try {
      for (const file of evidenceFiles) {
        const binary = new FormData();
        binary.append('file', file);
        const { data: uploaded } = await api.post('/upload', binary, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        await api.post('/evidence', {
          title: `${evidenceTitle.trim() || file.name}|${uploaded.name}`,
          description: `Evidencia vinculada al indicador ${indicator.clause}`,
          standardId: 'RSPO',
          clause: indicator.clause,
          type: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
          status: 'PENDING_REVIEW',
          requirementId: indicator.id,
          farmPlotId: farmPlotId || null,
          indicator: indicator.clause,
          mimeType: uploaded.mimeType || file.type
        });
      }
      setEvidenceTitle('');
      setEvidenceFiles([]);
      await onRefresh();
    } catch (error: any) {
      setEvidenceError(error.response?.data?.error || 'No fue posible adjuntar las evidencias.');
    } finally {
      setUploadingEvidence(false);
    }
  };
  return <div className="pc-drawer-overlay" onClick={onClose}>
    <aside className="pc-drawer" onClick={event => event.stopPropagation()}>
      <div className="pc-drawer-head"><div>{indicator && <><p className="pc-eyebrow">{indicator.principleCode} · {indicator.criterionCode}</p><h2>{indicator.clause} — {indicator.title}</h2></>}</div><button className="btn-icon" onClick={onClose} aria-label="Cerrar ficha">×</button></div>
      {loading || !indicator ? <div className="pc-loading">Cargando ficha…</div> : <>
        <section className="pc-controlled-text">
          <div><span>Versión {indicator.standardVersion}</span>{indicator.isCritical && <b>INDICADOR CRÍTICO</b>}</div>
          <p>{indicator.officialText || indicator.indicatorText || indicator.description}</p>
          {indicator.officialText
            ? <small>Texto controlado importado desde la fuente autorizada · Idioma: {indicator.sourceLanguage || 'English'} · <a href={indicator.officialSourceUrl} target="_blank" rel="noreferrer">Fuente oficial RSPO</a></small>
            : <small>Resumen operativo existente. El campo de texto oficial controlado está preparado y requiere importación desde la fuente autorizada.</small>}
        </section>
        <nav className="pc-drawer-tabs">
          {(['evaluation','evidence','findings','history'] as const).map(item => <button key={item} className={section === item ? 'active' : ''} onClick={() => setSection(item)}>{item === 'evaluation' ? 'Evaluación' : item === 'evidence' ? `Evidencias (${indicator.evidence?.length || 0})` : item === 'findings' ? `Hallazgos (${indicator.findings?.length || 0})` : 'Historial'}</button>)}
        </nav>
        {section === 'evaluation' && <form className="pc-drawer-body pc-form" onSubmit={submit}>
          <label>Estado<select className="form-select" disabled={!canEdit} value={form.status || 'NOT_EVALUATED'} onChange={event => setForm({ ...form, status: event.target.value })}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Nivel de cumplimiento (%)<input className="form-input" disabled={!canEdit} type="number" min="0" max="100" value={form.complianceLevel ?? ''} onChange={event => setForm({ ...form, complianceLevel: event.target.value })} /></label>
          <label>Responsable<input className="form-input" disabled={!canEdit} value={form.responsible || ''} onChange={event => setForm({ ...form, responsible: event.target.value })} /></label>
          <label>Proceso<select className="form-select" disabled={!canEdit} value={form.processes?.[0] || ''} onChange={event => setForm({ ...form, processes: event.target.value ? [event.target.value] : [] })}><option value="">Seleccione</option>{processOptions.map(process => <option key={process}>{process}</option>)}</select></label>
          <label>Fecha de evaluación<input className="form-input" disabled={!canEdit} type="date" value={form.evaluatedAt || ''} onChange={event => setForm({ ...form, evaluatedAt: event.target.value })} /></label>
          <label>Fecha límite<input className="form-input" disabled={!canEdit} type="date" value={form.dueDate || ''} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
          <label className="pc-form-wide">Resultado<textarea className="form-input" disabled={!canEdit} rows={2} value={form.result || ''} onChange={event => setForm({ ...form, result: event.target.value })} /></label>
          <label className="pc-form-wide">Observación<textarea className="form-input" disabled={!canEdit} rows={3} value={form.observation || ''} onChange={event => setForm({ ...form, observation: event.target.value })} /></label>
          {form.status === 'NOT_APPLICABLE' && <div className="pc-na-box pc-form-wide"><strong>Solicitud obligatoria de No aplica</strong><label>Justificación<textarea className="form-input" disabled={!canEdit} required rows={3} value={form.noApplyJustification || ''} onChange={event => setForm({ ...form, noApplyJustification: event.target.value })} /></label><label>Evidencia de soporte<select className="form-select" disabled={!canEdit} required value={form.noApplyEvidenceId || ''} onChange={event => setForm({ ...form, noApplyEvidenceId: event.target.value })}><option value="">Seleccione una evidencia vinculada</option>{(indicator.evidence || []).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>}
          {canEdit && <button className="btn btn-primary pc-form-wide" disabled={saving}>{saving ? 'Guardando…' : 'Guardar evaluación'}</button>}
          {indicator.applicability === 'PENDING_APPROVAL' && canApprove && <div className="pc-approval pc-form-wide"><strong>Solicitud “No aplica” pendiente</strong><p>{indicator.noApplyJustification}</p><div><button type="button" className="btn btn-secondary" onClick={() => onApprove(false)}>Devolver</button><button type="button" className="btn btn-primary" onClick={() => onApprove(true)}>Aprobar No aplica</button></div></div>}
        </form>}
        {section === 'evidence' && <div className="pc-drawer-body pc-records">
          {canEdit && <form className="pc-evidence-upload" onSubmit={uploadEvidence}>
            <div>
              <strong>Adjuntar varias evidencias</strong>
              <span>Cada archivo quedará relacionado con este indicador y {farmPlotId ? 'esta plantación' : 'la planta extractora'}.</span>
            </div>
            <input className="form-input" placeholder="Título común (opcional)" value={evidenceTitle} onChange={event => setEvidenceTitle(event.target.value)} />
            <input className="form-input" required multiple type="file" onChange={event => setEvidenceFiles(Array.from(event.target.files || []))} />
            {evidenceFiles.length > 0 && <small>{evidenceFiles.length} archivo(s) seleccionado(s)</small>}
            {evidenceError && <div className="integration-note">{evidenceError}</div>}
            <button className="btn btn-primary" disabled={uploadingEvidence || !evidenceFiles.length}>{uploadingEvidence ? 'Adjuntando…' : 'Adjuntar evidencias'}</button>
          </form>}
          {(indicator.evidence || []).map(item => <article key={item.id}><div><strong>{String(item.title || '').split('|')[0]}</strong><span>{item.type} · {item.status}</span></div><small>{item.expiryDate ? `Vence: ${new Date(item.expiryDate).toLocaleDateString()}` : 'Sin vencimiento'}</small></article>)}
          {!indicator.evidence?.length && <div className="pc-empty">No hay evidencias vinculadas a este indicador.</div>}
        </div>}
        {section === 'findings' && <div className="pc-drawer-body pc-records">{(indicator.findings || []).map(item => <article key={item.id}><div><strong>{item.code || item.type}</strong><span>{item.description}</span></div><small>{item.workflowStatus || item.status}</small></article>)}{!indicator.findings?.length && <div className="pc-empty">No hay hallazgos asociados.</div>}</div>}
        {section === 'history' && <div className="pc-drawer-body pc-timeline">{(indicator.history || []).map(item => <article key={item.id}><i /><div><strong>{item.action}</strong><span>{item.userName} · {new Date(item.createdAt).toLocaleString()}</span><p>{item.previousStatus || 'Sin estado'} → {item.newStatus || 'Sin cambio'}</p></div></article>)}{!indicator.history?.length && <div className="pc-empty">Aún no hay cambios registrados.</div>}</div>}
      </>}
    </aside>
  </div>;
}

function FindingsAndActions({ onNavigate }: { onNavigate: (module: any) => void }) {
  const [view, setView] = useState<'findings' | 'actions'>('findings');
  return <div className="pc-view-stack"><div className="pc-subnav"><button className={view === 'findings' ? 'active' : ''} onClick={() => setView('findings')}>Hallazgos</button><button className={view === 'actions' ? 'active' : ''} onClick={() => setView('actions')}>Planes de acción</button></div>{view === 'findings' ? <Findings onNavigate={onNavigate} /> : <ActionPlans />}</div>;
}

function ManagementReviewView({ onChanged }: { onChanged: () => void }) {
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, any>>({ reviewDate: '', participants: '', auditResults: '', objectivesStatus: '', indicatorsSummary: '', legalCompliance: '', risksSummary: '', findingsSummary: '', actionPlansSummary: '', improvementNeeds: '', decisions: '', responsible: '', dueDate: '', status: 'DRAFT', progress: 0 });
  const load = useCallback(async () => {
    try { const { data } = await api.get('/pc/management-reviews'); setReviews(Array.isArray(data) ? data : []); }
    catch (err: any) { setError(err.response?.data?.error || 'No fue posible cargar las revisiones.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/pc/management-reviews', { ...form, participantsJson: String(form.participants).split(',').map(value => value.trim()).filter(Boolean) });
      setShowForm(false); await load(); onChanged();
    } catch (err: any) { setError(err.response?.data?.error || 'No fue posible guardar la revisión.'); }
    finally { setSaving(false); }
  };
  return <div className="pc-view-stack">
    <section className="pc-view-heading"><div><p className="pc-eyebrow">GOBIERNO Y MEJORA</p><h2>Revisión por la Dirección</h2><p>Decisiones, recursos y seguimiento gerencial con trazabilidad.</p></div><button className="btn btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cancelar' : '+ Nueva revisión'}</button></section>
    {error && <div className="integration-note">{error}</div>}
    {showForm && <form className="card pc-review-form" onSubmit={submit}>
      <label>Fecha<input className="form-input" type="date" required value={form.reviewDate} onChange={event => setForm({ ...form, reviewDate: event.target.value })} /></label>
      <label>Participantes<input className="form-input" placeholder="Separados por comas" value={form.participants} onChange={event => setForm({ ...form, participants: event.target.value })} /></label>
      <label>Responsable<input className="form-input" value={form.responsible} onChange={event => setForm({ ...form, responsible: event.target.value })} /></label>
      <label>Fecha de cumplimiento<input className="form-input" type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
      <label>Resultados de auditorías<textarea className="form-input" rows={3} value={form.auditResults} onChange={event => setForm({ ...form, auditResults: event.target.value })} /></label>
      <label>Estado de objetivos<textarea className="form-input" rows={3} value={form.objectivesStatus} onChange={event => setForm({ ...form, objectivesStatus: event.target.value })} /></label>
      <label>Indicadores<textarea className="form-input" rows={3} value={form.indicatorsSummary} onChange={event => setForm({ ...form, indicatorsSummary: event.target.value })} /></label>
      <label>Cumplimiento legal<textarea className="form-input" rows={3} value={form.legalCompliance} onChange={event => setForm({ ...form, legalCompliance: event.target.value })} /></label>
      <label>Riesgos<textarea className="form-input" rows={3} value={form.risksSummary} onChange={event => setForm({ ...form, risksSummary: event.target.value })} /></label>
      <label>Hallazgos y acciones<textarea className="form-input" rows={3} value={form.findingsSummary} onChange={event => setForm({ ...form, findingsSummary: event.target.value, actionPlansSummary: event.target.value })} /></label>
      <label>Necesidades de mejora<textarea className="form-input" rows={3} value={form.improvementNeeds} onChange={event => setForm({ ...form, improvementNeeds: event.target.value })} /></label>
      <label>Decisiones<textarea className="form-input" rows={3} value={form.decisions} onChange={event => setForm({ ...form, decisions: event.target.value })} /></label>
      <button className="btn btn-primary pc-review-submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar revisión'}</button>
    </form>}
    <div className="pc-review-grid">{reviews.map(review => <article className="card" key={review.id}><div className="pc-panel-heading"><div><p className="pc-eyebrow">{new Date(review.reviewDate).toLocaleDateString()}</p><h3>Revisión por la Dirección</h3></div><span className={`pc-status pc-status-${review.status === 'CLOSED' || review.status === 'APPROVED' ? 'success' : 'warning'}`}>{review.status}</span></div><ComplianceBar label="Avance" value={Number(review.progress || 0)} /><p><strong>Responsable:</strong> {review.responsible || 'Por asignar'}</p><p>{review.decisions || 'Decisiones pendientes de documentar.'}</p></article>)}{!reviews.length && <div className="pc-empty">No hay revisiones por la Dirección registradas.</div>}</div>
  </div>;
}

function ReportsView({ summary }: { summary: PcSummary | null }) {
  const [downloading, setDownloading] = useState('');
  const downloadReport = async (path: string, filename: string) => {
    setDownloading(path);
    try {
      const response = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
    } finally { setDownloading(''); }
  };
  return <div className="pc-view-stack">
    <section className="pc-view-heading"><div><p className="pc-eyebrow">CONTROL Y EXPORTACIÓN</p><h2>Indicadores y reportes</h2><p>Información calculada desde las evaluaciones reales de la UoC.</p></div></section>
    {summary && <section className="pc-two-columns">
      <article className="card pc-panel"><h3>Cumplimiento por principio</h3><div className="pc-progress-list">{summary.principleStats.map(item => <ComplianceBar key={item.name} label={item.name} value={item.overall} />)}</div></article>
      <article className="card pc-panel"><h3>Cumplimiento por proceso</h3><div className="pc-progress-list">{summary.processStats.slice(0, 12).map(item => <ComplianceBar key={item.name} label={item.name} value={item.overall} />)}</div></article>
    </section>}
    <section className="pc-report-grid">
      <article className="card"><span>EXCEL / CSV</span><h3>Matriz completa P&C</h3><p>Códigos, estados, responsables, evidencias y hallazgos, con trazabilidad de generación.</p><div className="flex gap-2 flex-wrap"><button className="btn btn-primary" onClick={() => downloadReport('/pc/reports/matrix.xls', 'matriz-pc.xls')} disabled={Boolean(downloading)}>{downloading.endsWith('.xls') ? 'Preparando…' : 'Descargar Excel'}</button><button className="btn btn-secondary" onClick={() => downloadReport('/pc/reports/matrix.csv', 'matriz-pc.csv')} disabled={Boolean(downloading)}>CSV</button></div></article>
      <article className="card"><span>PDF</span><h3>Informe ejecutivo</h3><p>Documento descargable con UoC, versión, fecha, usuario y resultado condicionado por criticidad.</p><button className="btn btn-secondary" onClick={() => downloadReport('/pc/reports/executive.pdf', 'informe-ejecutivo-pc.pdf')} disabled={Boolean(downloading)}>{downloading.endsWith('.pdf') ? 'Preparando…' : 'Descargar PDF'}</button></article>
      <article className="card"><span>EXPEDIENTE</span><h3>Auditoría y evidencias</h3><p>Los archivos autorizados se mantienen en las vistas de Auditorías y Evidencias, vinculados al indicador y la UoC.</p></article>
    </section>
  </div>;
}

export default function PcComplianceHub({ onNavigate }: { onNavigate: (module: any) => void }) {
  const { selectedUocId, selectedUoc } = useUoc();
  const [tab, setTab] = useState<PcTab>(readPcTab);
  const [summary, setSummary] = useState<PcSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!selectedUoc || selectedUocId === 'all') { setSummary(null); return; }
    setLoading(true); setError('');
    try { const { data } = await api.get('/pc/summary'); setSummary(data); }
    catch (err: any) { setError(err.response?.data?.error || 'No fue posible cargar Cumplimiento P&C.'); setSummary(null); }
    finally { setLoading(false); }
  }, [selectedUoc, selectedUocId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => {
    const change = () => setTab(readPcTab());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const open = (next: PcTab) => {
    setTab(next);
    if (window.location.hash !== `#pc/${next}`) window.location.hash = `pc/${next}`;
  };
  const content = useMemo(() => {
    if (!selectedUoc || selectedUocId === 'all') return <div className="card pc-select-uoc"><span>UC</span><h2>Seleccione una Unidad de Certificación</h2><p>El cumplimiento P&C no puede consolidarse sin un alcance específico.</p></div>;
    if (tab === 'overview') return <Overview summary={summary} loading={loading} onOpen={open} onChanged={loadSummary} />;
    if (tab === 'matrix') return <MatrixView onChanged={loadSummary} />;
    if (tab === 'evidence') return <Evidence />;
    if (tab === 'findings') return <FindingsAndActions onNavigate={onNavigate} />;
    if (tab === 'audits') return <Audits />;
    if (tab === 'review') return <ManagementReviewView onChanged={loadSummary} />;
    return <ReportsView summary={summary} />;
  }, [tab, selectedUoc, selectedUocId, summary, loading, loadSummary, onNavigate]);

  return <div className="pc-hub animate-fade-in">
    <div className="pc-title-row"><div><p className="pc-eyebrow">RSPO TECH</p><h1>Cumplimiento P&amp;C Planta Extractora</h1><p>Evaluación, evidencias y seguimiento exclusivos de la planta extractora.</p></div>{selectedUoc && <div className="pc-uoc-chip"><span>UoC activa</span><strong>{selectedUoc.name}</strong></div>}</div>
    <nav className="pc-tabbar" aria-label="Vistas de Cumplimiento P&C">{tabItems.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => open(item.id)} title={item.label}>{item.short}</button>)}</nav>
    {error && <div className="integration-note">{error}</div>}
    {content}
  </div>;
}
