import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { useUoc } from '../components/UoCContext';

type ModuleCode = 'SST' | 'TRAINING' | 'ENVIRONMENT' | 'SOCIAL';

const moduleConfig: Record<ModuleCode, {
  title: string;
  description: string;
  icon: string;
  categories: Array<{ value: string; label: string }>;
}> = {
  SST: {
    title: 'Seguridad y Salud en el Trabajo',
    description: 'Peligros, EPP, accidentalidad, inspecciones y acciones preventivas.',
    icon: '✚',
    categories: [
      { value: 'HAZARD_MATRIX', label: 'Matriz de peligros' },
      { value: 'EPP_IDENTIFICATION', label: 'Identificación de EPP' },
      { value: 'EPP_DELIVERY', label: 'Entrega de EPP' },
      { value: 'EPP_INVENTORY', label: 'Inventario de EPP' },
      { value: 'ACCIDENT_RATE', label: 'Accidentalidad mensual' },
      { value: 'INSPECTION', label: 'Inspecciones y acciones' }
    ]
  },
  TRAINING: {
    title: 'Capacitación',
    description: 'Plan anual, asistencia, cobertura y cumplimiento por periodo.',
    icon: '◫',
    categories: [
      { value: 'ANNUAL_PLAN', label: 'Plan anual' },
      { value: 'TRAINING_ACTIVITY', label: 'Actividad de capacitación' },
      { value: 'ATTENDANCE', label: 'Asistencia y cobertura' },
      { value: 'MATERIAL', label: 'Material y evaluación' }
    ]
  },
  ENVIRONMENT: {
    title: 'Gestión Ambiental',
    description: 'Programas, metas, consumos, impactos y seguimiento ambiental.',
    icon: '◉',
    categories: [
      { value: 'WATER', label: 'Agua' },
      { value: 'ENERGY', label: 'Energía' },
      { value: 'EMISSIONS', label: 'Emisiones' },
      { value: 'WASTE', label: 'Residuos' },
      { value: 'BIODIVERSITY', label: 'Biodiversidad y AVC' },
      { value: 'EROSION', label: 'Erosión y suelos' },
      { value: 'FIRE', label: 'Incendios y quemas' },
      { value: 'REMEDIATION', label: 'Remediación' }
    ]
  },
  SOCIAL: {
    title: 'Gestión Social',
    description: 'Partes interesadas, PQRS, comités y compromisos sociales.',
    icon: '◇',
    categories: [
      { value: 'STAKEHOLDER', label: 'Partes interesadas' },
      { value: 'PQRS', label: 'PQRS' },
      { value: 'COPASST', label: 'COPASST' },
      { value: 'COEXISTENCE', label: 'Convivencia laboral' },
      { value: 'GENDER', label: 'Comité de género' },
      { value: 'COMMUNITY', label: 'Comunidades y compromisos' }
    ]
  }
};

const emptyForm = {
  category: '',
  title: '',
  description: '',
  responsible: '',
  scheduledDate: '',
  completedDate: '',
  status: 'PLANNED',
  targetValue: '',
  numeratorValue: '',
  denominatorValue: '',
  unit: '%',
  farmPlotId: ''
};

export default function OperationalModule({ moduleCode }: { moduleCode: ModuleCode }) {
  const config = moduleConfig[moduleCode];
  const { selectedUocId } = useUoc();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [plantations, setPlantations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm, category: config.categories[0].value });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedPlantation = useMemo(
    () => form.farmPlotId || user?.plantationAccess?.find(access => access.uocId === selectedUocId)?.farmPlotId || '',
    [form.farmPlotId, selectedUocId, user]
  );
  const readOnly = ['VIEWER','READ_ONLY'].includes(user?.role || '') ||
    user?.plantationAccess?.some(access =>
      access.uocId === selectedUocId && access.farmPlotId === selectedPlantation && access.accessLevel === 'VIEWER'
    );

  const load = async () => {
    if (!selectedUocId || selectedUocId === 'all') return;
    setLoading(true);
    try {
      const params = { uocId: selectedUocId, moduleCode };
      const [{ data }, summaryResponse, plantationResponse] = await Promise.all([
        api.get('/operations', { params }),
        api.get('/operations/summary', { params }),
        api.get('/rspo/farm-plots', { params: { uocId: selectedUocId } })
      ]);
      setRecords(Array.isArray(data) ? data : []);
      const moduleSummary = (summaryResponse.data?.modules || []).find((item: any) => item.moduleCode === moduleCode);
      setSummary(moduleSummary || { total: 0, completed: 0, pending: 0, overdue: 0, averageResult: 0 });
      setPlantations(Array.isArray(plantationResponse.data) ? plantationResponse.data : []);
    } catch (error: any) {
      addToast({ type: 'error', title: 'No fue posible cargar el módulo', message: error.response?.data?.error || 'Revise la conexión.' });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(previous => ({ ...previous, category: config.categories[0].value }));
    load();
  }, [selectedUocId, moduleCode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.post('/operations', {
        ...form,
        moduleCode,
        uocId: selectedUocId,
        farmPlotId: selectedPlantation || null,
        targetValue: form.targetValue === '' ? null : Number(form.targetValue),
        numeratorValue: form.numeratorValue === '' ? null : Number(form.numeratorValue),
        denominatorValue: form.denominatorValue === '' ? null : Number(form.denominatorValue)
      });
      setForm({ ...emptyForm, category: config.categories[0].value });
      setShowForm(false);
      addToast({ type: 'success', title: 'Registro guardado', message: 'El indicador quedó disponible para seguimiento y evidencia.' });
      await load();
    } catch (error: any) {
      addToast({ type: 'error', title: 'No fue posible guardar', message: error.response?.data?.error || 'Verifique los campos.' });
    }
  };

  const changeStatus = async (record: any, status: string) => {
    try {
      await api.put(`/operations/${record.id}`, {
        uocId: selectedUocId,
        status,
        completedDate: status === 'COMPLETED' ? new Date().toISOString().slice(0, 10) : record.completedDate
      });
      await load();
    } catch (error: any) {
      addToast({ type: 'error', title: 'No fue posible actualizar', message: error.response?.data?.error || 'Intente nuevamente.' });
    }
  };

  const linkEvidence = async (record: any) => {
    const evidenceId = window.prompt('Pegue el ID de la evidencia que desea reutilizar');
    if (!evidenceId) return;
    try {
      await api.post(`/operations/${record.id}/evidence`, { uocId: selectedUocId, evidenceId });
      addToast({ type: 'success', title: 'Evidencia vinculada', message: 'El mismo soporte puede alimentar los indicadores P&C relacionados.' });
      await load();
    } catch (error: any) {
      addToast({ type: 'error', title: 'No fue posible vincular', message: error.response?.data?.error || 'Verifique la evidencia.' });
    }
  };

  if (!selectedUocId || selectedUocId === 'all') {
    return <div className="empty-state card"><h3>Seleccione una Unidad de Certificación</h3></div>;
  }

  return (
    <div className="operational-module flex-col gap-5 animate-fade-in">
      <section className="operational-hero">
        <div className="operational-icon">{config.icon}</div>
        <div>
          <span className="eyebrow">GESTIÓN INTEGRADA · RSPO</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        {!readOnly && <button className="btn btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cerrar' : '+ Nuevo registro'}</button>}
      </section>

      <section className="operational-metrics">
        <div><span>Total</span><strong>{Number(summary?.total || 0)}</strong></div>
        <div><span>Completados</span><strong>{Number(summary?.completed || 0)}</strong></div>
        <div><span>Pendientes</span><strong>{Number(summary?.pending || 0)}</strong></div>
        <div><span>Vencidos</span><strong className="metric-danger">{Number(summary?.overdue || 0)}</strong></div>
        <div><span>Resultado promedio</span><strong>{Number(summary?.averageResult || 0).toFixed(1)}%</strong></div>
      </section>

      {showForm && (
        <form className="card operational-form" onSubmit={submit}>
          <div className="form-section-title">Información del registro</div>
          <label>Programa o categoría
            <select className="form-select" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>
              {config.categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          {plantations.length > 0 && <label>Plantación
            <select className="form-select" value={selectedPlantation} onChange={event => setForm({ ...form, farmPlotId: event.target.value })} required={!user?.isCentralUser}>
              {user?.isCentralUser && <option value="">Aplicación general de la extractora</option>}
              {plantations.map(plantation => <option key={plantation.id} value={plantation.id}>{plantation.farmName || plantation.name}</option>)}
            </select>
          </label>}
          <label>Título<input className="form-input" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required /></label>
          <label>Responsable<input className="form-input" value={form.responsible} onChange={event => setForm({ ...form, responsible: event.target.value })} /></label>
          <label>Fecha programada<input type="date" className="form-input" value={form.scheduledDate} onChange={event => setForm({ ...form, scheduledDate: event.target.value })} /></label>
          <label>Fecha ejecutada<input type="date" className="form-input" value={form.completedDate} onChange={event => setForm({ ...form, completedDate: event.target.value })} /></label>
          <label>Meta<input type="number" step="0.01" className="form-input" value={form.targetValue} onChange={event => setForm({ ...form, targetValue: event.target.value })} /></label>
          <label>Numerador<input type="number" step="0.01" className="form-input" value={form.numeratorValue} onChange={event => setForm({ ...form, numeratorValue: event.target.value })} /></label>
          <label>Denominador<input type="number" min="0" step="0.01" className="form-input" value={form.denominatorValue} onChange={event => setForm({ ...form, denominatorValue: event.target.value })} /></label>
          <label>Unidad<input className="form-input" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} /></label>
          <label className="operational-form-wide">Descripción<textarea className="form-textarea" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          <div className="operational-form-actions"><button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button><button className="btn btn-primary">Guardar registro</button></div>
        </form>
      )}

      <section className="card p-0 operational-records">
        {loading ? <div className="empty-state">Cargando registros…</div> : !records.length ? (
          <div className="empty-state"><h3>Aún no hay registros</h3><p>Cree el primero para activar indicadores, alertas y trazabilidad de evidencias.</p></div>
        ) : (
          <div className="table-responsive"><table className="w-full">
            <thead><tr><th>Programa</th><th>Registro</th><th>Alcance</th><th>Responsable</th><th>Fecha</th><th>Resultado</th><th>Estado</th><th>Evidencias</th><th>Acciones</th></tr></thead>
            <tbody>{records.map(record => (
              <tr key={record.id}>
                <td>{config.categories.find(category => category.value === record.category)?.label || record.category}</td>
                <td><strong>{record.title}</strong><small>{record.description || 'Sin observaciones'}</small></td>
                <td>{record.plantationName || 'Extractora'}</td>
                <td>{record.responsible || 'Por asignar'}</td>
                <td>{record.completedDate || record.scheduledDate || 'Sin fecha'}</td>
                <td>{record.resultValue == null ? '—' : `${Number(record.resultValue).toFixed(1)}${record.unit || '%'}`}</td>
                <td><span className={`operational-status status-${String(record.status).toLowerCase()}`}>{record.status}</span></td>
                <td>{record.evidence?.length || 0}</td>
                <td><div className="flex gap-1 flex-wrap">
                  <button className="btn btn-sm btn-secondary" onClick={() => linkEvidence(record)}>Evidencia</button>
                  {!readOnly && record.status !== 'COMPLETED' && <button className="btn btn-sm btn-primary" onClick={() => changeStatus(record, 'COMPLETED')}>Completar</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
