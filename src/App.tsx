import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './modules/Dashboard';
import Documents from './modules/Documents';
import Risks from './modules/Risks';
import Evidence from './modules/Evidence';
import Automation from './modules/Automation';
import Audits from './modules/Audits';
import Users from './modules/Users';
import Scc from './modules/Scc';
import Stakeholders from './modules/Stakeholders';
import Alerts from './modules/Alerts';
import PcComplianceHub from './modules/PcComplianceHub';
import GhgCalculator from './modules/GhgCalculator';
import SupplyBase from './modules/SupplyBase';
import PlantationCompliance from './modules/PlantationCompliance';
import Traceability from './modules/Traceability';
import Transactions from './modules/Prisma';
import OperationalModule from './modules/OperationalModule';
import ActionPlans from './modules/ActionPlans';
import Findings from './modules/Findings';
import Toast from './components/Toast';
import Login from './modules/Login';
import { ToastProvider, useToast } from './components/ToastContext';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ThemeLanguageProvider, useThemeLanguage } from './components/ThemeLanguageContext';
import { UocProvider } from './components/UoCContext';
import QuickSearch from './components/QuickSearch';
import { ErrorBoundary } from './components/ErrorBoundary';

type ModuleId = 'dashboard' | 'documents' | 'risks' | 'compliance' | 'evidence' | 'automation' | 'audits' | 'users' | 'scc' | 'stakeholders' | 'alerts' | 'plant' | 'ghg' | 'supply' | 'plantations' | 'traceability' | 'transactions' | 'actionPlans' | 'findings' | 'sst' | 'training' | 'environment' | 'social';

const moduleIds: ModuleId[] = ['dashboard','documents','risks','compliance','evidence','automation','audits','users','scc','stakeholders','alerts','plant','ghg','supply','plantations','traceability','transactions','actionPlans','findings','sst','training','environment','social'];
const plantationPortalModules = new Set<ModuleId>(['dashboard','plantations','documents','risks','evidence','actionPlans','findings','sst','training','environment','social']);

function moduleFromHash(): ModuleId {
  const value = window.location.hash.replace(/^#/, '').split('/')[0];
  if (value === 'pc' || value === 'compliance') return 'plant';
  if (value === 'prisma') return 'transactions';
  return moduleIds.includes(value as ModuleId) ? value as ModuleId : 'dashboard';
}

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleId>(moduleFromHash);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toasts, removeToast } = useToast();
  const { user, loading } = useAuth();
  const { t } = useThemeLanguage();

  const navigateModule = useCallback((module: ModuleId) => {
    if (user && !user.isCentralUser && !plantationPortalModules.has(module)) {
      module = 'dashboard';
    }
    const normalized = module === 'compliance' ? 'plant' : module;
    setActiveModule(normalized);
    const nextHash = normalized === 'plant' ? 'pc/overview' : normalized;
    if (window.location.hash !== `#${nextHash}`) window.location.hash = nextHash;
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleHashChange = () => setActiveModule(moduleFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (user && !user.isCentralUser && !plantationPortalModules.has(activeModule)) {
      navigateModule('dashboard');
    }
  }, [activeModule, navigateModule, user]);

  if (loading) {
    return <div className="flex-center min-h-screen">Cargando...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const getModuleTitle = (): { title: string; subtitle: string } => {
    const titles: Record<ModuleId, { title: string; subtitle: string }> = {
      dashboard: { title: t('nav.dashboard'), subtitle: 'Vista ejecutiva y control consolidado por UoC' },
      compliance: { title: 'Cumplimiento P&C', subtitle: 'Gestión integral de la Unidad de Certificación' },
      documents: { title: t('nav.documents'), subtitle: 'Biblioteca documental y matriz legal M2' },
      evidence: { title: t('nav.evidence'), subtitle: 'Repositorio de evidencias y verificación de auditoría' },
      automation: { title: t('nav.automation'), subtitle: 'Reglas automáticas y flujos de trabajo' },
      risks: { title: t('nav.risks'), subtitle: 'Matriz de riesgos y mitigación' },
      audits: { title: t('nav.audits'), subtitle: 'Plan de auditorías e inspecciones' },
      users: { title: t('nav.users'), subtitle: 'Gestión de usuarios y permisos' },
      scc: { title: 'Cadena de Suministro SCC', subtitle: 'Trazabilidad y modelos de suministro RSPO (IP, SG, MB, BC)' },
      stakeholders: { title: 'Gestión de Partes Interesadas', subtitle: 'Matriz de diálogo social, canales FPIC/CLPI y atención a comunidades' },
      alerts: { title: 'Alertas y Notificaciones', subtitle: 'Centro de control de eventos críticos, hallazgos y alertas tempranas' },
      plant: { title: 'Cumplimiento P&C Planta Extractora', subtitle: 'Evaluación exclusiva de la planta extractora · RSPO P&C 2024 v4.2' },
      ghg: { title: 'Calculadora GHG / PalmGHG', subtitle: 'Monitoreo de emisiones tCO2e/tCPO, alcances 1, 2 y 3' },
      supply: { title: 'Base de Suministro', subtitle: 'Información general, creación y modificación de productores y plantaciones' },
      plantations: { title: 'Cumplimiento P&C Núcleo', subtitle: 'Evaluación P&C independiente por plantación y gestión agrícola por lotes' },
      traceability: { title: 'Trazabilidad RFF', subtitle: 'Origen, elegibilidad, báscula y alertas de fruto fresco' },
      transactions: { title: 'Transacciones', subtitle: 'Control interno de anuncios, confirmaciones y ajustes; integración oficial pendiente' },
      actionPlans: { title: 'Planes de acción', subtitle: 'Correcciones, causas, responsables y verificación de eficacia' },
      findings: { title: 'Hallazgos', subtitle: 'No conformidades y observaciones consolidadas' },
      sst: { title: 'Seguridad y Salud en el Trabajo', subtitle: 'Peligros, EPP, accidentalidad, inspecciones y acciones' },
      training: { title: 'Capacitación', subtitle: 'Plan anual, asistencia, cobertura y resultados' },
      environment: { title: 'Gestión Ambiental', subtitle: 'Programas, metas e indicadores ambientales' },
      social: { title: 'Gestión Social', subtitle: 'Partes interesadas, PQRS, comités y compromisos' },
    };
    return titles[activeModule];
  };

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)} />
      <Sidebar
        activeModule={activeModule}
        onNavigate={(m) => { navigateModule(m); setMobileMenuOpen(false); }}
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
          onNavigateNotifications={() => navigateModule('alerts')}
        />
        <div className={`page-content module-${activeModule}`}>
          <ErrorBoundary key={activeModule}>
            {activeModule === 'dashboard' && <Dashboard onNavigate={navigateModule} />}
            {activeModule === 'compliance' && <PcComplianceHub onNavigate={navigateModule} />}
            {activeModule === 'documents' && <Documents />}
            {activeModule === 'evidence' && <Evidence />}
            {activeModule === 'automation' && <Automation />}
            {activeModule === 'risks' && <Risks />}
            {activeModule === 'audits' && <Audits />}
            {activeModule === 'users' && <Users />}
            {activeModule === 'scc' && <Scc />}
            {activeModule === 'stakeholders' && <Stakeholders />}
            {activeModule === 'alerts' && <Alerts />}
            {activeModule === 'plant' && <PcComplianceHub onNavigate={navigateModule} />}
            {activeModule === 'ghg' && <GhgCalculator />}
            {activeModule === 'supply' && <SupplyBase />}
            {activeModule === 'plantations' && <PlantationCompliance />}
            {activeModule === 'traceability' && <Traceability />}
            {activeModule === 'transactions' && <Transactions />}
            {activeModule === 'actionPlans' && <ActionPlans />}
            {activeModule === 'findings' && <Findings onNavigate={navigateModule} />}
            {activeModule === 'sst' && <OperationalModule moduleCode="SST" />}
            {activeModule === 'training' && <OperationalModule moduleCode="TRAINING" />}
            {activeModule === 'environment' && <OperationalModule moduleCode="ENVIRONMENT" />}
            {activeModule === 'social' && <OperationalModule moduleCode="SOCIAL" />}
          </ErrorBoundary>
        </div>
      </div>
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
      <QuickSearch onNavigate={(id) => navigateModule(id as ModuleId)} />
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
