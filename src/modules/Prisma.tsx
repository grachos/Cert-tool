import { useEffect, useState } from 'react';
import api from '../api';
import { useUoc } from '../components/UoCContext';
import { useAuth } from '../components/AuthContext';

const initial={operationType:'SHIPPING_ANNOUNCEMENT',internalReference:'',prismaReference:'',product:'CPO',supplyModel:'MB',volumeMt:'',physicalDate:'',deadline:'',status:'DRAFT',counterparty:'',observations:''};
export default function Prisma(){
  const {selectedUocId}=useUoc(); const {user}=useAuth(); const [rows,setRows]=useState<any[]>([]); const [form,setForm]=useState(initial); const [show,setShow]=useState(false); const [error,setError]=useState('');
  const canEdit=user?.role==='ADMIN'||user?.role==='MANAGER';
  const load=()=>{if(!selectedUocId||selectedUocId==='all')return;api.get('/rspo/prisma-operations',{params:{uocId:selectedUocId}}).then(r=>setRows(r.data)).catch(e=>setError(e.response?.data?.error||'No fue posible cargar las operaciones.'));};
  useEffect(load,[selectedUocId]);
  const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await api.post('/rspo/prisma-operations',{...form,uocId:selectedUocId,volumeMt:Number(form.volumeMt)});setForm(initial);setShow(false);load();}catch(err:any){setError(err.response?.data?.error||'No fue posible guardar la operación.');}};
  if(!selectedUocId||selectedUocId==='all')return <div className="empty-state card"><h3>Seleccione una UoC</h3><p>El control interno PRISMA se concilia por unidad de certificación.</p></div>;
  return <div className="flex-col gap-5 animate-fade-in">
    <section className="card prisma-hero"><div><span className="eyebrow">CONTROL INTERNO</span><h2 className="text-2xl font-bold">PRISMA by RSPO</h2><p>Preparación, seguimiento y conciliación de operaciones.</p></div><span className="badge badge-pending">No sustituye PRISMA</span></section>
    <div className="integration-note"><strong>Importante:</strong> PRISMA continúa siendo la plataforma oficial de RSPO. Este módulo no almacena credenciales ni simula integración oficial.</div>
    <div className="flex-between"><span>{rows.length} operaciones internas</span>{canEdit&&<button className="btn btn-primary" onClick={()=>setShow(v=>!v)}>{show?'Cancelar':'+ Nueva operación'}</button>}</div>
    {error&&<div className="integration-note">{error}</div>}
    {show&&<form className="card form-grid" onSubmit={submit}>
      <select className="form-select" value={form.operationType} onChange={e=>setForm({...form,operationType:e.target.value})}><option value="SHIPPING_ANNOUNCEMENT">Shipping Announcement</option><option value="CONFIRMATION">Confirmación</option><option value="REMOVE">Remove</option><option value="ADJUSTMENT">Ajuste</option></select>
      <input required className="form-input" placeholder="Referencia interna" value={form.internalReference} onChange={e=>setForm({...form,internalReference:e.target.value})}/>
      <input className="form-input" placeholder="Referencia PRISMA (si existe)" value={form.prismaReference} onChange={e=>setForm({...form,prismaReference:e.target.value})}/>
      <input required className="form-input" placeholder="Producto" value={form.product} onChange={e=>setForm({...form,product:e.target.value})}/>
      <select className="form-select" value={form.supplyModel} onChange={e=>setForm({...form,supplyModel:e.target.value})}><option>IP</option><option>SG</option><option>MB</option><option>BC</option></select>
      <input required type="number" min="0.001" step=".001" className="form-input" placeholder="Volumen TM" value={form.volumeMt} onChange={e=>setForm({...form,volumeMt:e.target.value})}/>
      <label className="form-label">Fecha física<input required type="date" className="form-input" value={form.physicalDate} onChange={e=>setForm({...form,physicalDate:e.target.value})}/></label>
      <label className="form-label">Fecha límite<input type="date" className="form-input" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
      <input className="form-input" placeholder="Contraparte" value={form.counterparty} onChange={e=>setForm({...form,counterparty:e.target.value})}/>
      <button className="btn btn-primary">Guardar operación</button>
    </form>}
    {rows.length===0?<div className="empty-state card"><h3>No hay operaciones internas</h3><p>Cree el primer registro cuando tenga una operación que preparar o conciliar.</p></div>:<div className="card p-0"><div className="table-responsive"><table className="w-full min-w-[900px]"><thead><tr><th>Tipo</th><th>Referencia interna</th><th>Referencia PRISMA</th><th>Producto</th><th>Modelo</th><th>Volumen</th><th>Fecha física</th><th>Límite</th><th>Estado</th><th>Contraparte</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.operationType}</td><td>{r.internalReference}</td><td>{r.prismaReference||'—'}</td><td>{r.product}</td><td>{r.supplyModel}</td><td>{Number(r.volumeMt)} TM</td><td>{String(r.physicalDate).slice(0,10)}</td><td>{r.deadline?String(r.deadline).slice(0,10):'—'}</td><td>{r.status}</td><td>{r.counterparty||'—'}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
