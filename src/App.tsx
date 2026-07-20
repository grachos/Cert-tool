import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import Documents from './modules/Documents';
import Risks from './modules/Risks';
import Compliance from './modules/Compliance';
import Evidence from './modules/Evidence';
import Automation from './modules/Automation';
import Audits from './modules/Audits';
import Users from './modules/Users';
import Scc from './modules/Scc';
import Stakeholders from './modules/Stakeholders';
import Alerts from './modules/Alerts';
import PlantExtractora from './modules/PlantExtractora';
import GhgCalculator from './modules/GhgCalculator';
import SupplyBase from './modules/SupplyBase';
import PlantationCompliance from './modules/PlantationCompliance';
import Toast from './components/Toast';
import Login from './modules/Login';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeLanguageProvider, useThemeLanguage } from './components/ThemeLanguageContext';
import { UoCProvider } from './components/UoCContext';

type ModuleId = 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'audits' | 'users' | 'scc' | 'stakeholders' | 'alerts' | 'plant' | 'ghg' | 'supply' | 'plantations';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, removeToast } = useToast();
  const { user, loading } = useAuth();
  const { t } = useThemeLanguage();

  if (loading) {
    return <div className="flex-center min-h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

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
      case 'audits':
        return <Audits />;
      case 'users':
        return <Users />;
      case 'scc':
        return <Scc />;
      case 'stakeholders':
        return <Stakeholders />;
      case 'alerts':
        return <Alerts />;
      case 'plant':
        return <PlantExtractora />;
      case 'ghg':
        return <GhgCalculator />;
      case 'supply':
        return <SupplyBase />;
      case 'plantations':
        return <PlantationCompliance />;
      default:
        return <Dashboard onNavigate={setActiveModule} />;
    }
  };

  const getModuleTitle = (): { title: string; subtitle: string } => {
    const titles: Record<ModuleId, { title: string; subtitle: string }> = {
      dashboard: { title: t('title.dashboard'), subtitle: t('subtitle.dashboard') },
      documents: { title: t('title.documents'), subtitle: t('subtitle.documents') },
      risks: { title: t('title.risks'), subtitle: t('subtitle.risks') },
      compliance: { title: t('title.compliance'), subtitle: t('subtitle.compliance') },
      evidence: { title: t('title.evidence'), subtitle: t('subtitle.evidence') },
      automation: { title: t('title.automation'), subtitle: t('subtitle.automation') },
      audits: { title: t('title.audits'), subtitle: t('subtitle.audits') },
      users: { title: t('title.users'), subtitle: t('subtitle.users') },
      scc: { title: t('title.scc'), subtitle: t('subtitle.scc') },
      stakeholders: { title: t('title.stakeholders'), subtitle: t('subtitle.stakeholders') },
      alerts: { title: t('title.alerts'), subtitle: t('subtitle.alerts') },
      plant: { title: t('title.plant'), subtitle: t('subtitle.plant') },
      ghg: { title: t('title.ghg'), subtitle: t('subtitle.ghg') },
      supply: { title: t('title.supply'), subtitle: t('subtitle.supply') },
      plantations: { title: t('title.plantations'), subtitle: t('subtitle.plantations') }
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
    <ThemeLanguageProvider>
      <AuthProvider>
        <UoCProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </UoCProvider>
      </AuthProvider>
    </ThemeLanguageProvider>
  );
}

export default App;
