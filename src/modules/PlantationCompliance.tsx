import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';
import { MatrixView } from './PcComplianceHub';

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
    { label: 'Lote', value: a => a.lotName || 'Sin lote específico' },
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

const emptyPlotForm = {
  supplySourceId: '', farmName: '', locationDescription: '', latitude: '', longitude: '',
  area: '', plantedArea: '', estimatedProductionMt: '', fieldWorkers: '',
  administrativeWorkers: '', permanentWorkers: '', contractorWorkers: '', hasResidents: false,
  eligibilityStatus: 'PENDING', certificationStatus: 'PENDING'
};

const emptyLotForm = { id: '', farmPlotId: '', name: '', area: '', notes: '', status: 'ACTIVE' };
const emptyResidentForm = {
  id: '', farmPlotId: '', fullName: '', identifier: '', age: '',
  dataConsentAccepted: false, dataConsentHolderName: ''
};

export default function PlantationCompliance() {
  const { selectedUocId, selectedUoc } = useUoc();
  const { user } = useAuth();
  const [plots, setPlots] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [pcSummary, setPcSummary] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [showPlot, setShowPlot] = useState(false);
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
  const [expandedPlotId, setExpandedPlotId] = useState<string | null>(null);
  const [pcPlotId, setPcPlotId] = useState<string | null>(null);
  const [lotForm, setLotForm] = useState(emptyLotForm);
  const [residentForm, setResidentForm] = useState(emptyResidentForm);
  const [showActivity, setShowActivity] = useState(false);
  const [kmlPlot, setKmlPlot] = useState<any | null>(null);
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [fieldContext, setFieldContext] = useState('');
  const [soilStudies, setSoilStudies] = useState<Record<string, any[]>>({});
  const [analyzingKml, setAnalyzingKml] = useState(false);
  const [error, setError] = useState('');
  const [plotForm, setPlotForm] = useState(emptyPlotForm);
  const [activityForm, setActivityForm] = useState({
    farmPlotId: '', plantationLotId: '', title: '', description: '', status: 'PENDING',
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
      api.get('/rspo/supply-sources', { params }),
      api.get('/rspo/plantation-lots', { params }),
      api.get('/rspo/plantation-residents', { params }),
      api.get('/pc/summary')
    ]).then(([plotRes, activityRes, sourceRes, lotRes, residentRes, pcSummaryRes]) => {
      setPlots(Array.isArray(plotRes.data) ? plotRes.data : []);
      setActivities(Array.isArray(activityRes.data) ? activityRes.data : []);
      setSources(Array.isArray(sourceRes.data) ? sourceRes.data : []);
      setLots(Array.isArray(lotRes.data) ? lotRes.data : []);
      setResidents(Array.isArray(residentRes.data) ? residentRes.data : []);
      setPcSummary(pcSummaryRes.data || null);
    }).catch(e => {
      setPlots([]);
      setActivities([]);
      setSources([]);
      setLots([]);
      setResidents([]);
      setPcSummary(null);
      setError(e.response?.data?.error || 'No fue posible cargar el cumplimiento agrícola.');
    });
  };

  useEffect(load, [selectedUocId]);

  const safePlots = Array.isArray(plots) ? plots : [];
  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeSources = Array.isArray(sources) ? sources : [];
  const safeLots = Array.isArray(lots) ? lots : [];
  const safeResidents = Array.isArray(residents) ? residents : [];

  const filtered = useMemo(
    () => tab === 'overview' || !Array.isArray(activities) ? [] : activities.filter(activity => activity.category === tab),
    [tab, activities]
  );

  const plotComplianceById = new Map(
    (Array.isArray(pcSummary?.plantationCompliance) ? pcSummary.plantationCompliance : [])
      .map((item: any) => [item.id, item])
  );
  const averageCompliance = Number(pcSummary?.nucleusCompliance || 0);
  const totalArea = safePlots.reduce((sum, plot) => sum + Number(plot.area || 0), 0);
  const totalLots = safeLots.filter(lot => lot.status === 'ACTIVE').length;
  const openCritical = safeActivities.filter(activity =>
    activity.isCritical && !['COMPLIANT', 'COMPLETED'].includes(activity.status)
  ).length;
  const expandedPlot = safePlots.find(plot => plot.id === expandedPlotId);
  const expandedLots = safeLots.filter(lot => lot.farmPlotId === expandedPlotId);
  const expandedResidents = safeResidents.filter(resident => resident.farmPlotId === expandedPlotId);
  const expandedLotsArea = expandedLots
    .filter(lot => lot.status === 'ACTIVE')
    .reduce((sum, lot) => sum + Number(lot.area || 0), 0);

  const savePlot = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const body = {
        ...plotForm,
        name: plotForm.farmName,
        uocId: selectedUocId,
        area: Number(plotForm.area),
        plantedArea: Number(plotForm.plantedArea || plotForm.area),
        estimatedProductionMt: Number(plotForm.estimatedProductionMt),
        latitude: plotForm.latitude === '' ? null : Number(plotForm.latitude),
        longitude: plotForm.longitude === '' ? null : Number(plotForm.longitude),
        fieldWorkers: Number(plotForm.fieldWorkers || 0),
        administrativeWorkers: Number(plotForm.administrativeWorkers || 0),
        permanentWorkers: Number(plotForm.permanentWorkers || 0),
        contractorWorkers: Number(plotForm.contractorWorkers || 0)
      };
      if (editingPlotId) await api.put(`/rspo/farm-plots/${editingPlotId}`, body);
      else await api.post('/rspo/farm-plots', body);
      setShowPlot(false);
      setEditingPlotId(null);
      setPlotForm(emptyPlotForm);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar los datos de la plantación.');
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
        farmPlotId: '', plantationLotId: '', title: '', description: '', status: 'PENDING',
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
    if (!safePlots.length) {
      setShowActivity(false);
      setError('Antes de registrar actividades debe crear un productor en “Base de suministro” y luego una plantación en la pestaña “Panorama”.');
      return;
    }
    setError('');
    if (suggestedTitle) setActivityForm(currentForm => ({ ...currentForm, title: suggestedTitle }));
    setShowActivity(true);
  };

  const cancelPlotForm = () => {
    setShowPlot(false);
    setEditingPlotId(null);
  };

  const openPlantationDetail = (plotId: string) => {
    setExpandedPlotId(current => current === plotId ? null : plotId);
    setPcPlotId(null);
    setLotForm({ ...emptyLotForm, farmPlotId: plotId });
    setResidentForm({ ...emptyResidentForm, farmPlotId: plotId });
    setError('');
  };

  const saveLot = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const body = { ...lotForm, area: Number(lotForm.area), uocId: selectedUocId };
      if (lotForm.id) await api.put(`/rspo/plantation-lots/${lotForm.id}`, body);
      else await api.post('/rspo/plantation-lots', body);
      setLotForm({ ...emptyLotForm, farmPlotId: lotForm.farmPlotId });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar el lote.');
    }
  };

  const editLot = (lot: any) => setLotForm({
    id: lot.id,
    farmPlotId: lot.farmPlotId,
    name: lot.name || '',
    area: String(lot.area ?? ''),
    notes: lot.notes || '',
    status: lot.status || 'ACTIVE'
  });

  const toggleLotStatus = async (lot: any) => {
    try {
      await api.put(`/rspo/plantation-lots/${lot.id}`, { status: lot.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible cambiar el estado del lote.');
    }
  };

  const saveResident = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const body = { ...residentForm, age: Number(residentForm.age), uocId: selectedUocId };
      if (residentForm.id) await api.put(`/rspo/plantation-residents/${residentForm.id}`, body);
      else await api.post('/rspo/plantation-residents', body);
      setResidentForm({ ...emptyResidentForm, farmPlotId: residentForm.farmPlotId });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar la persona residente.');
    }
  };

  const editResident = (resident: any) => setResidentForm({
    id: resident.id,
    farmPlotId: resident.farmPlotId,
    fullName: resident.fullName || '',
    identifier: resident.identifier || '',
    age: String(resident.age ?? ''),
    dataConsentAccepted: Boolean(resident.dataConsentAccepted),
    dataConsentHolderName: resident.dataConsentHolderName || resident.fullName || ''
  });

  const openKmlAnalysis = async (plot: any) => {
    setKmlPlot(plot);
    setKmlFile(null);
    setFieldContext('');
    setError('');
    try {
      const response = await api.get(`/rspo/farm-plots/${plot.id}/soil-studies`, { params: { uocId: selectedUocId } });
      setSoilStudies(current => ({ ...current, [plot.id]: response.data }));
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible cargar los estudios de la plantación.');
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
          <h2 className="text-2xl font-bold mt-1">Cumplimiento P&amp;C Núcleo</h2>
          <p className="text-sm mt-1" style={{ color: '#d1fae5' }}>Evaluación independiente por plantación, con perfil automático para pequeños productores de 50 ha o menos.</p>
        </div>
        <div className="flex gap-4">
          <div><strong className="text-2xl">{safePlots.length}</strong><small className="block">plantaciones</small></div>
          <div><strong className="text-2xl">{totalLots}</strong><small className="block">lotes</small></div>
          <div><strong className="text-2xl">{totalArea.toLocaleString('es-CO')}</strong><small className="block">hectáreas</small></div>
          <div><strong className="text-2xl">{averageCompliance}%</strong><small className="block">cumplimiento</small></div>
        </div>
      </div>
    </section>

    <nav className="nexo-module-tabs">
      {(Object.keys(tabConfig) as Tab[]).filter(id => id !== 'EVALUATION').map(id =>
        <button key={id} className={tab === id ? 'selected' : ''}
          onClick={() => { setTab(id); setShowActivity(false); }}>
          {tabConfig[id].icon} {tabConfig[id].label}
        </button>
      )}
    </nav>

    {error && <div className="integration-note">{error}</div>}

    {tab === 'overview' ? <div className="flex-col gap-5">
      <div className="stats-grid">
        <div className="card"><small>Plantaciones</small><div className="stat-value-lg">{safePlots.length}</div></div>
        <div className="card"><small>Lotes registrados</small><div className="stat-value-lg">{totalLots}</div></div>
        <div className="card"><small>Cumplimiento promedio</small><div className="stat-value-lg">{averageCompliance}%</div></div>
        <div className="card"><small>Requisitos críticos abiertos</small><div className="stat-value-lg">{openCritical}</div></div>
      </div>
      <div className="flex-between">
        <div><h2 className="text-xl font-bold">Plantaciones del núcleo</h2><p className="text-sm text-secondary">Abra una plantación para consultar su ficha completa o evaluar su matriz P&amp;C. La creación y edición se realiza en Base de suministro.</p></div>
      </div>
      {showPlot && <form className="card flex-col gap-5" onSubmit={savePlot}>
        <div style={{ gridColumn: '1 / -1' }}>
          <h3>{editingPlotId ? 'Editar datos de la plantación' : 'Nueva plantación'}</h3>
          <p className="text-sm text-secondary">{editingPlotId ? 'Actualice la ficha sin perder lotes, actividades, residentes ni estudios KML.' : 'Registre la plantación; después podrá agregar todos sus lotes.'}</p>
        </div>
        <section className="form-grid">
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Razón social / nombre del productor</label>
            <select required disabled={Boolean(editingPlotId)} className="form-select" value={plotForm.supplySourceId} onChange={e => setPlotForm({ ...plotForm, supplySourceId: e.target.value })}>
              <option value="">Seleccione el productor</option>
              {safeSources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
            </select>
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Nombre de la plantación</label>
            <input required className="form-input" value={plotForm.farmName} onChange={e => setPlotForm({ ...plotForm, farmName: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label font-semibold">Ubicación o dirección del predio</label>
            <input required className="form-input" value={plotForm.locationDescription} onChange={e => setPlotForm({ ...plotForm, locationDescription: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Latitud</label>
            <input type="number" min="-90" max="90" step="0.0000001" className="form-input" placeholder="Ej. 7.1193490" value={plotForm.latitude} onChange={e => setPlotForm({ ...plotForm, latitude: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Longitud</label>
            <input type="number" min="-180" max="180" step="0.0000001" className="form-input" placeholder="Ej. -73.1227420" value={plotForm.longitude} onChange={e => setPlotForm({ ...plotForm, longitude: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Área total de la plantación (ha)</label>
            <input required type="number" min="0.01" step="0.01" className="form-input" value={plotForm.area} onChange={e => setPlotForm({ ...plotForm, area: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Área sembrada (ha)</label>
            <input type="number" min="0" step="0.01" className="form-input" value={plotForm.plantedArea} onChange={e => setPlotForm({ ...plotForm, plantedArea: e.target.value })} />
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Producción estimada (TM)</label>
            <input type="number" min="0" step="0.01" className="form-input" value={plotForm.estimatedProductionMt} onChange={e => setPlotForm({ ...plotForm, estimatedProductionMt: e.target.value })} />
          </div>
        </section>

        <section>
          <h4>Trabajadores de la plantación</h4>
          <p className="text-sm text-secondary">Registre la distribución; los totales se verifican en la ficha.</p>
          <div className="form-grid mt-3">
            <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Trabajadores de campo</label><input type="number" min="0" step="1" className="form-input" value={plotForm.fieldWorkers} onChange={e => setPlotForm({ ...plotForm, fieldWorkers: e.target.value })} /></div>
            <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Trabajadores administrativos</label><input type="number" min="0" step="1" className="form-input" value={plotForm.administrativeWorkers} onChange={e => setPlotForm({ ...plotForm, administrativeWorkers: e.target.value })} /></div>
            <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Personal fijo</label><input type="number" min="0" step="1" className="form-input" value={plotForm.permanentWorkers} onChange={e => setPlotForm({ ...plotForm, permanentWorkers: e.target.value })} /></div>
            <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Contratistas</label><input type="number" min="0" step="1" className="form-input" value={plotForm.contractorWorkers} onChange={e => setPlotForm({ ...plotForm, contractorWorkers: e.target.value })} /></div>
          </div>
        </section>

        <section className="form-grid">
          <label className="consent-check">
            <input type="checkbox" checked={plotForm.hasResidents} onChange={e => setPlotForm({ ...plotForm, hasResidents: e.target.checked })} />
            <span>En esta plantación viven trabajadores u otras personas.</span>
          </label>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Elegibilidad</label>
            <select className="form-select" value={plotForm.eligibilityStatus} onChange={e => setPlotForm({ ...plotForm, eligibilityStatus: e.target.value })}>
              <option value="PENDING">Pendiente</option><option value="ELIGIBLE">Elegible</option><option value="CONDITIONAL">Condicional</option><option value="INELIGIBLE">No elegible</option>
            </select>
          </div>
          <div className="form-group flex-col gap-1">
            <label className="form-label font-semibold">Certificación</label>
            <select className="form-select" value={plotForm.certificationStatus} onChange={e => setPlotForm({ ...plotForm, certificationStatus: e.target.value })}>
              <option value="PENDING">Pendiente</option><option value="CERTIFIED">Certificada</option><option value="CONVENTIONAL">Convencional</option><option value="SUSPENDED">Suspendida</option>
            </select>
          </div>
        </section>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary">{editingPlotId ? 'Guardar cambios' : 'Guardar ficha'}</button>
          <button type="button" className="btn btn-secondary" onClick={cancelPlotForm}>Cancelar</button>
        </div>
      </form>}
      {safePlots.length === 0 ? <div className="empty-state card"><h3>No hay plantaciones registradas</h3><p>Registre la primera plantación desde Base de suministro.</p></div> :
        <section className="pc-plantation-list">{safePlots.map(plot => {
          const complianceRecord: any = plotComplianceById.get(plot.id);
          const score = Number(complianceRecord?.compliance?.overall || 0);
          const critical = Number(complianceRecord?.compliance?.criticalNonCompliant || 0);
          const smallholder = Number(plot.area || 0) <= 50;
          const state = plot.eligibilityStatus === 'ELIGIBLE' ? 'Elegible' : plot.eligibilityStatus || 'Pendiente';
          return <article className="pc-plantation-row" key={plot.id}>
            <div className="pc-plantation-main">
              <span className="nexo-palm-avatar">♧</span>
              <div><h3>{plot.farmName || plot.name}</h3><p>{plot.sourceName || 'Productor sin identificar'} · {Number(plot.area || 0).toLocaleString('es-CO')} ha · {Number(plot.lotCount || 0)} lotes</p></div>
            </div>
            <div className="pc-plantation-profile"><span>{smallholder ? 'Pequeño productor' : 'Plantación'}</span><small>{smallholder ? '≤ 50 ha' : '> 50 ha'}</small></div>
            <div className="pc-plantation-result"><strong>{score}%</strong><span>{critical} críticos no conformes</span><div className="progress"><i style={{ width: `${score}%` }} /></div></div>
            <em className={`nexo-risk ${critical ? 'high' : 'low'}`}>{state}</em>
            <button className="btn btn-primary btn-sm" onClick={() => openPlantationDetail(plot.id)}>
              {expandedPlotId === plot.id ? 'Cerrar ficha' : 'Abrir ficha'}
            </button>
          </article>;
        })}</section>}
      {expandedPlot && <section className="card plantation-detail flex-col gap-5">
        <div className="flex-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-bold uppercase text-secondary">Ficha detallada de la plantación</span>
            <h2 className="text-xl font-bold">{expandedPlot.farmName || expandedPlot.name}</h2>
            <p className="text-sm text-secondary">{expandedPlot.locationDescription || 'Ubicación pendiente'} · {expandedPlot.latitude && expandedPlot.longitude ? `${expandedPlot.latitude}, ${expandedPlot.longitude}` : 'Coordenadas pendientes'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => openKmlAnalysis(expandedPlot)}>{expandedPlot.polygonReference ? 'Revisar KML y suelo' : 'Adjuntar KML y analizar suelo'}</button>}
            <button className="btn btn-primary btn-sm" onClick={() => setPcPlotId(current => current === expandedPlot.id ? null : expandedPlot.id)}>
              {pcPlotId === expandedPlot.id ? 'Cerrar matriz P&C' : 'Evaluar P&C'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setExpandedPlotId(null)}>Cerrar ficha</button>
          </div>
        </div>

        <div className="stats-grid">
          <div><small>Área de la plantación</small><strong className="block">{Number(expandedPlot.area || 0).toLocaleString('es-CO')} ha</strong></div>
          <div><small>Área distribuida en lotes</small><strong className="block">{expandedLotsArea.toLocaleString('es-CO')} ha</strong></div>
          <div><small>Campo / administrativos</small><strong className="block">{Number(expandedPlot.fieldWorkers || 0)} / {Number(expandedPlot.administrativeWorkers || 0)}</strong></div>
          <div><small>Fijos / contratistas</small><strong className="block">{Number(expandedPlot.permanentWorkers || 0)} / {Number(expandedPlot.contractorWorkers || 0)}</strong></div>
        </div>

        <div className="pc-plantation-information">
          <div><small>Productor o razón social</small><strong>{expandedPlot.sourceName || 'Pendiente'}</strong></div>
          <div><small>Perfil de evaluación</small><strong>{Number(expandedPlot.area || 0) <= 50 ? 'Pequeño productor (≤ 50 ha)' : 'Plantación'}</strong></div>
          <div><small>Área sembrada</small><strong>{Number(expandedPlot.plantedArea || 0).toLocaleString('es-CO')} ha</strong></div>
          <div><small>Producción estimada</small><strong>{Number(expandedPlot.estimatedProductionMt || 0).toLocaleString('es-CO')} t</strong></div>
          <div><small>Elegibilidad</small><strong>{expandedPlot.eligibilityStatus || 'Pendiente'}</strong></div>
          <div><small>Certificación</small><strong>{expandedPlot.certificationStatus || 'Pendiente'}</strong></div>
          <div><small>Polígono KML</small><strong>{expandedPlot.polygonReference ? 'Registrado' : 'Pendiente'}</strong></div>
          <div><small>Residentes</small><strong>{expandedPlot.hasResidents ? `${expandedResidents.length} relacionados` : 'No reporta'}</strong></div>
        </div>

        <div className={Math.abs(expandedLotsArea - Number(expandedPlot.area || 0)) <= 0.01 ? 'area-balance complete' : 'area-balance'}>
          <div className="flex-between gap-3">
            <strong>Distribución del área por lotes</strong>
            <span>{expandedLotsArea.toLocaleString('es-CO')} de {Number(expandedPlot.area || 0).toLocaleString('es-CO')} ha</span>
          </div>
          <div className="progress mt-2"><i style={{ width: `${Math.min(100, Number(expandedPlot.area) ? expandedLotsArea / Number(expandedPlot.area) * 100 : 0)}%` }} /></div>
          {Math.abs(expandedLotsArea - Number(expandedPlot.area || 0)) > 0.01 && <small>Faltan {(Number(expandedPlot.area || 0) - expandedLotsArea).toLocaleString('es-CO')} ha por distribuir.</small>}
        </div>

        <div className="plantation-detail-grid">
          <section className="detail-panel">
            <div>
              <span className="text-xs font-bold uppercase text-secondary">Lotes</span>
              <h3>{expandedLots.filter(lot => lot.status === 'ACTIVE').length} lotes registrados</h3>
            </div>
            <div className="record-list">
              {expandedLots.length === 0 ? <p className="text-sm text-secondary">Aún no hay lotes.</p> : expandedLots.map(lot => <div className="record-row" key={lot.id}>
                <div><strong>{lot.name}</strong><small>{Number(lot.area).toLocaleString('es-CO')} ha · {lot.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</small></div>
                {canCreatePlot && <div className="flex gap-1 flex-wrap">
                  <button className="btn btn-secondary btn-sm" onClick={() => editLot(lot)}>Editar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleLotStatus(lot)}>{lot.status === 'ACTIVE' ? 'Inactivar' : 'Activar'}</button>
                </div>}
              </div>)}
            </div>
            {canCreatePlot && <form className="form-grid detail-form" onSubmit={saveLot}>
              <input required className="form-input" placeholder="Nombre o número del lote" value={lotForm.farmPlotId === expandedPlot.id ? lotForm.name : ''} onChange={e => setLotForm({ ...lotForm, farmPlotId: expandedPlot.id, name: e.target.value })} />
              <input required type="number" min="0.01" step="0.01" className="form-input" placeholder="Área del lote (ha)" value={lotForm.farmPlotId === expandedPlot.id ? lotForm.area : ''} onChange={e => setLotForm({ ...lotForm, farmPlotId: expandedPlot.id, area: e.target.value })} />
              <textarea className="form-input" rows={2} placeholder="Observaciones" value={lotForm.farmPlotId === expandedPlot.id ? lotForm.notes : ''} onChange={e => setLotForm({ ...lotForm, farmPlotId: expandedPlot.id, notes: e.target.value })} />
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-primary btn-sm">{lotForm.id ? 'Actualizar lote' : 'Agregar lote'}</button>
                {lotForm.id && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLotForm({ ...emptyLotForm, farmPlotId: expandedPlot.id })}>Cancelar</button>}
              </div>
            </form>}
          </section>

          <section className="detail-panel">
            <div>
              <span className="text-xs font-bold uppercase text-secondary">Personas residentes</span>
              <h3>{expandedResidents.length} personas relacionadas</h3>
            </div>
            {!expandedPlot.hasResidents && expandedResidents.length === 0 ? <div className="integration-note">
              Esta plantación está registrada sin residentes. Puede cambiarlo desde “Editar datos de la plantación”.
            </div> : <>
              <div className="record-list">
                {expandedResidents.length === 0 ? <p className="text-sm text-secondary">Indique las personas que viven en la plantación.</p> : expandedResidents.map(resident => <div className="record-row" key={resident.id}>
                  <div><strong>{resident.fullName}</strong><small>CC ••••{String(resident.identifier).slice(-4)} · {resident.age} años</small></div>
                  {canCreatePlot && <button className="btn btn-secondary btn-sm" onClick={() => editResident(resident)}>Editar</button>}
                </div>)}
              </div>
              {canCreatePlot && <form className="form-grid detail-form" onSubmit={saveResident}>
                <input required className="form-input" placeholder="Nombre completo" value={residentForm.farmPlotId === expandedPlot.id ? residentForm.fullName : ''} onChange={e => setResidentForm({ ...residentForm, farmPlotId: expandedPlot.id, fullName: e.target.value })} />
                <input required className="form-input" placeholder="Cédula" value={residentForm.farmPlotId === expandedPlot.id ? residentForm.identifier : ''} onChange={e => setResidentForm({ ...residentForm, farmPlotId: expandedPlot.id, identifier: e.target.value })} />
                <input required type="number" min="0" max="120" step="1" className="form-input" placeholder="Edad" value={residentForm.farmPlotId === expandedPlot.id ? residentForm.age : ''} onChange={e => setResidentForm({ ...residentForm, farmPlotId: expandedPlot.id, age: e.target.value })} />
                <input required className="form-input" placeholder="Titular o representante que autoriza" value={residentForm.farmPlotId === expandedPlot.id ? residentForm.dataConsentHolderName : ''} onChange={e => setResidentForm({ ...residentForm, farmPlotId: expandedPlot.id, dataConsentHolderName: e.target.value })} />
                <label className="consent-check" style={{ gridColumn: '1 / -1' }}>
                  <input required type="checkbox" checked={residentForm.farmPlotId === expandedPlot.id && residentForm.dataConsentAccepted} onChange={e => setResidentForm({ ...residentForm, farmPlotId: expandedPlot.id, dataConsentAccepted: e.target.checked })} />
                  <span>El titular o su representante autoriza el tratamiento de estos datos conforme a la Ley 1581 de 2012 y la política de la UoC.</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-primary btn-sm">{residentForm.id ? 'Actualizar persona' : 'Agregar persona'}</button>
                  {residentForm.id && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setResidentForm({ ...emptyResidentForm, farmPlotId: expandedPlot.id })}>Cancelar</button>}
                </div>
              </form>}
            </>}
          </section>
        </div>
        {pcPlotId === expandedPlot.id && <section className="pc-plantation-matrix">
          <MatrixView farmPlotId={expandedPlot.id} scopeTitle={`Matriz P&C · ${expandedPlot.farmName || expandedPlot.name}`} onChanged={load} />
        </section>}
      </section>}
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
        {canEdit && <button className="btn btn-primary" onClick={() => openActivityForm()} disabled={!safePlots.length} title={!safePlots.length ? 'Primero registre una plantación' : undefined}>+ Nuevo registro</button>}
      </div>

      {!safePlots.length && <div className="card p-4 border-l-4" style={{ borderLeftColor: 'var(--accent-gold)', background: 'var(--accent-gold-bg)' }}>
        <strong>Falta configurar la estructura agrícola de esta UoC</strong>
        <p className="text-sm mt-1">1. Cree el productor en <b>Base de suministro</b>. 2. Regrese a <b>Panorama</b> y cree la plantación. 3. Agregue sus lotes y registros.</p>
        <button className="btn btn-secondary btn-sm mt-3" onClick={() => setTab('overview')}>Ir a Panorama</button>
      </div>}

      <div className="card p-4">
        <span className="text-xs font-bold text-secondary uppercase">Actividades habituales</span>
        <div className="flex gap-2 flex-wrap mt-2">{current.examples.map(example =>
          <button key={example} className="btn btn-secondary btn-sm" disabled={!safePlots.length} title={!safePlots.length ? 'Primero registre una plantación' : undefined} onClick={() => openActivityForm(example)}>{example}</button>
        )}</div>
      </div>

      {showActivity && <form className="card form-grid" onSubmit={createActivity}>
        <select required className="form-select" value={activityForm.farmPlotId} onChange={e => setActivityForm({ ...activityForm, farmPlotId: e.target.value, plantationLotId: '' })}><option value="">Plantación</option>{safePlots.map(plot => <option key={plot.id} value={plot.id}>{plot.farmName || plot.name}</option>)}</select>
        <select className="form-select" value={activityForm.plantationLotId} disabled={!activityForm.farmPlotId} onChange={e => setActivityForm({ ...activityForm, plantationLotId: e.target.value })}>
          <option value="">Todos los lotes / no aplica</option>
          {safeLots.filter(lot => lot.farmPlotId === activityForm.farmPlotId && lot.status === 'ACTIVE').map(lot => <option key={lot.id} value={lot.id}>{lot.name}</option>)}
        </select>
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
