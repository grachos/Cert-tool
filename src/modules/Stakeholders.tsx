import { useState, useEffect } from 'react';
import api from '../api';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface Stakeholder { id: string; name: string; type: string; location: string; interest: string; influence: string; engagementChannel: string; lastEngagement: string; nextEngagement: string; responsibleName: string; responsibleEmail: string; status: string; notes: string; }

const influenceStyle: Record<string, { bg: string; color: string }> = { HIGH: { bg: 'var(--accent-red-bg)', color: 'var(--accent-red)' }, MEDIUM: { bg: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }, LOW: { bg: 'var(--accent-green-bg)', color: 'var(--accent-green)' } };

export default function Stakeholders() {
  const { t, language } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState<'stakeholders' | 'quejas'>('stakeholders');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSt, setEditingSt] = useState<Stakeholder | null>(null);

  const typeLabels: Record<string, string> = {
    COMMUNITY: language === 'es' ? 'Comunidad' : 'Community',
    GOVERNMENT: language === 'es' ? 'Gobierno' : 'Government',
    NGO: 'NGO',
    WORKER: language === 'es' ? 'Trabajador' : 'Worker',
    SUPPLIER: language === 'es' ? 'Proveedor' : 'Supplier',
    BUYER: language === 'es' ? 'Comprador' : 'Buyer',
    ACADEMIC: language === 'es' ? 'Academia' : 'Academia',
    MEDIA: language === 'es' ? 'Medios' : 'Media',
    OTHER: language === 'es' ? 'Otro' : 'Other'
  };

  // Complaints / Quejas HRDD State (M1)
  const [complaints] = useState([
    { id: 'q1', code: 'QJ-2026-001', date: '2026-06-10', stakeholder: 'Asociación Comunitaria Vereda La Palma', category: 'Ambiental / Polvo', description: 'Inconformidad por emisión de polvo en vía de transporte de RFF.', status: 'EN_INVESTIGACION', deadline: '2026-07-25', owner: 'Carlos Mendoza' },
    { id: 'q2', code: 'QJ-2026-002', date: '2026-06-22', stakeholder: 'Sindicato de Trabajadores del Campo', category: 'Laboral / EPP', description: 'Solicitud de revisión de tallas y renovación de calzado de seguridad.', status: 'RESUELTA', deadline: '2026-07-10', owner: 'María Fernanda Ríos' },
    { id: 'q3', code: 'QJ-2026-003', date: '2026-07-01', stakeholder: 'Propietario Predio Colindante Lote 4', category: 'Linderos / Agua', description: 'Solicitud de verificación de drenaje pluvial cerca a cerca viva.', status: 'RECIBIDA', deadline: '2026-07-30', owner: 'Jorge Restrepo' },
  ]);

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
    } catch (err) { alert(language === 'es' ? 'Error al guardar' : 'Error saving'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar esta parte interesada?' : 'Delete this stakeholder?')) return;
    try { await api.delete(`/stakeholders/${id}`); fetch(); } catch (err) { alert(language === 'es' ? 'Error al eliminar' : 'Error deleting'); }
  };

  if (loading) return <div className="text-center text-muted" style={{ padding: '3rem' }}>{language === 'es' ? 'Cargando partes interesadas...' : 'Loading stakeholders...'}</div>;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex gap-1 flex-wrap overflow-x-auto" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        <button className={activeTab === 'stakeholders' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ borderRadius: '6px 6px 0 0' }} onClick={() => setActiveTab('stakeholders')}>
          {t('sh.matrixTab')}
        </button>
        <button className={activeTab === 'quejas' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} style={{ borderRadius: '6px 6px 0 0' }} onClick={() => setActiveTab('quejas')}>
          {t('sh.grievanceTab')}
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('sh.totalStakeholders')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{stakeholders.length}</span><span className="text-sm text-muted">{language === 'es' ? 'Registradas' : 'Registered'}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('sh.highImpact')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{stakeholders.filter(s => s.influence === 'HIGH').length}</span><span className="text-sm text-muted">{language === 'es' ? 'Críticas' : 'Critical'}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('sh.openGrievances')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{complaints.filter(c => c.status !== 'RESUELTA' && c.status !== 'CERRADA').length}</span><span className="text-sm text-muted">{language === 'es' ? 'En atención' : 'In process'}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{language === 'es' ? 'Resueltas' : 'Resolved'}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>{complaints.filter(c => c.status === 'RESUELTA' || c.status === 'CERRADA').length}</span><span className="text-sm text-muted">{language === 'es' ? 'Concluidas' : 'Completed'}</span></div></div>
      </div>

      {activeTab === 'stakeholders' && (
        <>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-bold text-primary">{t('sh.title')}</h3>
            <button className="btn btn-primary" onClick={() => { setEditingSt(null); setShowForm(true); }}>{t('sh.newStakeholder')}</button>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead><tr className="bg-surface-1 border-b"><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Nombre' : 'Name'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Tipo' : 'Type'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Ubicación' : 'Location'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Influencia' : 'Influence'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Canal' : 'Channel'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Último Contacto' : 'Last Contact'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Responsable' : 'Owner'}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Acciones' : 'Actions'}</th></tr></thead>
                <tbody>
                  {stakeholders.map(st => {
                    const inf = influenceStyle[st.influence] || influenceStyle.MEDIUM;
                    return (
                      <tr key={st.id} className="border-b border-gray-100 hover:bg-surface-1">
                        <td className="p-4 font-semibold text-sm">{st.name}</td>
                        <td className="p-4"><span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{typeLabels[st.type] || st.type}</span></td>
                        <td className="p-4 text-sm text-secondary">{st.location || '—'}</td>
                        <td className="p-4"><span className="badge" style={{ background: inf.bg, color: inf.color }}>{st.influence === 'HIGH' ? (language === 'es' ? 'Alta' : 'High') : st.influence === 'MEDIUM' ? (language === 'es' ? 'Media' : 'Medium') : (language === 'es' ? 'Baja' : 'Low')}</span></td>
                        <td className="p-4 text-sm text-secondary">{st.engagementChannel || '—'}</td>
                        <td className="p-4 text-sm text-secondary">{st.lastEngagement ? new Date(st.lastEngagement).toLocaleDateString(language === 'es' ? 'es-CO' : 'en-US') : '—'}</td>
                        <td className="p-4 text-sm text-secondary">{st.responsibleName || '—'}</td>
                        <td className="p-4"><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => { setEditingSt(st); setShowForm(true); }}>✏️</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(st.id)}>🗑️</button></div></td>
                      </tr>
                    );
                  })}
                  {stakeholders.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted">{language === 'es' ? 'Sin partes interesadas registradas' : 'No stakeholders registered'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'quejas' && (
        <div className="flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Mantenimiento y Respuesta de Quejas (Principio 1 — HRDD)' : 'Grievance Response System (Principle 1 — HRDD)'}</h3>
              <p className="text-xs text-secondary mt-0.5">{language === 'es' ? 'Canal de comunicación, atención de peticiones y debida diligencia de impacto' : 'Communication channel, petitions & impact due diligence'}</p>
            </div>
            <button className="btn btn-primary" onClick={() => alert(language === 'es' ? 'Función de registro disponible' : 'Registration available')}>{t('sh.newGrievance')}</button>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-surface-1 border-b">
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Código / Fecha' : 'Code / Date'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Parte Interesada' : 'Stakeholder'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Categoría' : 'Category'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Descripción' : 'Description'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Plazo Respuesta' : 'Deadline'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Responsable' : 'Owner'}</th>
                    <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Estado' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(q => (
                    <tr key={q.id} className="border-b border-gray-100 hover:bg-surface-1">
                      <td className="p-4">
                        <div className="flex-col">
                          <span className="font-semibold text-sm font-mono text-primary">{q.code}</span>
                          <span className="text-xs text-secondary">{q.date}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium">{q.stakeholder}</td>
                      <td className="p-4"><span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{q.category}</span></td>
                      <td className="p-4 text-sm text-secondary">{q.description}</td>
                      <td className="p-4 text-sm font-mono text-secondary">{q.deadline}</td>
                      <td className="p-4 text-sm text-secondary">{q.owner}</td>
                      <td className="p-4">
                        {q.status === 'RESUELTA' ? (
                          <span className="badge" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>{language === 'es' ? 'Resueltas' : 'Resolved'}</span>
                        ) : q.status === 'EN_INVESTIGACION' ? (
                          <span className="badge" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>{language === 'es' ? 'En Investigación' : 'Under Review'}</span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>{language === 'es' ? 'Recibida' : 'Received'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay flex-center" onClick={() => setShowForm(false)}>
          <div className="modal card max-w-lg w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-primary">{editingSt ? (language === 'es' ? 'Editar Parte Interesada' : 'Edit Stakeholder') : (language === 'es' ? 'Nueva Parte Interesada' : 'New Stakeholder')}</h3><button className="btn-icon" onClick={() => setShowForm(false)}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmit} className="flex-col gap-4">
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Nombre' : 'Name'}</label><input name="name" className="form-input" defaultValue={editingSt?.name} required /></div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Tipo' : 'Type'}</label><select name="type" className="form-input" defaultValue={editingSt?.type || ''} required><option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Influencia' : 'Influence'}</label><select name="influence" className="form-input" defaultValue={editingSt?.influence || 'MEDIUM'} required><option value="HIGH">{language === 'es' ? 'Alta' : 'High'}</option><option value="MEDIUM">{language === 'es' ? 'Media' : 'Medium'}</option><option value="LOW">{language === 'es' ? 'Baja' : 'Low'}</option></select></div>
              </div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Ubicación' : 'Location'}</label><input name="location" className="form-input" defaultValue={editingSt?.location} /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Interés / Expectativas' : 'Interest / Expectations'}</label><input name="interest" className="form-input" defaultValue={editingSt?.interest} /></div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Canal' : 'Channel'}</label><input name="engagementChannel" className="form-input" defaultValue={editingSt?.engagementChannel} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Estado' : 'Status'}</label><select name="status" className="form-input" defaultValue={editingSt?.status || 'ACTIVE'}><option value="ACTIVE">{language === 'es' ? 'Activa' : 'Active'}</option><option value="INACTIVE">{language === 'es' ? 'Inactiva' : 'Inactive'}</option><option value="PENDING">{language === 'es' ? 'Pendiente' : 'Pending'}</option></select></div>
              </div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Último Contacto' : 'Last Contact'}</label><input name="lastEngagement" className="form-input" type="date" defaultValue={editingSt?.lastEngagement?.split('T')[0]} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Próximo Contacto' : 'Next Contact'}</label><input name="nextEngagement" className="form-input" type="date" defaultValue={editingSt?.nextEngagement?.split('T')[0]} /></div>
              </div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Responsable' : 'Owner'}</label><input name="responsibleName" className="form-input" defaultValue={editingSt?.responsibleName} /></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">Email</label><input name="responsibleEmail" className="form-input" type="email" defaultValue={editingSt?.responsibleEmail} /></div>
              </div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Notas' : 'Notes'}</label><textarea name="notes" className="form-input" rows={2} defaultValue={editingSt?.notes} /></div>
              <div className="flex gap-3 justify-end mt-4"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('btn.cancel')}</button><button type="submit" className="btn btn-primary">{editingSt ? (language === 'es' ? 'Actualizar' : 'Update') : t('btn.save')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
