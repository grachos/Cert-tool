import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

interface SupplySource {
  id: string;
  name: string;
  identifier: string;
  personType?: 'NATURAL' | 'JURIDICAL';
  identifierType?: 'CC' | 'NIT';
  relationshipType?: 'PARTNER' | 'THIRD_PARTY' | 'SMALLHOLDER' | 'OWN';
  sourceType?: string;
  legalRepresentativeName?: string;
  legalRepresentativeId?: string;
  address?: string;
  phone?: string;
  email?: string;
  dataConsentAccepted?: boolean;
  dataConsentHolderName?: string;
  plantationCount?: number;
  plantationArea?: number;
  riskLevel: string;
  eligibilityStatus: string;
  certificationStatus: string;
  status?: string;
  notes?: string;
}

interface FarmPlot {
  id: string;
  supplySourceId: string;
  farmName?: string;
  name?: string;
  sourceName?: string;
  locationDescription?: string;
  latitude?: number | null;
  longitude?: number | null;
  area: number;
  plantedArea?: number;
  estimatedProductionMt?: number;
  fieldWorkers?: number;
  administrativeWorkers?: number;
  permanentWorkers?: number;
  contractorWorkers?: number;
  hasResidents?: boolean;
  eligibilityStatus?: string;
  certificationStatus?: string;
  lotCount?: number;
}

const emptyPlotForm = {
  supplySourceId: '',
  farmName: '',
  locationDescription: '',
  latitude: '',
  longitude: '',
  area: '',
  plantedArea: '',
  estimatedProductionMt: '',
  fieldWorkers: '',
  administrativeWorkers: '',
  permanentWorkers: '',
  contractorWorkers: '',
  hasResidents: false,
  eligibilityStatus: 'PENDING',
  certificationStatus: 'PENDING'
};

export default function SupplyBase() {
  const { selectedUocId } = useUoc();
  const { user } = useAuth();
  const [rows, setRows] = useState<SupplySource[]>([]);
  const [plots, setPlots] = useState<FarmPlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [editingPlotId, setEditingPlotId] = useState('');
  const [plotForm, setPlotForm] = useState(emptyPlotForm);
  const canEdit = ['SUPERADMIN','ADMIN','MANAGER'].includes(user?.role || '');

  const load = () => {
    if (!selectedUocId || selectedUocId === 'all') { setRows([]); setPlots([]); return; }
    setLoading(true);
    Promise.all([
      api.get('/rspo/supply-sources', { params: { uocId: selectedUocId } }),
      api.get('/rspo/farm-plots', { params: { uocId: selectedUocId } })
    ])
      .then(([sourceResponse, plotResponse]) => {
        setRows(Array.isArray(sourceResponse.data) ? sourceResponse.data : []);
        setPlots(Array.isArray(plotResponse.data) ? plotResponse.data : []);
      })
      .catch(e => { setRows([]); setPlots([]); setError(e.response?.data?.error || 'No fue posible cargar la base de suministro.'); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [selectedUocId]);

  const safeRows = Array.isArray(rows) ? rows : [];

  const stats = useMemo(() => ({
    plantations: plots.length,
    area: plots.reduce((sum, row) => sum + Number(row.area || 0), 0),
    smallholders: plots.filter(row => Number(row.area || 0) <= 50).length
  }), [plots]);

  const resetPlotForm = () => {
    setPlotForm(emptyPlotForm);
    setEditingPlotId('');
    setShowPlotForm(false);
  };

  const savePlot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const body = {
        ...plotForm,
        name: plotForm.farmName,
        uocId: selectedUocId,
        area: Number(plotForm.area),
        plantedArea: Number(plotForm.plantedArea || plotForm.area),
        estimatedProductionMt: Number(plotForm.estimatedProductionMt || 0),
        latitude: plotForm.latitude === '' ? null : Number(plotForm.latitude),
        longitude: plotForm.longitude === '' ? null : Number(plotForm.longitude),
        fieldWorkers: Number(plotForm.fieldWorkers || 0),
        administrativeWorkers: Number(plotForm.administrativeWorkers || 0),
        permanentWorkers: Number(plotForm.permanentWorkers || 0),
        contractorWorkers: Number(plotForm.contractorWorkers || 0)
      };
      if (editingPlotId) await api.put(`/rspo/farm-plots/${editingPlotId}`, body);
      else await api.post('/rspo/farm-plots', body);
      resetPlotForm();
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'No fue posible guardar la plantación.');
    }
  };

  const editPlot = (plot: FarmPlot) => {
    setEditingPlotId(plot.id);
    setPlotForm({
      supplySourceId: plot.supplySourceId || '',
      farmName: plot.farmName || plot.name || '',
      locationDescription: plot.locationDescription || '',
      latitude: plot.latitude == null ? '' : String(plot.latitude),
      longitude: plot.longitude == null ? '' : String(plot.longitude),
      area: String(plot.area ?? ''),
      plantedArea: String(plot.plantedArea ?? ''),
      estimatedProductionMt: String(plot.estimatedProductionMt ?? ''),
      fieldWorkers: String(plot.fieldWorkers ?? ''),
      administrativeWorkers: String(plot.administrativeWorkers ?? ''),
      permanentWorkers: String(plot.permanentWorkers ?? ''),
      contractorWorkers: String(plot.contractorWorkers ?? ''),
      hasResidents: Boolean(plot.hasResidents),
      eligibilityStatus: plot.eligibilityStatus || 'PENDING',
      certificationStatus: plot.certificationStatus || 'PENDING'
    });
    setShowPlotForm(true);
  };

  if (!selectedUocId || selectedUocId === 'all') {
    return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>Las plantaciones siempre se consultan dentro de una unidad autorizada.</p></div>;
  }

  return <div className="flex-col gap-5 animate-fade-in">
    <div className="stats-grid">
      <div className="card"><small>Plantaciones registradas</small><div className="stat-value-lg">{stats.plantations}</div></div>
      <div className="card"><small>Área de plantaciones</small><div className="stat-value-lg">{stats.area.toLocaleString('es-CO')} ha</div></div>
      <div className="card"><small>Pequeños productores (≤ 50 ha)</small><div className="stat-value-lg">{stats.smallholders}</div></div>
    </div>

    {error && <div className="integration-note">{error}</div>}

    <section className="supply-plantations-section">
      <div className="flex-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase text-secondary">Inventario agrícola</p>
          <h2 className="text-xl font-bold">Información general de plantaciones</h2>
          <p className="text-secondary text-sm">Cree o modifique aquí la ficha general. La evaluación se realiza en Cumplimiento P&amp;C Núcleo.</p>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => showPlotForm ? resetPlotForm() : setShowPlotForm(true)}>
          {showPlotForm ? 'Cancelar' : '+ Nueva plantación'}
        </button>}
      </div>

      {showPlotForm && <form className="card form-grid supply-plot-form" onSubmit={savePlot}>
        <div className="pc-form-wide"><h3>{editingPlotId ? 'Editar plantación' : 'Nueva plantación'}</h3></div>
        <label>Productor o razón social
          <select required className="form-select" disabled={Boolean(editingPlotId)} value={plotForm.supplySourceId} onChange={event => setPlotForm({ ...plotForm, supplySourceId: event.target.value })}>
            <option value="">Seleccione</option>{safeRows.filter(row => row.status !== 'ARCHIVED').map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label>Nombre de la plantación<input required className="form-input" value={plotForm.farmName} onChange={event => setPlotForm({ ...plotForm, farmName: event.target.value })} /></label>
        <label className="pc-form-wide">Ubicación o dirección<input required className="form-input" value={plotForm.locationDescription} onChange={event => setPlotForm({ ...plotForm, locationDescription: event.target.value })} /></label>
        <label>Latitud<input className="form-input" type="number" min="-90" max="90" step="0.0000001" value={plotForm.latitude} onChange={event => setPlotForm({ ...plotForm, latitude: event.target.value })} /></label>
        <label>Longitud<input className="form-input" type="number" min="-180" max="180" step="0.0000001" value={plotForm.longitude} onChange={event => setPlotForm({ ...plotForm, longitude: event.target.value })} /></label>
        <label>Área total (ha)<input required className="form-input" type="number" min="0.01" step="0.01" value={plotForm.area} onChange={event => setPlotForm({ ...plotForm, area: event.target.value })} /></label>
        <label>Área sembrada (ha)<input className="form-input" type="number" min="0" step="0.01" value={plotForm.plantedArea} onChange={event => setPlotForm({ ...plotForm, plantedArea: event.target.value })} /></label>
        <label>Producción estimada (t)<input className="form-input" type="number" min="0" step="0.01" value={plotForm.estimatedProductionMt} onChange={event => setPlotForm({ ...plotForm, estimatedProductionMt: event.target.value })} /></label>
        <label>Trabajadores de campo<input className="form-input" type="number" min="0" value={plotForm.fieldWorkers} onChange={event => setPlotForm({ ...plotForm, fieldWorkers: event.target.value })} /></label>
        <label>Administrativos<input className="form-input" type="number" min="0" value={plotForm.administrativeWorkers} onChange={event => setPlotForm({ ...plotForm, administrativeWorkers: event.target.value })} /></label>
        <label>Trabajadores fijos<input className="form-input" type="number" min="0" value={plotForm.permanentWorkers} onChange={event => setPlotForm({ ...plotForm, permanentWorkers: event.target.value })} /></label>
        <label>Contratistas<input className="form-input" type="number" min="0" value={plotForm.contractorWorkers} onChange={event => setPlotForm({ ...plotForm, contractorWorkers: event.target.value })} /></label>
        <label>Elegibilidad<select className="form-select" value={plotForm.eligibilityStatus} onChange={event => setPlotForm({ ...plotForm, eligibilityStatus: event.target.value })}><option value="PENDING">Pendiente</option><option value="ELIGIBLE">Elegible</option><option value="CONDITIONAL">Condicionada</option><option value="INELIGIBLE">No elegible</option></select></label>
        <label>Certificación<select className="form-select" value={plotForm.certificationStatus} onChange={event => setPlotForm({ ...plotForm, certificationStatus: event.target.value })}><option value="PENDING">Pendiente</option><option value="CERTIFIED">Certificada</option><option value="CONVENTIONAL">Convencional</option><option value="SUSPENDED">Suspendida</option></select></label>
        <label className="consent-check pc-form-wide"><input type="checkbox" checked={plotForm.hasResidents} onChange={event => setPlotForm({ ...plotForm, hasResidents: event.target.checked })} /><span>La plantación tiene personas residentes.</span></label>
        <div className="flex gap-2 flex-wrap pc-form-wide"><button className="btn btn-primary">{editingPlotId ? 'Guardar cambios' : 'Crear plantación'}</button><button type="button" className="btn btn-secondary" onClick={resetPlotForm}>Cancelar</button></div>
      </form>}

      {loading ? <div className="card">Cargando plantaciones…</div> : plots.length === 0 ? <div className="empty-state card"><h3>No hay plantaciones registradas</h3><p>Cree la primera plantación y relaciónela con su productor.</p></div> :
        <div className="card p-0"><div className="table-responsive"><table className="w-full supply-plantations-table">
          <thead><tr><th>Plantación</th><th>Productor</th><th>Área</th><th>Perfil P&amp;C</th><th>Ubicación</th><th>Estado</th><th /></tr></thead>
          <tbody>{plots.map(plot => <tr key={plot.id}>
            <td><strong>{plot.farmName || plot.name}</strong><small className="block">{Number(plot.lotCount || 0)} lotes</small></td>
            <td>{plot.sourceName || '—'}</td>
            <td>{Number(plot.area || 0).toLocaleString('es-CO')} ha</td>
            <td><span className="badge">{Number(plot.area || 0) <= 50 ? 'Pequeño productor' : 'Plantación'}</span></td>
            <td>{plot.locationDescription || 'Pendiente'}</td>
            <td>{plot.certificationStatus || 'PENDING'}</td>
            <td>{canEdit && <button className="btn btn-secondary btn-sm" onClick={() => editPlot(plot)}>Editar</button>}</td>
          </tr>)}</tbody>
        </table></div></div>}
    </section>
  </div>;
}
