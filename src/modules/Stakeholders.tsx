import { useState, useEffect } from 'react';
import api from '../api';

interface Stakeholder { id: string; name: string; type: string; location: string; interest: string; influence: string; engagementChannel: string; lastEngagement: string; nextEngagement: string; responsibleName: string; responsibleEmail: string; status: string; notes: string; }

const typeLabels: Record<string, string> = { COMMUNITY: 'Comunidad', GOVERNMENT: 'Gobierno', NGO: 'ONG', WORKER: 'Trabajador', SUPPLIER: 'Proveedor', BUYER: 'Comprador', ACADEMIC: 'Academia', MEDIA: 'Medios', OTHER: 'Otro' };
const influenceStyle: Record<string, { bg: string; color: string }> = { HIGH: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)' }, MEDIUM: { bg: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }, LOW: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' } };

export default function Stakeholders() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSt, setEditingSt] = useState<Stakeholder | null>(null);

  const fetch = async () => { try { setLoading(true); const { data } = await api.get('/stakeholders'); setStakeholders(data); } catch (e) { /* */ } setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    try {
      if (editingSt) await api.put(`/stakeholders/${editingSt.id}`, data);
      else await api.post('/stakeholders', data);
      setShowForm(false); setEditingSt(null); fetch();
    } catch (err) { alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta parte interesada?')) return;
    try { await api.delete(`/stakeholders/${id}`); fetch(); } catch (err) { alert('Error al eliminar'); }
  };

  if (loading) return <div className="text-center text-muted" style={{ padding: '3rem' }}>Cargando partes interesadas...</div>;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Total</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{stakeholders.length}</span><span className="text-sm text-muted">Partes Interesadas</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Alta Influencia</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{stakeholders.filter(s => s.influence === 'HIGH').length}</span><span className="text-sm text-muted">Críticas</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Activas</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{stakeholders.filter(s => s.status === 'ACTIVE').length}</span><span className="text-sm text-muted">En gestión</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">Próximo Contacto</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{stakeholders.filter(s => s.nextEngagement).length}</span><span className="text-sm text-muted">Programado</span></div></div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-primary">Registro de Partes Interesadas</h3>
        <button className="btn btn-primary" onClick={() => { setEditingSt(null); setShowForm(true); }}>+ Nueva Parte Interesada</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead><tr className="bg-white border-b border-gray-200"><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Nombre</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Tipo</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Ubicación</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Influencia</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Canal</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Último Contacto</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Responsable</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Acciones</th></tr></thead>
          <tbody>
            {stakeholders.map(st => {
              const inf = influenceStyle[st.influence] || influenceStyle.MEDIUM;
              return (
                <tr key={st.id} className="border-b border-gray-100 hover:bg-surface-1">
                  <td className="p-4 font-semibold text-sm">{st.name}</td>
                  <td className="p-4"><span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{typeLabels[st.type] || st.type}</span></td>
                  <td className="p-4 text-sm text-secondary">{st.location || '—'}</td>
                  <td className="p-4"><span className="badge" style={{ background: inf.bg, color: inf.color }}>{st.influence === 'HIGH' ? 'Alta' : st.influence === 'MEDIUM' ? 'Media' : 'Baja'}</span></td>
                  <td className="p-4 text-sm text-secondary">{st.engagementChannel || '—'}</td>
                  <td className="p-4 text-sm text-secondary">{st.lastEngagement ? new Date(st.lastEngagement).toLocaleDateString('es-CO') : '—'}</td>
                  <td className="p-4 text-sm text-secondary">{st.responsibleName || '—'}</td>
                  <td className="p-4"><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => { setEditingSt(st); setShowForm(true); }}>✏️</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(st.id)}>🗑️</button></div></td>
                </tr>
              );
            })}
            {stakeholders.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted">Sin partes interesadas registradas</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay flex-center" onClick={() => setShowForm(false)}>
          <div className="modal card max-w-lg w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-primary">{editingSt ? 'Editar Parte Interesada' : 'Nueva Parte Interesada'}</h3><button className="btn-icon" onClick={() => setShowForm(false)}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmit} className="flex-col gap-4">
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Nombre</label><input name="name" className="form-input" defaultValue={editingSt?.name} required /></div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Tipo</label><select name="type" className="form-input" defaultValue={editingSt?.type || ''} required><option value="">Seleccionar...</option>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Influencia</label><select name="influence" className="form-input" defaultValue={editingSt?.influence || 'MEDIUM'} required><option value="HIGH">Alta</option><option value="MEDIUM">Media</option><option value="LOW">Baja</option></select></div>
              </div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Ubicación</label><input name="location" className="form-input" defaultValue={editingSt?.location} /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Interés / Expectativas</label><input name="interest" className="form-input" defaultValue={editingSt?.interest} /></div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Canal</label><input name="engagementChannel" className="form-input" defaultValue={editingSt?.engagementChannel} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Estado</label><select name="status" className="form-input" defaultValue={editingSt?.status || 'ACTIVE'}><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option><option value="PENDING">Pendiente</option></select></div>
              </div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Último Contacto</label><input name="lastEngagement" className="form-input" type="date" defaultValue={editingSt?.lastEngagement?.split('T')[0]} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Próximo Contacto</label><input name="nextEngagement" className="form-input" type="date" defaultValue={editingSt?.nextEngagement?.split('T')[0]} /></div>
              </div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Responsable</label><input name="responsibleName" className="form-input" defaultValue={editingSt?.responsibleName} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Email</label><input name="responsibleEmail" className="form-input" type="email" defaultValue={editingSt?.responsibleEmail} /></div>
              </div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Notas</label><textarea name="notes" className="form-input" rows={2} defaultValue={editingSt?.notes} /></div>
              <div className="flex gap-3 justify-end mt-4"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingSt ? 'Actualizar' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
