import { useState, useEffect } from 'react';
import { standards } from '../data/standards';
import type { ActionPlan } from '../types';
import { useThemeLanguage } from '../components/ThemeLanguageContext';
import api from '../api';

interface UserSelect {
  id: string;
  name: string;
  email: string;
}

export default function Automation() {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [users, setUsers] = useState<UserSelect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const { t, language } = useThemeLanguage();

  // Modals & form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlan | null>(null);
  
  // New Plan form data
  const [newPlanForm, setNewPlanForm] = useState({
    title: '',
    description: '',
    type: 'CORRECTIVE',
    priority: 'MEDIUM',
    assigneeId: '',
    dueDate: '',
    standardId: 'ISO9001'
  });

  // Edit progress / status state
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<string>('PENDING');

  // Drag over state to highlight column
  const [activeDragCol, setActiveDragCol] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/automation');
      setPlans(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/automation'),
      api.get('/users')
    ]).then(([autoRes, usersRes]) => {
      setPlans(autoRes.data);
      setUsers(usersRes.data);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  const pending = plans.filter(p => p.status === 'PENDING');
  const inProgress = plans.filter(p => p.status === 'IN_PROGRESS');
  const completed = plans.filter(p => p.status === 'COMPLETED');
  const overdue = plans.filter(p => p.status === 'OVERDUE');

  const columns = [
    { id: 'pending', statusKey: 'PENDING', title: t('auto.colPending'), items: pending, color: 'var(--surface-2)', headerColor: 'var(--text-primary)' },
    { id: 'in-progress', statusKey: 'IN_PROGRESS', title: t('auto.colInProgress'), items: inProgress, color: 'rgba(59, 130, 246, 0.05)', headerColor: 'var(--accent-blue)' },
    { id: 'completed', statusKey: 'COMPLETED', title: t('auto.colCompleted'), items: completed, color: 'rgba(16, 185, 129, 0.05)', headerColor: 'var(--accent-green)' },
    { id: 'overdue', statusKey: 'OVERDUE', title: t('auto.colOverdue'), items: overdue, color: 'rgba(239, 68, 68, 0.05)', headerColor: 'var(--accent-red)' }
  ];

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveDragCol(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusKey: string) => {
    e.preventDefault();
    setActiveDragCol(null);
    const id = e.dataTransfer.getData('text/plain');
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    if (plan.status === statusKey) return;

    let newProgress = plan.progress;
    if (statusKey === 'COMPLETED') {
      newProgress = 100;
    } else if (statusKey === 'PENDING') {
      newProgress = 0;
    } else if (statusKey === 'IN_PROGRESS' && (plan.progress === 0 || plan.progress === 100)) {
      newProgress = 50;
    }

    // Optimistic Update
    const oldPlans = [...plans];
    setPlans(plans.map(p => {
      if (p.id === id) {
        return { ...p, status: statusKey as any, progress: newProgress };
      }
      return p;
    }));

    try {
      await api.put(`/automation/${id}`, { status: statusKey, progress: newProgress });
    } catch (err) {
      console.error(err);
      setPlans(oldPlans);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.title || !newPlanForm.assigneeId || !newPlanForm.dueDate) return;

    try {
      await api.post('/automation', {
        title: newPlanForm.title,
        description: newPlanForm.description,
        type: newPlanForm.type,
        priority: newPlanForm.priority,
        assigneeId: newPlanForm.assigneeId,
        dueDate: newPlanForm.dueDate,
        standardId: newPlanForm.standardId
      });
      fetchPlans();
      setShowNewModal(false);
      setNewPlanForm({
        title: '',
        description: '',
        type: 'CORRECTIVE',
        priority: 'MEDIUM',
        assigneeId: '',
        dueDate: '',
        standardId: 'ISO9001'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPlanClick = (plan: ActionPlan) => {
    setSelectedPlan(plan);
    setEditProgress(plan.progress);
    setEditStatus(plan.status);
    setShowEditModal(true);
  };

  const handleSaveEditPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      await api.put(`/automation/${selectedPlan.id}`, {
        status: editStatus,
        progress: editProgress
      });
      fetchPlans();
      setShowEditModal(false);
      setSelectedPlan(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getStandardBadge = (standardId: string) => {
    const s = standards.find(st => st.id === standardId);
    if (!s) return null;
    return (
      <span className="badge" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
        {s.name}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    switch(p) {
      case 'high': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">{language === 'es' ? 'Alta' : 'High'}</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wider">{language === 'es' ? 'Media' : 'Medium'}</span>;
      case 'low': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">{language === 'es' ? 'Baja' : 'Low'}</span>;
      default: return null;
    }
  };

  if (isLoading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('auto.loading')}</div>;
  }

  return (
    <div className="flex-col gap-6 animate-fade-in h-full">
      
      {/* Header Controls */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-md border flex" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}>
            <button 
              className="px-3 py-1.5 text-sm font-medium rounded transition-all"
              style={{
                background: view === 'kanban' ? 'var(--bg-card)' : 'transparent',
                color: view === 'kanban' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: view === 'kanban' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setView('kanban')}
            >
              {t('auto.kanban')}
            </button>
            <button 
              className="px-3 py-1.5 text-sm font-medium rounded transition-all"
              style={{
                background: view === 'list' ? 'var(--bg-card)' : 'transparent',
                color: view === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                boxShadow: view === 'list' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setView('list')}
            >
              {t('auto.list')}
            </button>
          </div>
          <span className="text-sm text-secondary pl-4 border-l border-gray-200">
            <strong className="text-primary">{plans.length}</strong> {t('auto.planesCount')}
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '16px', height: '16px', marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t('auto.btnNewPlan')}
        </button>
      </div>

      {view === 'kanban' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start">
          {columns.map(col => (
            <div 
              key={col.id} 
              className="flex-col gap-3 transition-all rounded-lg"
              style={{
                background: activeDragCol === col.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                transform: activeDragCol === col.id ? 'scale(1.015)' : 'scale(1)'
              }}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.statusKey)}
            >
              <div className="flex justify-between items-center p-3 rounded-t-lg border-b-2" style={{ borderColor: col.headerColor, background: 'var(--surface-1)' }}>
                <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color: col.headerColor }}>{col.title}</h3>
                <span className="bg-white text-xs font-bold px-2 py-1 rounded shadow-sm text-secondary border border-gray-200">{col.items.length}</span>
              </div>
              
              <div className="flex-col gap-3 min-h-[500px] p-2 rounded-b-lg border border-gray-200" style={{ background: col.color }}>
                {col.items.map(item => (
                  <div 
                    key={item.id} 
                    className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md border border-gray-200 bg-white"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={() => handleEditPlanClick(item)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      {getStandardBadge(item.standard || item.standardId || '')}
                      {getPriorityBadge(item.priority)}
                    </div>
                    <h4 className="font-bold text-primary text-sm mb-1 leading-tight">{item.title}</h4>
                    <p className="text-xs text-secondary mb-3 line-clamp-2">{item.description}</p>
                    
                    <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                          {(item.assignee || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-secondary truncate max-w-[80px]">{item.assignee}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: item.status.toLowerCase() === 'overdue' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: '12px', height: '12px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {item.dueDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card p-0 overflow-hidden border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-1 border-b border-gray-200">
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Plan de Acción' : 'Action Plan'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('docs.thNorm')}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Prioridad' : 'Priority'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Estado' : 'Status'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Progreso' : 'Progress'}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{t('risks.thOwner')}</th>
                <th className="p-3 text-xs font-bold text-secondary uppercase tracking-wider">{language === 'es' ? 'Vencimiento' : 'Due Date'}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(item => (
                <tr 
                  key={item.id} 
                  className="border-b border-gray-100 hover:bg-surface-1 transition-colors cursor-pointer"
                  onClick={() => handleEditPlanClick(item)}
                >
                  <td className="p-4">
                    <div className="flex-col">
                      <span className="font-semibold text-primary text-sm">{item.title}</span>
                      <span className="text-xs text-secondary mt-1">{item.type}</span>
                    </div>
                  </td>
                  <td className="p-4">{getStandardBadge(item.standard || item.standardId || '')}</td>
                  <td className="p-4">{getPriorityBadge(item.priority)}</td>
                  <td className="p-4">
                    <span className={`badge ${item.status === 'COMPLETED' ? 'badge-success' : item.status === 'OVERDUE' ? 'badge-danger' : item.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-surface-2 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-secondary">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-secondary">{item.assignee}</td>
                  <td className="p-4 text-sm font-medium" style={{ color: item.status.toLowerCase() === 'overdue' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                    {item.dueDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: NUEVO PLAN DE ACCIÓN */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{language === 'es' ? 'Crear Nuevo Plan de Acción' : 'Create New Action Plan'}</h3>
              <button className="btn-icon" onClick={() => setShowNewModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePlan}>
              <div className="modal-body flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Título' : 'Title'}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={newPlanForm.title}
                    onChange={e => setNewPlanForm({ ...newPlanForm, title: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Descripción' : 'Description'}</label>
                  <textarea 
                    className="form-input" 
                    style={{ minHeight: '80px' }}
                    value={newPlanForm.description}
                    onChange={e => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">{language === 'es' ? 'Norma' : 'Standard'}</label>
                    <select 
                      className="form-select"
                      value={newPlanForm.standardId}
                      onChange={e => setNewPlanForm({ ...newPlanForm, standardId: e.target.value })}
                    >
                      {standards.map(std => (
                        <option key={std.id} value={std.id}>{std.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{language === 'es' ? 'Tipo' : 'Type'}</label>
                    <select 
                      className="form-select"
                      value={newPlanForm.type}
                      onChange={e => setNewPlanForm({ ...newPlanForm, type: e.target.value })}
                    >
                      <option value="CORRECTIVE">{language === 'es' ? 'Correctiva' : 'Corrective'}</option>
                      <option value="PREVENTIVE">{language === 'es' ? 'Preventiva' : 'Preventive'}</option>
                      <option value="IMPROVEMENT">{language === 'es' ? 'Mejora' : 'Improvement'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">{language === 'es' ? 'Prioridad' : 'Priority'}</label>
                    <select 
                      className="form-select"
                      value={newPlanForm.priority}
                      onChange={e => setNewPlanForm({ ...newPlanForm, priority: e.target.value })}
                    >
                      <option value="HIGH">{language === 'es' ? 'Alta' : 'High'}</option>
                      <option value="MEDIUM">{language === 'es' ? 'Media' : 'Medium'}</option>
                      <option value="LOW">{language === 'es' ? 'Baja' : 'Low'}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{language === 'es' ? 'Fecha de Vencimiento' : 'Due Date'}</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      required 
                      value={newPlanForm.dueDate}
                      onChange={e => setNewPlanForm({ ...newPlanForm, dueDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Usuario Responsable' : 'Assignee'}</label>
                  <select 
                    className="form-select" 
                    required
                    value={newPlanForm.assigneeId}
                    onChange={e => setNewPlanForm({ ...newPlanForm, assigneeId: e.target.value })}
                  >
                    <option value="">{language === 'es' ? '-- Seleccione un responsable --' : '-- Select assignee --'}</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'es' ? 'Crear Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDICIÓN / DETALLE DE PLAN */}
      {showEditModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{language === 'es' ? 'Detalle de Plan de Acción' : 'Action Plan Details'}</h3>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEditPlan}>
              <div className="modal-body flex-col gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    {getStandardBadge(selectedPlan.standard || selectedPlan.standardId || '')}
                    {getPriorityBadge(selectedPlan.priority)}
                  </div>
                  <h4 className="text-lg font-bold text-primary">{selectedPlan.title}</h4>
                  <p className="text-sm text-secondary mt-1">{selectedPlan.description}</p>
                </div>

                <div className="bg-surface-1 p-3 rounded-lg border border-gray-200 text-xs flex-col gap-2">
                  <div className="flex-between">
                    <span className="text-secondary">{language === 'es' ? 'Tipo' : 'Type'}:</span>
                    <strong className="text-primary">{selectedPlan.type}</strong>
                  </div>
                  <div className="flex-between">
                    <span className="text-secondary">{language === 'es' ? 'Responsable' : 'Assignee'}:</span>
                    <strong className="text-primary">{selectedPlan.assignee}</strong>
                  </div>
                  <div className="flex-between">
                    <span className="text-secondary">{language === 'es' ? 'Vencimiento' : 'Due Date'}:</span>
                    <strong className="text-primary">{selectedPlan.dueDate}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{language === 'es' ? 'Estado' : 'Status'}</label>
                  <select 
                    className="form-select"
                    value={editStatus}
                    onChange={e => {
                      const newStatus = e.target.value;
                      setEditStatus(newStatus);
                      if (newStatus === 'COMPLETED') setEditProgress(100);
                      else if (newStatus === 'PENDING') setEditProgress(0);
                    }}
                  >
                    <option value="PENDING">{language === 'es' ? 'Pendiente' : 'Pending'}</option>
                    <option value="IN_PROGRESS">{language === 'es' ? 'En Progreso' : 'In Progress'}</option>
                    <option value="COMPLETED">{language === 'es' ? 'Completado' : 'Completed'}</option>
                    <option value="OVERDUE">{language === 'es' ? 'Vencido' : 'Overdue'}</option>
                  </select>
                </div>

                <div className="form-group">
                  <div className="flex justify-between items-center mb-1">
                    <label className="form-label">{language === 'es' ? 'Progreso' : 'Progress'}</label>
                    <span className="text-xs font-bold text-blue-500">{editProgress}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    className="w-full cursor-pointer accent-blue-500" 
                    value={editProgress}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setEditProgress(val);
                      if (val === 100) setEditStatus('COMPLETED');
                      else if (val === 0) setEditStatus('PENDING');
                      else if (editStatus === 'COMPLETED' || editStatus === 'PENDING') {
                        setEditStatus('IN_PROGRESS');
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  {language === 'es' ? 'Cerrar' : 'Close'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
