import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import Documents from './modules/Documents';
import Risks from './modules/Risks';
import Compliance from './modules/Compliance';
import Evidence from './modules/Evidence';
import Automation from './modules/Automation';
import Toast from './components/Toast';
import { ToastProvider, useToast } from './components/ToastContext';

type ModuleId = 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, removeToast } = useToast();

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveModule} />;
      case 'documents':
        return <Documents />;
      case 'risks':
        return <Risks />;
      case 'compliance':
        return <Compliance />;
      case 'evidence':
        return <Evidence />;
      case 'automation':
        return <Automation />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  const getModuleTitle = (): { title: string; subtitle: string } => {
    const titles: Record<ModuleId, { title: string; subtitle: string }> = {
      dashboard: { title: 'Panel Principal', subtitle: 'Vista general del cumplimiento organizacional' },
      documents: { title: 'Revisión Documental', subtitle: 'Análisis de documentos y contratos con IA' },
      risks: { title: 'Análisis de Riesgos', subtitle: 'Matriz de riesgos e identificación con IA' },
      compliance: { title: 'Cumplimiento Normativo', subtitle: 'Monitoreo de normas y estándares' },
      evidence: { title: 'Evidencias para Auditorías', subtitle: 'Generación y gestión de evidencias' },
      automation: { title: 'Automatización de Procesos', subtitle: 'Planes de acción y seguimiento' },
    };
    return titles[activeModule];
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="main-content">
        <Header
          title={getModuleTitle().title}
          subtitle={getModuleTitle().subtitle}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="page-content">
          {renderModule()}
        </div>
      </div>
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
