import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

type Tab = 'overview' | 'GAP' | 'MAINTENANCE' | 'PLANT_HEALTH' | 'INPUT' | 'DOCUMENT' | 'VISIT' | 'EVALUATION';

const tabConfig: Record<Tab, {
  label: string;
  icon: string;
  title: string;
  description: string;
  activityLabel: string;
  activityPlaceholder: string;
  descriptionPlaceholder: string;
  examples: string[];
}> = {
  overview: {
    label: 'Panorama', icon: '🌴', title: 'Panorama agrícola',
    description: 'Ficha individual, elegibilidad y desempeño de cada plantación.',
    activityLabel: '', activityPlaceholder: '', descriptionPlaceholder: '', examples: []
  },
  GAP: {
    label: 'BPA', icon: '🌱', title: 'Buenas Prácticas Agrícolas',
    description: 'Manejo de suelos, coberturas, protección hídrica, cosecha y conservación.',
    activityLabel: 'Práctica evaluada', activityPlaceholder: 'Ej. Cobertura vegetal',
    descriptionPlaceholder: 'Meta, área intervenida, lote, resultado y observaciones',
    examples: ['Cobertura vegetal', 'Manejo y análisis de suelos', 'Protección de rondas hídricas', 'Cosecha y calidad del RFF']
  },
  MAINTENANCE: {
    label: 'Mantenimiento', icon: '🛠️', title: 'Mantenimiento del cultivo',
    description: 'Labores agronómicas programadas y ejecutadas por lote.',
    activityLabel: 'Labor de cultivo', activityPlaceholder: 'Ej. Poda sanitaria',
    descriptionPlaceholder: 'Área, cuadrilla, meta de ejecución y resultado',
    examples: ['Plateo', 'Poda sanitaria', 'Control de arvenses', 'Mantenimiento de drenajes y vías']
  },
  PLANT_HEALTH: {
    label: 'Sanidad vegetal', icon: '🪲', title: 'Sanidad vegetal y manejo integrado de plagas',
    description: 'Monitoreos fitosanitarios, focos, incidencia y acciones de control.',
    activityLabel: 'Monitoreo o hallazgo', activityPlaceholder: 'Ej. Monitoreo de Rhynchophorus',
    descriptionPlaceholder: 'Plaga o enfermedad, incidencia, lote, umbral y medida adoptada',
    examples: ['Monitoreo de Rhynchophorus palmarum', 'Pudrición del cogollo', 'Marchitez letal', 'Plan de manejo integrado de plagas']
  },
  INPUT: {
    label: 'Insumos', icon: '🧪', title: 'Insumos y aplicaciones',
    description: 'Fertilización, productos fitosanitarios, dosis, responsables y trazabilidad.',
    activityLabel: 'Producto o aplicación', activityPlaceholder: 'Ej. Aplicación de KCl',
    descriptionPlaceholder: 'Producto, dosis, área, lote, equipo, carencia y responsable técnico',
    examples: ['Fertilización edáfica', 'Control biológico', 'Aplicación fitosanitaria', 'Calibración de equipos']
  },
  DOCUMENT: {
    label: 'Documentos', icon: '📄', title: 'Control documental agrícola',
    description: 'Planes, procedimientos, inventarios, registros y vigencias por plantación.',
    activityLabel: 'Documento', activityPlaceholder: 'Ej. Plan de manejo agrícola',
    descriptionPlaceholder: 'Código, versión, fecha de vigencia, responsable y ubicación',
    examples: ['Plan de manejo agrícola', 'Inventario de agroquímicos', 'Registro de aplicaciones', 'Procedimiento de fertilización']
  },
  VISIT: {
    label: 'Visitas', icon: '📍', title: 'Visitas y auditorías de campo',
    description: 'Inspecciones técnicas, compromisos, hallazgos y seguimiento.',
    activityLabel: 'Tipo de visita', activityPlaceholder: 'Ej. Visita técnica trimestral',
    descriptionPlaceholder: 'Objetivo, participantes, hallazgos, compromisos y próxima visita',
    examples: ['Visita técnica', 'Inspección interna', 'Auditoría de campo', 'Seguimiento a compromisos']
  },
  EVALUATION: {
    label: 'Evaluaciones P&C', icon: '✅', title: 'Evaluaciones RSPO P&C',
    description: 'Resultado verificable por requisito, criticidad y evidencia.',
    activityLabel: 'Requisito evaluado', activityPlaceholder: 'Ej. 7.1.1 Manejo integrado de plagas',
    descriptionPlaceholder: 'Criterio verificado, evidencia revisada y conclusión',
    examples: ['Principio 5 — Pequeños productores', 'Principio 7 — Manejo ambiental', 'Requisito crítico', 'Reevaluación de cierre']
  }
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente', IN_PROGRESS: 'En proceso', COMPLIANT: 'Cumple',
  COMPLETED: 'Completado', NON_COMPLIANT: 'No cumple'
};

const activityColumns: Record<Exclude<Tab, 'overview'>, Array<{ label: string; value: (activity: any) => string }>> = {
  GAP: [
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Práctica', value: a => a.title },
    { label: 'Meta y resultado', value: a => a.description || '—' },
    { label: 'Resultado', value: a => a.score == null ? '—' : `${a.score}%` },
    { label: 'Evidencia / responsable', value: a => a.responsible || '—' }
  ],
  MAINTENANCE: [
    { label: 'Fecha', value: a => a.activityDate ? String(a.activityDate).slice(0, 10) : '—' },
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Labor diaria', value: a => a.title },
    { label: 'Lote', value: a => a.plotName },
    { label: 'Área / cuadrilla / resultado', value: a => a.description || a.responsible || '—' }
  ],
  PLANT_HEALTH: [
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Monitoreo o hallazgo', value: a => a.title },
    { label: 'Incidencia y control', value: a => a.description || '—' },
    { label: 'Responsable técnico', value: a => a.responsible || '—' },
    { label: 'Fecha', value: a => a.activityDate ? String(a.activityDate).slice(0, 10) : '—' }
  ],
  INPUT: [
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Producto / aplicación', value: a => a.title },
    { label: 'Dosis, área y lote', value: a => a.description || '—' },
    { label: 'Responsable técnico', value: a => a.responsible || '—' },
    { label: 'Fecha de aplicación', value: a => a.activityDate ? String(a.activityDate).slice(0, 10) : '—' }
  ],
  DOCUMENT: [
    { label: 'Documento', value: a => a.title },
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Versión y vigencia', value: a => a.description || '—' },
    { label: 'Propietario', value: a => a.responsible || '—' },
    { label: 'Próxima revisión', value: a => a.dueDate ? String(a.dueDate).slice(0, 10) : '—' }
  ],
  VISIT: [
    { label: 'Fecha', value: a => a.activityDate ? String(a.activityDate).slice(0, 10) : '—' },
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Visita / auditoría', value: a => a.title },
    { label: 'Hallazgos y compromisos', value: a => a.description || '—' },
    { label: 'Responsable', value: a => a.responsible || '—' }
  ],
  EVALUATION: [
    { label: 'Plantación', value: a => a.farmName || a.plotName },
    { label: 'Requisito RSPO', value: a => a.title },
    { label: 'Evidencia y conclusión', value: a => a.description || '—' },
    { label: 'Puntaje', value: a => a.score == null ? '—' : `${a.score}%` },
    { label: 'Crítico', value: a => a.isCritical ? 'Sí' : 'No' }
  ]
};

export default function PlantationCompliance() {
  const { selectedUocId, selectedUoc } = useUoc();
  const { user } = useAuth();
  const [plots, setPlots] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [showPlot, setShowPlot] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [kmlPlot, setKmlPlot] = useState<any | null>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [fieldContext, setFieldContext] = useState('');
  const [soilStudies, setSoilStudies] = useState<Record<string, any[]>>({});
  const [analyzingKml, setAnalyzingKml] = useState(false);
  const [error, setError] = useState('');
  const [plotForm, setPlotForm] = useState({
    supplySourceId: '', name: '', farmName: '', area: '', plantedArea: '',
    estimatedProductionMt: '', eligibilityStatus: 'PENDING', certificationStatus: 'PENDING'
  });
  const [activityForm, setActivityForm] = useState({
    farmPlotId: '', title: '', description: '', status: 'PENDING',
    score: '', isCritical: false, responsible: '', activityDate: '', dueDate: ''
  });

  const canEdit = ['ADMIN', 'MANAGER', 'AUDITOR'].includes(user?.role || '');
  const canCreatePlot = ['ADMIN', 'MANAGER'].includes(user?.role || '');
  const current = tabConfig[tab];

  const load = () => {
    if (!selectedUocId || selectedUocId === 'all') return;
    const params = { uocId: selectedUocId };
    setError('');
    Promise.all([
      api.get('/rspo/farm-plots', { params }),
      api.get('/rspo/plantation-activities', { params }),
      api.get('/rspo/supply-sources', { params })
    ]).then(([plotRes, activityRes, sourceRes]) => {
      setPlots(plotRes.data);
      setActivities(activityRes.data);
      setSources(sourceRes.data);
    }).catch(e => setError(e.response?.data?.error || 'No fue posible cargar el cumplimiento agrícola.'));
  };

  useEffect(load, [selectedUocId]);

  const filtered = useMemo(
    () => tab === 'overview' ? [] : activities.filter(activity => activity.category === tab),
    [tab, activities]
  );

  const averageCompliance = plots.length
    ? Math.round(plots.reduce((sum, plot) => sum + Number(plot.compliance || 0), 0) / plots.length)
    : 0;
  const totalArea = plots.reduce((sum, plot) => sum + Number(plot.area || 0), 0);
  const openCritical = activities.filter(activity =>
    activity.isCritical && !['COMPLIANT', 'COMPLETED'].includes(activity.status)
  ).length;

  const createPlot = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/rspo/farm-plots', {
        ...plotForm,
        uocId: selectedUocId,
        area: Number(plotForm.area),
        plantedArea: Number(plotForm.plantedArea || plotForm.area),
        estimatedProductionMt: Number(plotForm.estimatedProductionMt)
      });
      setShowPlot(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar la plantación.');
    }
  };

  const createActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/rspo/plantation-activities', {
        ...activityForm,
        uocId: selectedUocId,
        category: tab,
        score: activityForm.score === '' ? null : Number(activityForm.score)
      });
      setShowActivity(false);
      setActivityForm({
        farmPlotId: '', title: '', description: '', status: 'PENDING',
        score: '', isCritical: false, responsible: '', activityDate: '', dueDate: ''
      });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar el registro.');
    }
  };

  const updateActivity = async (id: string, status: string) => {
    try {
      await api.put(`/rspo/plantation-activities/${id}`, { status });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible actualizar el registro.');
    }
  };

  const openActivityForm = (suggestedTitle = '') => {
    if (!plots.length) {
      setShowActivity(false);
      setError('Antes de registrar actividades debe crear una fuente en “Base de suministro” y luego una plantación o lote en la pestaña “Panorama”.');
      return;
    }
    setError('');
    if (suggestedTitle) setActivityForm(currentForm => ({ ...currentForm, title: suggestedTitle }));
    setShowActivity(true);
  };

  const openPlotForm = () => {
    if (!sources.length) {
      setShowPlot(false);
      setError('Primero registre una fuente, productor o plantación en el módulo “Base de suministro”. Después podrá crear aquí su lote agrícola.');
      return;
    }
    setError('');
    setShowPlot(value => !value);
  };

  const openKmlAnalysis = async (plot: any) => {
    setKmlPlot(plot);
    setKmlFile(null);
    setFieldContext('');
    setError('');
    try {
      const response = await api.get(`/rspo/farm-plots/${plot.id}/soil-studies`, { params: { uocId: selectedUocId } });
      setSoilStudies(current => ({ ...current, [plot.id]: response.data }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible cargar los estudios del lote.');
    }
  };

  const analyzeKml = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kmlPlot || !kmlFile) {
      setError('Seleccione el archivo KML del polígono.');
      return;
    }
    const form = new FormData();
    form.append('kml', kmlFile);
    form.append('fieldContext', fieldContext);
    setAnalyzingKml(true);
    setError('');
    try {
      const response = await api.post(`/rspo/farm-plots/${kmlPlot.id}/soil-studies`, form, {
        params: { uocId: selectedUocId },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSoilStudies(current => ({ ...current, [kmlPlot.id]: [response.data, ...(current[kmlPlot.id] || [])] }));
      setKmlFile(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible analizar el archivo KML.');
    } finally {
      setAnalyzingKml(false);
    }
  };

  if (!selectedUocId || selectedUocId === 'all') {
    return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>El cumplimiento agrícola se administra por unidad de certificación.</p></div>;
  }

  return <div className="flex-col gap-6 animate-fade-in">
    <section className="card" style={{ background: 'linear-gradient(135deg, #0b4a34, #176b47)', color: 'white' }}>
      <div className="flex-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-bold uppercase" style={{ color: '#bbf7d0' }}>Gestión agrícola · {selectedUoc?.name}</span>
          <h2 className="text-2xl font-bold mt-1">Núcleo de cumplimiento de plantaciones</h2>
          <p className="text-sm mt-1" style={{ color: '#d1fae5' }}>Información real organizada por finca, lote y tipo de labor.</p>
        </div>
        <div className="flex gap-4">
          <div><strong className="text-2xl">{plots.length}</strong><small className="block">lotes</small></div>
          <div><strong className="text-2xl">{totalArea.toLocaleString('es-CO')}</strong><small className="block">hectáreas</small></div>
          <div><strong className="text-2xl">{averageCompliance}%</strong><small className="block">cumplimiento</small></div>
        </div>
      </div>
    </section>

    <nav className="nexo-module-tabs">
      {(Object.keys(tabConfig) as Tab[]).map(id =>
        <button key={id} className={tab === id ? 'selected' : ''}
          onClick={() => { setTab(id); setShowActivity(false); }}>
          {tabConfig[id].icon} {tabConfig[id].label}
        </button>
      )}
    </nav>

    {error && <div className="integration-note">{error}</div>}

    {tab === 'overview' ? <div className="flex-col gap-5">
      <div className="stats-grid">
        <div className="card"><small>Plantaciones / lotes</small><div className="stat-value-lg">{plots.length}</div></div>
        <div className="card"><small>Cumplimiento promedio</small><div className="stat-value-lg">{averageCompliance}%</div></div>
        <div className="card"><small>Requisitos críticos abiertos</small><div className="stat-value-lg">{openCritical}</div></div>
        <div className="card"><small>Elegibles</small><div className="stat-value-lg">{plots.filter(p => p.eligibilityStatus === 'ELIGIBLE').length}</div></div>
      </div>
      <div className="flex-between">
        <div><h2 className="text-xl font-bold">Ficha individual de plantaciones</h2><p className="text-sm text-secondary">Cada lote conserva su propio estado y sus registros.</p></div>
        {canCreatePlot && <button className="btn btn-primary" onClick={openPlotForm}>+ Nueva plantación</button>}
      </div>
      {showPlot && <form className="card form-grid" onSubmit={createPlot}>
        <select required className="form-select" value={plotForm.supplySourceId} onChange={e => setPlotForm({ ...plotForm, supplySourceId: e.target.value })}><option value="">Fuente de suministro</option>{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select>
        <input required className="form-input" placeholder="Nombre del lote" value={plotForm.name} onChange={e => setPlotForm({ ...plotForm, name: e.target.value })} />
        <input required className="form-input" placeholder="Plantación o predio" value={plotForm.farmName} onChange={e => setPlotForm({ ...plotForm, farmName: e.target.value })} />
        <input required type="number" min="0" step="0.01" className="form-input" placeholder="Área total (ha)" value={plotForm.area} onChange={e => setPlotForm({ ...plotForm, area: e.target.value })} />
        <input type="number" min="0" step="0.01" className="form-input" placeholder="Área sembrada (ha)" value={plotForm.plantedArea} onChange={e => setPlotForm({ ...plotForm, plantedArea: e.target.value })} />
        <input type="number" min="0" step="0.01" className="form-input" placeholder="Producción estimada (TM)" value={plotForm.estimatedProductionMt} onChange={e => setPlotForm({ ...plotForm, estimatedProductionMt: e.target.value })} />
        <button className="btn btn-primary">Guardar ficha</button>
      </form>}
      {plots.length === 0 ? <div className="empty-state card"><h3>No hay plantaciones registradas</h3><p>Registre la primera ficha para iniciar la gestión agrícola.</p></div> :
        <section className="nexo-plant-grid">{plots.map(plot => {
          const score = Number(plot.compliance || 0);
          const critical = Number(plot.criticalRequirements || 0);
          const state = plot.eligibilityStatus === 'ELIGIBLE' ? 'Elegible' : plot.eligibilityStatus || 'Pendiente';
          return <article className="nexo-plant-unit" key={plot.id}>
            <div><span className="nexo-palm-avatar">♧</span><em className={`nexo-risk ${critical > 2 ? 'high' : critical ? 'medium' : 'low'}`}>{state}</em></div>
            <h3>{plot.farmName || plot.name}</h3>
            <p>{plot.sourceName || 'Fuente sin identificar'} · {Number(plot.area || 0).toLocaleString('es-CO')} ha</p>
            <small>Lote: {plot.name} · Certificación: {plot.certificationStatus || 'Pendiente'}</small>
            <div className="nexo-plant-score"><strong>{score}%</strong><span>{critical} críticos</span></div>
            <div className="progress"><i style={{ width: `${score}%` }} /></div>
            <div className="flex-between gap-2">
              <button onClick={() => setTab('EVALUATION')}>Ver seguimiento →</button>
              {canEdit && <button onClick={() => openKmlAnalysis(plot)}>📎 KML y suelo</button>}
            </div>
          </article>;
        })}</section>}
      {kmlPlot && <section className="card flex-col gap-4">
        <div className="flex-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-bold uppercase text-secondary">Geometría y suelo</span>
            <h2 className="text-xl font-bold">Polígono KML · {kmlPlot.farmName || kmlPlot.name}</h2>
            <p className="text-sm text-secondary">El sistema calcula área, perímetro y ubicación, y prepara un diagnóstico preliminar con plan de muestreo.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setKmlPlot(null)}>Cerrar</button>
        </div>
        <form className="form-grid" onSubmit={analyzeKml}>
          <div>
            <label className="form-label">Archivo del polígono (.kml)</label>
            <input required type="file" accept=".kml,application/vnd.google-earth.kml+xml" className="form-input"
              onChange={event => setKmlFile(event.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="form-label">Observaciones conocidas del terreno (opcional)</label>
            <textarea rows={3} className="form-input" value={fieldContext}
              placeholder="Ej. zona con encharcamiento, pendiente, análisis previo, edad del cultivo..."
              onChange={event => setFieldContext(event.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }} className="integration-note">
            <strong>Alcance técnico:</strong> el KML no mide pH, nutrientes, textura ni fertilidad. El resultado es preliminar y define qué observaciones y análisis de laboratorio se requieren.
          </div>
          <button className="btn btn-primary" disabled={analyzingKml}>{analyzingKml ? 'Analizando…' : 'Analizar polígono y suelo'}</button>
        </form>
        {(soilStudies[kmlPlot.id] || []).map(studyRecord => <article key={studyRecord.id} className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex-between gap-3 flex-wrap">
            <div><h3>{studyRecord.study.title}</h3><small>{studyRecord.originalFileName} · {String(studyRecord.createdAt).slice(0, 10)}</small></div>
            <span className="badge">{studyRecord.analysisMode === 'AI' ? 'Asistido por IA' : 'Diagnóstico preliminar local'}</span>
          </div>
          <div className="stats-grid mt-3">
            <div><small>Área KML</small><strong className="block">{Number(studyRecord.geometry.areaHa).toLocaleString('es-CO')} ha</strong></div>
            <div><small>Perímetro</small><strong className="block">{Number(studyRecord.geometry.perimeterKm).toLocaleString('es-CO')} km</strong></div>
            <div><small>Centroide</small><strong className="block">{studyRecord.geometry.centroid.latitude}, {studyRecord.geometry.centroid.longitude}</strong></div>
          </div>
          <p className="text-sm mt-3">{studyRecord.study.scope}</p>
          <div className="form-grid mt-3">
            <div><h4>Plan de muestreo</h4><ul>{studyRecord.study.samplingPlan.map((item: string) => <li key={item}>{item}</li>)}</ul></div>
            <div><h4>Análisis de laboratorio requeridos</h4><ul>{studyRecord.study.laboratoryTests.map((item: string) => <li key={item}>{item}</li>)}</ul></div>
            <div><h4>Verificaciones de campo</h4><ul>{studyRecord.study.fieldObservations.map((item: string) => <li key={item}>{item}</li>)}</ul></div>
            <div><h4>Limitaciones</h4><ul>{studyRecord.study.limitations.map((item: string) => <li key={item}>{item}</li>)}</ul></div>
          </div>
          <p className="integration-note mt-3"><strong>Importante:</strong> {studyRecord.study.disclaimer}</p>
        </article>)}
      </section>}
    </div> : <div className="flex-col gap-5">
      <div className="flex-between gap-4 flex-wrap">
        <div><h2 className="text-xl font-bold">{current.icon} {current.title}</h2><p className="text-sm text-secondary">{current.description}</p></div>
        {canEdit && <button className="btn btn-primary" onClick={() => openActivityForm()} disabled={!plots.length} title={!plots.length ? 'Primero registre una plantación o lote' : undefined}>+ Nuevo registro</button>}
      </div>

      {!plots.length && <div className="card p-4 border-l-4" style={{ borderLeftColor: 'var(--accent-gold)', background: 'var(--accent-gold-bg)' }}>
        <strong>Falta configurar la estructura agrícola de esta UoC</strong>
        <p className="text-sm mt-1">1. Cree la fuente en <b>Base de suministro</b>. 2. Regrese a <b>Panorama</b> y cree la plantación/lote. 3. Registre la actividad.</p>
        <button className="btn btn-secondary btn-sm mt-3" onClick={() => setTab('overview')}>Ir a Panorama</button>
      </div>}

      <div className="card p-4">
        <span className="text-xs font-bold text-secondary uppercase">Actividades habituales</span>
        <div className="flex gap-2 flex-wrap mt-2">{current.examples.map(example =>
          <button key={example} className="btn btn-secondary btn-sm" disabled={!plots.length} title={!plots.length ? 'Primero registre una plantación o lote' : undefined} onClick={() => openActivityForm(example)}>{example}</button>
        )}</div>
      </div>

      {showActivity && <form className="card form-grid" onSubmit={createActivity}>
        <select required className="form-select" value={activityForm.farmPlotId} onChange={e => setActivityForm({ ...activityForm, farmPlotId: e.target.value })}><option value="">Plantación / lote</option>{plots.map(plot => <option key={plot.id} value={plot.id}>{plot.farmName || plot.name} — {plot.name}</option>)}</select>
        <div><label className="form-label">{current.activityLabel}</label><input required className="form-input" placeholder={current.activityPlaceholder} value={activityForm.title} onChange={e => setActivityForm({ ...activityForm, title: e.target.value })} /></div>
        <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Detalle técnico</label><textarea className="form-input" rows={3} placeholder={current.descriptionPlaceholder} value={activityForm.description} onChange={e => setActivityForm({ ...activityForm, description: e.target.value })} /></div>
        <input className="form-input" placeholder="Responsable o cuadrilla" value={activityForm.responsible} onChange={e => setActivityForm({ ...activityForm, responsible: e.target.value })} />
        <input type="date" className="form-input" value={activityForm.activityDate} onChange={e => setActivityForm({ ...activityForm, activityDate: e.target.value })} />
        <input type="date" className="form-input" title="Fecha límite" value={activityForm.dueDate} onChange={e => setActivityForm({ ...activityForm, dueDate: e.target.value })} />
        {(tab === 'EVALUATION' || tab === 'GAP') && <input type="number" min="0" max="100" className="form-input" placeholder="Resultado o puntaje %" value={activityForm.score} onChange={e => setActivityForm({ ...activityForm, score: e.target.value })} />}
        <label className="form-label"><input type="checkbox" checked={activityForm.isCritical} onChange={e => setActivityForm({ ...activityForm, isCritical: e.target.checked })} /> Requisito crítico</label>
        <button className="btn btn-primary">Guardar registro</button>
      </form>}

      {filtered.length === 0 ? <div className="empty-state card"><h3>Sin registros de {current.label.toLowerCase()}</h3><p>Esta categoría se encuentra vacía; no se muestran actividades de otros submódulos.</p></div> :
        <div className="card p-0"><div className="table-responsive"><table className="w-full"><thead><tr>{activityColumns[tab].map(column => <th key={column.label}>{column.label}</th>)}<th>Estado</th></tr></thead><tbody>{filtered.map(activity =>
          <tr key={activity.id}>{activityColumns[tab].map(column => <td key={column.label}>{column.value(activity)}</td>)}<td>{canEdit ? <select className="form-select" value={activity.status} onChange={e => updateActivity(activity.id, e.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : statusLabels[activity.status] || activity.status}</td></tr>
        )}</tbody></table></div></div>}
    </div>}
  </div>;
}
