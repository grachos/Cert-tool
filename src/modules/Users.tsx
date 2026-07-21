import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface User { id: string; name: string; email: string; role: string; createdAt: string; }

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
  const [role, setRole] = useState('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => { try { setIsLoading(true); const { data } = await api.get('/users'); setUsers(data); } catch (e) { /* */ } setIsLoading(false); };
  useEffect(() => { fetchUsers(); }, []);

  const openNew = () => { setEditingUser(null); setName(''); setEmail(''); setPassword(''); setRole('USER'); setShowModal(true); };
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
        if (!password || password.length < 6) { setIsSubmitting(false); return; }
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
            <table className="w-full text-left min-w-[600px]">
              <thead><tr className="bg-surface-1 border-b border-gray-200"><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thName')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thEmail')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thRole')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thDate')}</th><th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thActions')}</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-surface-1">
                    <td className="p-4 font-semibold text-primary">{u.name}</td>
                    <td className="p-4 text-secondary">{u.email}</td>
                    <td className="p-4">{roleBadge(u.role)}</td>
                    <td className="p-4 text-secondary text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-4"><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>✏️ Editar</button><button className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(u.id)}>🗑️</button></div></td>
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
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label><input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={editingUser ? '••••••' : 'Mín. 6 caracteres'} required={!editingUser} /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">Rol</label><select className="form-input" value={role} onChange={e => setRole(e.target.value)}><option value="USER">Usuario Estándar</option><option value="REVIEWER">Revisor / Jefe de Área</option><option value="AUDITOR">Auditor Interno</option><option value="COORDINATOR">Coordinador RSPO</option><option value="MANAGER">Gerencia</option><option value="ADMIN">Administrador</option></select></div>
              <div className="flex gap-3 justify-end mt-4"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
