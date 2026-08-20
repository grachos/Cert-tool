import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface Uoc { id: string; name: string }
interface PlantationAssignment {
  id?: string;
  farmPlotId: string;
  plantationName: string;
  producerName?: string;
  assignmentId?: string;
  accessLevel?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  status?: string;
}
interface User { id: string; name: string; email: string; role: string; createdAt: string; assignedUocs?: Uoc[]; assignedPlantations?: PlantationAssignment[]; }

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { addToast } = useToast();
  const { t } = useThemeLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PLANTATION_OPERATOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uocs, setUocs] = useState<Uoc[]>([]);
  const [assignmentUser, setAssignmentUser] = useState<User | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [plantationUser, setPlantationUser] = useState<User | null>(null);
  const [plantationUocId, setPlantationUocId] = useState('');
  const [plantationOptions, setPlantationOptions] = useState<PlantationAssignment[]>([]);

  const fetchUsers = async () => { 
    try { 
      setIsLoading(true); 
      const { data } = await api.get('/users'); 
      const list = Array.isArray(data) ? data : [];
      setUsers(list.map((u:any)=>({...u,assignedUocs:typeof u.assignedUocs==='string'?JSON.parse(u.assignedUocs):u.assignedUocs}))); 
    } catch { 
      setUsers([]);
      addToast({type:'error',title:'Error',message:'No fue posible cargar usuarios.'}); 
    } setIsLoading(false); 
  };
  useEffect(() => { fetchUsers(); api.get('/scc/uocs').then(({ data }) => setUocs(Array.isArray(data) ? data : [])).catch(() => setUocs([])); }, []);

  const openAssignments = async (user: User) => {
    try {
      const { data } = await api.get(`/users/${user.id}/uocs`);
      setAssignedIds(Array.isArray(data) ? data.map((u: Uoc) => u.id) : []);
      setAssignmentUser(user);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'No fue posible consultar asignaciones.' });
    }
  };

  const toggleAssignment = async (uocId: string) => {
    if (!assignmentUser) return;
    try {
      if (assignedIds.includes(uocId)) {
        await api.delete(`/users/${assignmentUser.id}/uocs/${uocId}`);
        setAssignedIds(ids => ids.filter(id => id !== uocId));
      } else {
        await api.post(`/users/${assignmentUser.id}/uocs`, { uocId });
        setAssignedIds(ids => [...ids, uocId]);
      }
      await fetchUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'No fue posible modificar la asignación.' });
    }
  };

  const loadPlantationAssignments = async (user: User, uocId: string) => {
    if (!uocId) { setPlantationOptions([]); return; }
    try {
      const { data } = await api.get(`/users/${user.id}/plantations`, { params: { uocId } });
      setPlantationOptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'No fue posible cargar las plantaciones.' });
    }
  };

  const openPlantations = async (user: User) => {
    const firstUoc = user.assignedUocs?.[0]?.id || uocs[0]?.id || '';
    setPlantationUser(user);
    setPlantationUocId(firstUoc);
    await loadPlantationAssignments(user, firstUoc);
  };

  const togglePlantation = async (plantation: PlantationAssignment, accessLevel?: string) => {
    if (!plantationUser) return;
    try {
      if (plantation.assignmentId && !accessLevel) {
        await api.delete(`/users/${plantationUser.id}/plantations/${plantation.farmPlotId}`);
      } else {
        await api.post(`/users/${plantationUser.id}/plantations`, {
          farmPlotId: plantation.farmPlotId,
          accessLevel: accessLevel || (plantationUser.role === 'PLANTATION_ADMIN' ? 'ADMIN' : plantationUser.role === 'VIEWER' || plantationUser.role === 'READ_ONLY' ? 'VIEWER' : 'OPERATOR')
        });
      }
      await loadPlantationAssignments(plantationUser, plantationUocId);
      await fetchUsers();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'No fue posible modificar el acceso.' });
    }
  };

  const openNew = () => { setEditingUser(null); setName(''); setEmail(''); setPassword(''); setRole('PLANTATION_OPERATOR'); setShowModal(true); };
  const openEdit = (u: User) => { setEditingUser(u); setName(u.name); setEmail(u.email); setPassword(''); setRole(u.role); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const body: any = { name, email, role };
      if (password) body.password = password;
      if (editingUser) {
        const { data } = await api.put(`/users/${editingUser.id}`, body);
        setUsers(users.map(u => u.id === editingUser.id ? data : u));
        addToast({ type: 'success', title: 'Éxito', message: 'Usuario actualizado.' });
      } else {
        if (!password || password.length < 8) { addToast({ type: 'error', title: 'Contraseña corta', message: 'Use mínimo 8 caracteres.' }); setIsSubmitting(false); return; }
        const { data } = await api.post('/users', body);
        setUsers([data, ...users]);
        addToast({ type: 'success', title: 'Éxito', message: 'Usuario creado.' });
      }
      setShowModal(false);
    } catch (err: any) { addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Error' }); }
    setIsSubmitting(false);
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try { await api.delete(`/users/${userId}`); setUsers(users.filter(u => u.id !== userId)); addToast({ type: 'success', title: 'Éxito', message: 'Usuario eliminado.' }); }
    catch (err: any) { addToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Error' }); }
  };

  const roleBadge = (r: string) => {
    const m: Record<string, { bg: string; c: string }> = { ADMIN: { bg: '#fee2e2', c: 'var(--accent-red)' }, MANAGER: { bg: '#e0e7ff', c: 'var(--accent-blue)' }, COORDINATOR: { bg: '#dcfce7', c: 'var(--accent-green)' }, AUDITOR: { bg: '#fef3c7', c: 'var(--accent-gold)' }, REVIEWER: { bg: '#f3e8ff', c: '#9333ea' }, USER: { bg: '#f1f5f9', c: 'var(--text-secondary)' } };
    const s = m[r] || m.USER;
    return <span className="badge" style={{ background: s.bg, color: s.c, fontWeight: 600 }}>{r}</span>;
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div><h2 className="text-xl font-bold text-primary">{t('users.title')}</h2><p className="text-sm text-secondary mt-1">{t('users.desc')}</p></div>
        <button className="btn btn-primary" onClick={openNew}>{t('users.btnNew')}</button>
      </div>

      <div className="card p-0 overflow-hidden border border-gray-200">
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('users.loading')}</div> : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[850px]">
              <thead><tr className="bg-surface-1 border-b border-gray-200"><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thName')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thEmail')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thRole')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">UoC asignadas</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Plantaciones</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thDate')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thActions')}</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-surface-1">
                    <td className="p-4 font-semibold text-primary">{u.name}</td>
                    <td className="p-4 text-secondary">{u.email}</td>
                    <td className="p-4">{roleBadge(u.role)}</td>
                    <td className="p-4 text-sm text-secondary">{(u.assignedUocs || []).filter(Boolean).map(x => x.name).join(', ') || 'Sin UoC'}</td>
                    <td className="p-4 text-sm text-secondary">{(u.assignedPlantations || []).map(x => x.plantationName).join(', ') || 'Sin plantación'}</td>
                    <td className="p-4 text-secondary text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4"><div className="flex gap-1 flex-wrap"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Editar</button><button className="btn btn-ghost btn-sm" onClick={() => openAssignments(u)}>UoC</button><button className="btn btn-ghost btn-sm" onClick={() => openPlantations(u)}>Plantaciones</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(u.id)}>Eliminar</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay flex-center" onClick={() => setShowModal(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-primary">{editingUser ? 'Editar Usuario' : t('users.btnNew')}</h3><button className="btn-icon" onClick={() => setShowModal(false)}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleSubmit} className="flex-col gap-4">
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Nombre</label><input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Email</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" required /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label><input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={editingUser ? '••••••••' : 'Mín. 8 caracteres'} required={!editingUser} /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Rol</label><select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="PLANTATION_OPERATOR">Operativo de plantación</option>
                <option value="PLANTATION_ADMIN">Administrador de plantación</option>
                <option value="READ_ONLY">Consulta de plantación</option>
                <option value="TECHNICAL_REVIEWER">Revisor técnico</option>
                <option value="AUDITOR">Auditor</option>
                <option value="COORDINATOR">Coordinador RSPO</option>
                <option value="MILL_ADMIN">Administrador de extractora</option>
                <option value="MANAGER">Gerencia</option>
                <option value="ADMIN">Administrador general</option>
              </select></div>
              <div className="flex gap-3 justify-end mt-4"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
      {assignmentUser && (
        <div className="modal-overlay flex-center" onClick={() => setAssignmentUser(null)}>
          <div className="modal card max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold">UoC de {assignmentUser.name}</h3><button className="btn-icon" onClick={() => setAssignmentUser(null)}>×</button></div>
            <p className="text-sm text-secondary mb-4">Los usuarios sin asignaciones no pueden consultar información operativa.</p>
            <div className="flex-col gap-2">
              {uocs.map(uoc => <label key={uoc.id} className="flex items-center gap-2"><input type="checkbox" checked={assignedIds.includes(uoc.id)} onChange={() => toggleAssignment(uoc.id)} /> {uoc.name}</label>)}
              {!uocs.length && <p className="text-sm text-muted">No existen UoC disponibles.</p>}
            </div>
          </div>
        </div>
      )}
      {plantationUser && (
        <div className="modal-overlay flex-center" onClick={() => setPlantationUser(null)}>
          <div className="modal card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><div><h3 className="font-bold">Plantaciones de {plantationUser.name}</h3><p className="text-sm text-secondary">Cada usuario de plantación solo podrá abrir los registros aquí asignados.</p></div><button className="btn-icon" onClick={() => setPlantationUser(null)}>×</button></div>
            <label className="form-label">Unidad de Certificación
              <select className="form-select mt-1" value={plantationUocId} onChange={async event => { setPlantationUocId(event.target.value); await loadPlantationAssignments(plantationUser, event.target.value); }}>
                <option value="">Seleccione una UoC</option>
                {uocs.map(uoc => <option key={uoc.id} value={uoc.id}>{uoc.name}</option>)}
              </select>
            </label>
            <div className="flex-col gap-2 mt-4">
              {plantationOptions.map(plantation => (
                <div key={plantation.farmPlotId} className="user-plantation-access-row">
                  <label><input type="checkbox" checked={Boolean(plantation.assignmentId)} onChange={() => togglePlantation(plantation)} /> <span><strong>{plantation.plantationName}</strong><small>{plantation.producerName}</small></span></label>
                  {plantation.assignmentId && <select className="form-select" value={plantation.accessLevel} onChange={event => togglePlantation(plantation, event.target.value)}>
                    <option value="ADMIN">Administra</option>
                    <option value="OPERATOR">Registra</option>
                    <option value="VIEWER">Solo consulta</option>
                  </select>}
                </div>
              ))}
              {!plantationOptions.length && <p className="text-sm text-muted">No hay plantaciones registradas en esta UoC.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
