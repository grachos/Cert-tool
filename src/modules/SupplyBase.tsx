import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

interface SupplySource {
  id: string; name: string; identifier: string; sourceType: string; totalArea: number; plantedArea: number;
  certifiedArea: number; polygonStatus: string; riskLevel: string; eligibilityStatus: string;
  certificationStatus: string; responsible?: string; lastEvaluation?: string; expiryDate?: string;
}

const emptyForm = { name:'', identifier:'', sourceType:'OWN', totalArea:'', plantedArea:'', certifiedArea:'', polygonStatus:'PENDING', riskLevel:'MEDIUM', eligibilityStatus:'PENDING', certificationStatus:'PENDING', responsible:'', lastEvaluation:'', expiryDate:'' };

export default function SupplyBase() {
  const { selectedUocId } = useUoc();
  const { user } = useAuth();
  const [rows, setRows] = useState<SupplySource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const load = () => {
    if (!selectedUocId || selectedUocId === 'all') { setRows([]); return; }
    setLoading(true);
    api.get('/rspo/supply-sources', { params: { uocId: selectedUocId } }).then(({data}) => setRows(data)).catch(e => setError(e.response?.data?.error || 'No fue posible cargar la base de suministro.')).finally(() => setLoading(false));
  };
  useEffect(load, [selectedUocId]);

  const stats = useMemo(() => ({
    area: rows.reduce((sum, row) => sum + Number(row.totalArea || 0), 0),
    certified: rows.reduce((sum, row) => sum + Number(row.certifiedArea || 0), 0),
    eligible: rows.filter(row => row.eligibilityStatus === 'ELIGIBLE').length,
    highRisk: rows.filter(row => ['HIGH','CRITICAL'].includes(row.riskLevel)).length
  }), [rows]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try {
      await api.post('/rspo/supply-sources', { ...form, uocId: selectedUocId, totalArea:Number(form.totalArea), plantedArea:Number(form.plantedArea), certifiedArea:Number(form.certifiedArea) });
      setForm(emptyForm); setShowForm(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'No fue posible guardar el registro.'); }
  };

  if (!selectedUocId || selectedUocId === 'all') return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>La Base de suministro siempre se consulta dentro de una unidad autorizada.</p></div>;
  return <div className="flex-col gap-5 animate-fade-in">
    <div className="stats-grid">
      <div className="card"><small>Fuentes registradas</small><div className="stat-value-lg">{rows.length}</div></div>
      <div className="card"><small>Área total</small><div className="stat-value-lg">{stats.area.toLocaleString('es-CO')} ha</div></div>
      <div className="card"><small>Área certificada</small><div className="stat-value-lg">{stats.certified.toLocaleString('es-CO')} ha</div></div>
      <div className="card"><small>Elegibles / riesgo alto</small><div className="stat-value-lg">{stats.eligible} / {stats.highRisk}</div></div>
    </div>
    <div className="flex-between"><div><h2 className="text-xl font-bold">Base de suministro</h2><p className="text-secondary text-sm">Plantaciones propias, asociadas, independientes y pequeños productores.</p></div>{canEdit && <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>{showForm ? 'Cancelar' : '+ Nueva fuente'}</button>}</div>
    {error && <div className="integration-note">{error}</div>}
    {showForm && <form className="card form-grid" onSubmit={submit}>
      <input className="form-input" required placeholder="Nombre" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <input className="form-input" required placeholder="Identificador" value={form.identifier} onChange={e=>setForm({...form,identifier:e.target.value})}/>
      <select className="form-select" value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value})}><option value="OWN">Propia</option><option value="ASSOCIATED">Asociada</option><option value="INDEPENDENT">Independiente</option><option value="ASSOCIATION">Asociación</option><option value="SMALLHOLDER_GROUP">Grupo pequeños productores</option><option value="INDIVIDUAL">Productor individual</option></select>
      <input className="form-input" type="number" min="0" step="0.01" placeholder="Área total (ha)" value={form.totalArea} onChange={e=>setForm({...form,totalArea:e.target.value})}/>
      <input className="form-input" type="number" min="0" step="0.01" placeholder="Área sembrada (ha)" value={form.plantedArea} onChange={e=>setForm({...form,plantedArea:e.target.value})}/>
      <input className="form-input" type="number" min="0" step="0.01" placeholder="Área certificada (ha)" value={form.certifiedArea} onChange={e=>setForm({...form,certifiedArea:e.target.value})}/>
      <select className="form-select" value={form.riskLevel} onChange={e=>setForm({...form,riskLevel:e.target.value})}><option value="LOW">Riesgo bajo</option><option value="MEDIUM">Riesgo medio</option><option value="HIGH">Riesgo alto</option><option value="CRITICAL">Riesgo crítico</option></select>
      <select className="form-select" value={form.eligibilityStatus} onChange={e=>setForm({...form,eligibilityStatus:e.target.value})}><option value="PENDING">Elegibilidad pendiente</option><option value="ELIGIBLE">Elegible</option><option value="CONDITIONAL">Condicionada</option><option value="INELIGIBLE">No elegible</option></select>
      <input className="form-input" placeholder="Responsable" value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}/>
      <button className="btn btn-primary" type="submit">Guardar fuente</button>
    </form>}
    {loading ? <div className="card">Cargando…</div> : rows.length === 0 ? <div className="empty-state card"><h3>No hay fuentes registradas</h3><p>Cree el primer registro para comenzar a calcular los indicadores de esta UoC.</p>{canEdit && <button className="btn btn-primary" onClick={()=>setShowForm(true)}>Crear primer registro</button>}</div> :
      <div className="card p-0 overflow-hidden"><div className="table-responsive"><table className="w-full text-left min-w-[900px]"><thead><tr className="bg-surface-1"><th className="p-4">Fuente</th><th>Tipo</th><th>Áreas total / certificada</th><th>Polígono</th><th>Riesgo</th><th>Elegibilidad</th><th>Certificación</th><th>Responsable</th></tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b"><td className="p-4"><strong>{row.name}</strong><br/><small>{row.identifier}</small></td><td>{row.sourceType}</td><td>{Number(row.totalArea)} / {Number(row.certifiedArea)} ha</td><td>{row.polygonStatus}</td><td>{row.riskLevel}</td><td>{row.eligibilityStatus}</td><td>{row.certificationStatus}</td><td>{row.responsible || '—'}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
