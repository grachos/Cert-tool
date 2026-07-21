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
import { UocProvider } from './components/UoCContext';
import QuickSearch from './components/QuickSearch';

type ModuleId = 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'audits' | 'users' | 'scc' | 'stakeholders' | 'alerts' | 'plant' | 'ghg' | 'supply' | 'plantations';

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toasts, removeToast } = useToast();
  const { user, loading } = useAuth();
  const { t } = useThemeLanguage();

  if (loading) {
    return <div className="flex-center min-h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const getModuleTitle = (): { title: string; subtitle: string } => {
    const titles: Record<ModuleId, { title: string; subtitle: string }> = {
      dashboard: { title: t('nav.dashboard'), subtitle: 'Vista ejecutiva y control consolidado por UoC' },
      compliance: { title: t('nav.compliance'), subtitle: 'Monitoreo de indicadores y matriz de cumplimiento' },
      documents: { title: t('nav.documents'), subtitle: 'Biblioteca documental y matriz legal M2' },
      evidence: { title: t('nav.evidence'), subtitle: 'Repositorio de evidencias y verificación de auditoría' },
      automation: { title: t('nav.automation'), subtitle: 'Reglas automáticas y flujos de trabajo' },
      risks: { title: t('nav.risks'), subtitle: 'Matriz de riesgos y mitigación' },
      audits: { title: t('nav.audits'), subtitle: 'Plan de auditorías e inspecciones' },
      users: { title: t('nav.users'), subtitle: 'Gestión de usuarios y permisos' },
      scc: { title: 'Cadena de Suministro SCC', subtitle: 'Trazabilidad y modelos de suministro RSPO (IP, SG, MB, BC)' },
      stakeholders: { title: 'Gestión de Partes Interesadas', subtitle: 'Matriz de diálogo social, canales FPIC/CLPI y atención a comunidades' },
      alerts: { title: 'Alertas y Notificaciones', subtitle: 'Centro de control de eventos críticos, hallazgos y alertas tempranas' },
      plant: { title: 'Planta Extractora', subtitle: 'Control operacional de procesamiento de RFF, tasas de extracción (OER/KER) y laboratorio' },
      ghg: { title: 'Calculadora GHG / PalmGHG', subtitle: 'Monitoreo de emisiones tCO2e/tCPO, alcances 1, 2 y 3' },
      supply: { title: 'Base de Suministro', subtitle: 'Registro de predios propios, terceros, grupos de pequeños productores y evaluación de riesgo' },
      plantations: { title: 'Cumplimiento Agrícola', subtitle: 'Monitoreo de campo, sanidad vegetal, labores agronómicas y registro por lotes' },
    };
    return titles[activeModule];
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <Sidebar
        activeModule={activeModule}
        onNavigate={(m) => { setActiveModule(m); setMobileMenuOpen(false); }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="main-content">
        <Header
          title={getModuleTitle().title}
          subtitle={getModuleTitle().subtitle}
          onToggleSidebar={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavigateNotifications={() => setActiveModule('alerts')}
        />
        <div className="page-content">
          {activeModule === 'dashboard' && <Dashboard onNavigate={setActiveModule} />}
          {activeModule === 'compliance' && <Compliance />}
          {activeModule === 'documents' && <Documents />}
          {activeModule === 'evidence' && <Evidence />}
          {activeModule === 'automation' && <Automation />}
          {activeModule === 'risks' && <Risks />}
          {activeModule === 'audits' && <Audits />}
          {activeModule === 'users' && <Users />}
          {activeModule === 'scc' && <Scc />}
          {activeModule === 'stakeholders' && <Stakeholders />}
          {activeModule === 'alerts' && <Alerts />}
          {activeModule === 'plant' && <PlantExtractora />}
          {activeModule === 'ghg' && <GhgCalculator />}
          {activeModule === 'supply' && <SupplyBase />}
          {activeModule === 'plantations' && <PlantationCompliance />}
        </div>
      </div>
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
      <QuickSearch onNavigate={(id) => setActiveModule(id as ModuleId)} />
    </div>
  );
}

function App() {
  return (
    <ThemeLanguageProvider>
      <AuthProvider>
        <UocProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </UocProvider>
      </AuthProvider>
    </ThemeLanguageProvider>
  );
}

export default App;
