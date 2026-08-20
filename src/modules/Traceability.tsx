import { useEffect, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

const initial = { supplySourceId:'', farmPlotId:'', deliveredAt:'', agriculturalLot:'', traceabilityLot:'', vehicle:'', plate:'', driverName:'', weighTicket:'', grossWeightKg:'', tareWeightKg:'', supplyModel:'MB', fruitCondition:'CONVENTIONAL', documentRef:'', observations:'' };

export default function Traceability() {
  const { selectedUocId } = useUoc(); const { user } = useAuth();
  const [rows,setRows]=useState<any[]>([]); const [sources,setSources]=useState<any[]>([]); const [plots,setPlots]=useState<any[]>([]);
  const [alerts,setAlerts]=useState<any[]>([]); const [form,setForm]=useState(initial); const [show,setShow]=useState(false); const [error,setError]=useState('');
  const canEdit=user?.role==='ADMIN'||user?.role==='MANAGER';
  const load=()=>{ if(!selectedUocId||selectedUocId==='all') return; const params={uocId:selectedUocId}; Promise.all([api.get('/rspo/deliveries',{params}),api.get('/rspo/supply-sources',{params}),api.get('/rspo/farm-plots',{params}),api.get('/rspo/traceability-alerts',{params})]).then(([a,b,c,d])=>{setRows(Array.isArray(a.data)?a.data:[]);setSources(Array.isArray(b.data)?b.data:[]);setPlots(Array.isArray(c.data)?c.data:[]);setAlerts(Array.isArray(d.data)?d.data:[]);}).catch(e=>{setRows([]);setSources([]);setPlots([]);setAlerts([]);setError(e.response?.data?.error||'No fue posible cargar trazabilidad.');});};
  useEffect(load,[selectedUocId]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setError('');try{await api.post('/rspo/deliveries',{...form,uocId:selectedUocId,grossWeightKg:Number(form.grossWeightKg),tareWeightKg:Number(form.tareWeightKg)});setForm(initial);setShow(false);load();}catch(err:any){setError(err.response?.data?.error||'No fue posible guardar la entrega.');}};
  const review=async(id:string,status:'ACCEPTED'|'REJECTED')=>{try{await api.put(`/rspo/deliveries/${id}`,{status});load();}catch(err:any){setError(err.response?.data?.error||'No fue posible actualizar la entrega.');}};
  if(!selectedUocId||selectedUocId==='all') return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>La trazabilidad RFF no permite consultas globales.</p></div>;
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  return <div className="flex-col gap-5 animate-fade-in">
    <div className="traceability-summary card"><div><span className="eyebrow">CAMPO → BÁSCULA</span><h2 className="text-2xl font-bold">Trazabilidad RFF</h2><p className="text-secondary">Pesos reales de báscula, origen, elegibilidad y libro SCC.</p></div><div className="status-panel"><strong>{safeRows.length}</strong> entregas · <strong>{safeAlerts.filter(a=>a.status==='OPEN').length}</strong> alertas</div></div>
    <div className="flex-between">{error?<div className="integration-note">{error}</div>:<span/>}{canEdit&&<button className="btn btn-primary" onClick={()=>setShow(v=>!v)}>{show?'Cancelar':'+ Registrar recepción'}</button>}</div>
    {show&&<form className="card form-grid" onSubmit={submit}>
      <select required className="form-select" value={form.supplySourceId} onChange={e=>setForm({...form,supplySourceId:e.target.value})}><option value="">Plantación / proveedor</option>{sources.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select>
      <select className="form-select" value={form.farmPlotId} onChange={e=>setForm({...form,farmPlotId:e.target.value})}><option value="">Predio / lote opcional</option>{plots.filter(p=>!form.supplySourceId||p.supplySourceId===form.supplySourceId).map(p=><option value={p.id} key={p.id}>{p.farmName||p.name} — {p.name}</option>)}</select>
      <input required type="datetime-local" className="form-input" value={form.deliveredAt} onChange={e=>setForm({...form,deliveredAt:e.target.value})}/>
      <input required className="form-input" placeholder="Lote de trazabilidad" value={form.traceabilityLot} onChange={e=>setForm({...form,traceabilityLot:e.target.value})}/>
      <input className="form-input" placeholder="Lote agrícola" value={form.agriculturalLot} onChange={e=>setForm({...form,agriculturalLot:e.target.value})}/>
      <input required className="form-input" placeholder="Tiquete de báscula" value={form.weighTicket} onChange={e=>setForm({...form,weighTicket:e.target.value})}/>
      <input required className="form-input" placeholder="Placa" value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})}/>
      <input className="form-input" placeholder="Vehículo" value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})}/>
      <input className="form-input" placeholder="Conductor" value={form.driverName} onChange={e=>setForm({...form,driverName:e.target.value})}/>
      <input required type="number" min="0" step=".001" className="form-input" placeholder="Peso bruto kg" value={form.grossWeightKg} onChange={e=>setForm({...form,grossWeightKg:e.target.value})}/>
      <input required type="number" min="0" step=".001" className="form-input" placeholder="Tara kg" value={form.tareWeightKg} onChange={e=>setForm({...form,tareWeightKg:e.target.value})}/>
      <select className="form-select" value={form.supplyModel} onChange={e=>setForm({...form,supplyModel:e.target.value})}><option>IP</option><option>SG</option><option>MB</option></select>
      <select className="form-select" value={form.fruitCondition} onChange={e=>setForm({...form,fruitCondition:e.target.value})}><option value="CERTIFIED">Certificada</option><option value="CONVENTIONAL">Convencional</option></select>
      <button className="btn btn-primary">Guardar recepción</button>
    </form>}
    {rows.length===0?<div className="empty-state card"><h3>No hay recepciones RFF</h3><p>Registre la primera operación de báscula para esta UoC.</p></div>:<div className="card p-0"><div className="table-responsive"><table className="w-full min-w-[1150px]"><thead><tr><th>Fecha</th><th>Origen</th><th>Lote</th><th>Tiquete</th><th>Vehículo</th><th>Bruto</th><th>Tara</th><th>Neto</th><th>Condición</th><th>Estado</th><th>Alertas</th><th>Revisión</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.deliveredAt).toLocaleString('es-CO')}</td><td>{r.sourceName}</td><td>{r.traceabilityLot}</td><td>{r.weighTicket}</td><td>{r.plate}</td><td>{Number(r.grossWeightKg)} kg</td><td>{Number(r.tareWeightKg)} kg</td><td><strong>{Number(r.netWeightKg)} kg</strong></td><td>{r.fruitCondition}</td><td>{r.status}</td><td>{r.openAlerts||0}</td><td>{canEdit&&<div className="flex gap-1"><button className="btn btn-sm btn-secondary" onClick={()=>review(r.id,'ACCEPTED')}>Aceptar</button><button className="btn btn-sm btn-secondary" onClick={()=>review(r.id,'REJECTED')}>Rechazar</button></div>}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
