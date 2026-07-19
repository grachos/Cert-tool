import { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../components/ToastContext';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER';
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();
  const { t, language } = useThemeLanguage();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'AUDITOR' | 'USER'>('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      addToast({ 
        type: 'error', 
        title: language === 'es' ? 'Error' : 'Error', 
        message: err.response?.data?.error || (language === 'es' ? 'Error al cargar los usuarios.' : 'Error loading users.') 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/users', { name, email, password, role });
      setUsers([res.data, ...users]);
      addToast({ 
        type: 'success', 
        title: language === 'es' ? 'Éxito' : 'Success', 
        message: language === 'es' ? 'Usuario registrado exitosamente.' : 'User successfully registered.' 
      });
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('USER');
    } catch (err: any) {
      addToast({ 
        type: 'error', 
        title: 'Error', 
        message: err.response?.data?.error || (language === 'es' ? 'Error al registrar el usuario.' : 'Error registering user.') 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: res.data.role } : u));
      addToast({ 
        type: 'success', 
        title: language === 'es' ? 'Éxito' : 'Success', 
        message: language === 'es' ? 'Rol actualizado con éxito.' : 'Role successfully updated.' 
      });
    } catch (err: any) {
      addToast({ 
        type: 'error', 
        title: 'Error', 
        message: err.response?.data?.error || (language === 'es' ? 'Error al actualizar el rol.' : 'Error updating role.') 
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(language === 'es' ? '¿Estás seguro de que deseas eliminar este usuario?' : 'Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      addToast({ 
        type: 'success', 
        title: language === 'es' ? 'Éxito' : 'Success', 
        message: language === 'es' ? 'Usuario eliminado.' : 'User deleted.' 
      });
    } catch (err: any) {
      addToast({ 
        type: 'error', 
        title: 'Error', 
        message: err.response?.data?.error || (language === 'es' ? 'Error al eliminar el usuario.' : 'Error deleting user.') 
      });
    }
  };

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-primary">{t('users.title')}</h2>
          <p className="text-sm text-secondary mt-1">{t('users.desc')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          {t('users.btnNew')}
        </button>
      </div>

      <div className="card p-0 overflow-hidden border border-gray-200">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('users.loading')}</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-1 border-b border-gray-200">
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thName')}</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thEmail')}</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thRole')}</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thDate')}</th>
                <th className="p-4 text-xs font-bold text-secondary uppercase tracking-wider">{t('users.thActions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-surface-1 transition-colors">
                  <td className="p-4">
                    <span className="font-semibold text-primary">{u.name}</span>
                  </td>
                  <td className="p-4 text-secondary">{u.email}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="form-input"
                      style={{ padding: '0.25rem 0.5rem', width: 'auto', display: 'inline-block' }}
                    >
                      <option value="ADMIN">{t('users.roleAdmin')}</option>
                      <option value="MANAGER">{t('users.roleManager')}</option>
                      <option value="AUDITOR">{t('users.roleAuditor')}</option>
                      <option value="USER">{t('users.roleUser')}</option>
                    </select>
                  </td>
                  <td className="p-4 text-secondary text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleDeleteUser(u.id)}
                      style={{ color: 'var(--accent-red)' }}
                    >
                      {t('btn.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <h3 className="text-lg font-bold text-primary mb-4">{t('users.btnNew')}</h3>
            <form onSubmit={handleAddUser} className="flex-col gap-4">
              <div className="form-group">
                <label className="form-label">{language === 'es' ? 'Nombre Completo' : 'Full Name'}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder={language === 'es' ? 'Ej. Juan Pérez' : 'e.g. John Doe'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('login.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="example@cert-techcol.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">{language === 'es' ? 'Contraseña Temporal' : 'Temporary Password'}</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder={language === 'es' ? 'Min. 6 caracteres' : 'Min. 6 characters'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('users.thRole')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="form-input"
                >
                  <option value="USER">{t('users.roleUser')}</option>
                  <option value="AUDITOR">{t('users.roleAuditor')}</option>
                  <option value="MANAGER">{t('users.roleManager')}</option>
                  <option value="ADMIN">{t('users.roleAdmin')}</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  {t('btn.cancel')}
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? (language === 'es' ? 'Registrando...' : 'Registering...') : (language === 'es' ? 'Registrar' : 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
