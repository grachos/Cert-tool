import { useState, useEffect } from 'react';
import api from '../api';
import { useThemeLanguage } from '../components/ThemeLanguageContext';

interface Alert { id: string; title: string; message: string; type: string; priority: string; action: string; module: string; createdAt: string; dismissed: number; }

const typeStyles: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  critico: { bg: 'var(--accent-red-bg)', border: 'var(--accent-red)', icon: '🔴', badge: 'var(--accent-red)' },
  alta: { bg: 'var(--accent-gold-bg)', border: 'var(--accent-gold)', icon: '🟠', badge: 'var(--accent-gold)' },
  media: { bg: 'var(--accent-blue-light)', border: 'var(--accent-blue)', icon: '🔵', badge: 'var(--accent-blue)' },
  info: { bg: 'var(--accent-green-bg)', border: 'var(--accent-green)', icon: '🟢', badge: 'var(--accent-green)' },
};

export default function Alerts() {
  const { t, language } = useThemeLanguage();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetch = async () => { try { setLoading(true); const { data } = await api.get('/alerts'); setAlerts(data); } catch (e) { /* */ } setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const handleDismiss = async (id: string) => { try { await api.put(`/alerts/${id}/dismiss`); fetch(); } catch (e) { alert(language === 'es' ? 'Error al descartar' : 'Error dismissing alert'); } };
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    try { await api.post('/alerts', data); setShowForm(false); fetch(); } catch (err) { alert(language === 'es' ? 'Error al crear' : 'Error creating alert'); }
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);
  const active = alerts.filter(a => a.type === 'critico' || a.type === 'alta').length;

  if (loading) return <div className="text-center text-muted" style={{ padding: '3rem' }}>{language === 'es' ? 'Cargando alertas...' : 'Loading alerts...'}</div>;

  return (
    <div className="flex-col gap-6 animate-fade-in">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('alerts.active')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{active}</span><span className="text-sm text-muted">{language === 'es' ? 'Críticas + Altas' : 'Critical + High'}</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accent-red)' }}>{t('alerts.critical')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-red)' }}>{alerts.filter(a => a.type === 'critico').length}</span><span className="text-sm text-muted">{t('alerts.immediateAction')}</span></div></div>
        <div className="card"><div className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--accent-gold)' }}>{t('alerts.high')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{alerts.filter(a => a.type === 'alta').length}</span><span className="text-sm text-muted">{t('alerts.promptAttention')}</span></div></div>
        <div className="card"><div className="text-sm text-secondary font-medium uppercase tracking-wide">{t('alerts.pending')}</div><div className="flex justify-between items-end mt-3"><span className="text-3xl font-bold text-primary">{alerts.filter(a => a.dismissed === 0).length}</span><span className="text-sm text-muted">{t('alerts.notDismissed')}</span></div></div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-bold text-primary">{t('alerts.title')}</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>{t('alerts.newAlert')}</button>
      </div>

      <div className="flex gap-1 flex-wrap">
        {['all', 'critico', 'alta', 'media', 'info'].map(f => (
          <button key={f} className={filter === f ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'} onClick={() => setFilter(f)}>
            {f === 'all' ? t('alerts.filterAll') : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-col gap-3">
        {filtered.map(a => {
          const s = typeStyles[a.type] || typeStyles.info;
          return (
            <div key={a.id} className="card" style={{ borderLeft: `4px solid ${s.border}` }}>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{a.title}</span>
                    <span className="badge" style={{ background: s.badge, color: '#fff', fontSize: '0.65rem' }}>{a.type.toUpperCase()}</span>
                    {a.module && <span className="badge" style={{ background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', fontSize: '0.65rem' }}>{a.module}</span>}
                  </div>
                  <span className="text-sm text-secondary">{a.message}</span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString(language === 'es' ? 'es-CO' : 'en-US')}</span>
                    {a.action && <span className="text-xs font-medium" style={{ color: s.border }}>{language === 'es' ? 'Acción' : 'Action'}: {a.action}</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDismiss(a.id)}>{t('alerts.dismiss')}</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center text-muted" style={{ padding: '2rem' }}>{language === 'es' ? 'Sin alertas para este filtro.' : 'No alerts for this filter.'}</div>}
      </div>

      {showForm && (
        <div className="modal-overlay flex-center" onClick={() => setShowForm(false)}>
          <div className="modal card max-w-md w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-primary">{language === 'es' ? 'Nueva Alerta' : 'New Alert'}</h3><button className="btn-icon" onClick={() => setShowForm(false)}><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <form onSubmit={handleCreate} className="flex-col gap-4">
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Título' : 'Title'}</label><input name="title" className="form-input" required /></div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Mensaje' : 'Message'}</label><textarea name="message" className="form-input" rows={3} required /></div>
              <div className="flex gap-2">
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Prioridad' : 'Priority'}</label><select name="type" className="form-input" required><option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option><option value="critico">{language === 'es' ? 'Crítico' : 'Critical'}</option><option value="alta">{language === 'es' ? 'Alta' : 'High'}</option><option value="media">{language === 'es' ? 'Media' : 'Medium'}</option><option value="info">{language === 'es' ? 'Informativa' : 'Info'}</option></select></div>
                <div className="form-group flex-col gap-1 flex-1"><label className="form-label font-semibold">{language === 'es' ? 'Módulo' : 'Module'}</label><select name="module" className="form-input"><option value="">{language === 'es' ? 'General' : 'General'}</option><option value="RSPO">RSPO</option><option value="SCC">SCC</option><option value="Compliance">{language === 'es' ? 'Cumplimiento' : 'Compliance'}</option><option value="Audit">{language === 'es' ? 'Auditoría' : 'Audit'}</option><option value="Evidence">{language === 'es' ? 'Evidencias' : 'Evidence'}</option></select></div>
              </div>
              <div className="form-group flex-col gap-1"><label className="form-label font-semibold">{language === 'es' ? 'Acción requerida' : 'Required Action'}</label><input name="action" className="form-input" /></div>
              <div className="flex gap-3 justify-end mt-4"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>{t('btn.cancel')}</button><button type="submit" className="btn btn-primary">{language === 'es' ? 'Crear Alerta' : 'Create Alert'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
