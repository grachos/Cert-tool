import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Language = 'es' | 'en';

const translations = {
  es: {
    // Navigation & Page Titles
    'nav.dashboard': 'Panel Principal',
    'nav.documents': 'Revisión Documental',
    'nav.risks': 'Análisis de Riesgos',
    'nav.compliance': 'Cumplimiento',
    'nav.evidence': 'Evidencias',
    'nav.automation': 'Automatización',
    'nav.audits': 'Auditorías',
    'nav.users': 'Usuarios',
    'nav.logout': 'Cerrar Sesión',
    
    'title.dashboard': 'Panel Principal',
    'subtitle.dashboard': 'Vista general del cumplimiento organizacional',
    'title.documents': 'Revisión Documental',
    'subtitle.documents': 'Análisis de documentos y contratos con IA',
    'title.risks': 'Análisis de Riesgos',
    'subtitle.risks': 'Matriz de riesgos e identificación con IA',
    'title.compliance': 'Cumplimiento Normativo',
    'subtitle.compliance': 'Monitoreo de normas y estándares',
    'title.evidence': 'Evidencias para Auditorías',
    'subtitle.evidence': 'Generación y gestión de evidencias',
    'title.automation': 'Automatización de Procesos',
    'subtitle.automation': 'Planes de acción y seguimiento',
    'title.audits': 'Auditorías y Hallazgos',
    'subtitle.audits': 'Gestión de no conformidades validadas por IA',
    'title.users': 'Administración de Usuarios',
    'subtitle.users': 'Gestión de accesos y roles del sistema',

    // Dashboard
    'dash.compliance': 'Cumplimiento Global',
    'dash.pendingDocs': 'Docs. por Revisar',
    'dash.activeRisks': 'Riesgos Activos',
    'dash.overdueActions': 'Planes Vencidos',
    'dash.critical': 'Críticos',
    'dash.attention': 'Requieren atención',
    'dash.complianceByStd': 'Cumplimiento por Norma',
    'dash.recentActivity': 'Actividad Reciente',
    'dash.quickActions': 'Acciones Rápidas',
    'dash.newDocReview': 'Nueva Revisión Documental',
    'dash.registerRisk': 'Registrar Riesgo',
    'dash.verifyCompliance': 'Verificar Cumplimiento',
    'dash.generateEvidence': 'Generar Evidencia',
    'dash.createActionPlan': 'Crear Plan de Acción',
    'dash.aiReview': 'Revisión Automatizada',
    'dash.aiPendingMsg': 'documentos pendientes de análisis. ¿Iniciar proceso?',
    'dash.aiStartBtn': 'Iniciar Análisis',
    'dash.stable': 'Estable',
    'dash.pending': 'Pendientes',

    // Login
    'login.title': 'Ingreso al Panel Administrativo',
    'login.email': 'Correo Electrónico',
    'login.password': 'Contraseña',
    'login.btn': 'Iniciar Sesión',
    'login.loading': 'Autenticando...',
    'login.footer': 'Plataforma SaaS de Auditoría.',

    // Common buttons & labels
    'btn.save': 'Guardar',
    'btn.cancel': 'Cancelar',
    'btn.delete': 'Eliminar',
    'btn.audit': 'Auditar',
    'btn.close': 'Cerrar',

    // Documents module
    'docs.uploadTitle': 'Selecciona un archivo para la evaluación',
    'docs.uploadSub': 'Soporta PDF, DOCX, XLSX (Max 50MB). La IA analizará el documento automáticamente.',
    'docs.btnSelect': 'Seleccionar y Subir',
    'docs.btnUploading': 'Subiendo...',
    'docs.activeNorm': 'Subiendo a la norma',
    'docs.selectNorm': 'Seleccionar Norma...',
    'docs.thDoc': 'Documento',
    'docs.thNorm': 'Norma',
    'docs.thStatus': 'Estado',
    'docs.thScore': 'Puntuación',
    'docs.thDate': 'Fecha',
    'docs.btnUpload': 'Subir Documento',
    'docs.noDocs': 'No hay documentos para esta norma.',
    'docs.loading': 'Cargando documentos...',
    'docs.status.reviewed': 'Revisado',
    'docs.status.pending': 'Pendiente',
    'docs.status.issuesFound': 'Observaciones',
    'docs.aiAnalysis': 'Análisis Automatizado',
    'docs.aiAligned': 'Documento alineado a la normativa.',
    'docs.aiLoading': 'La Inteligencia Artificial está evaluando el archivo...',

    // Risks module
    'risks.matrixTitle': 'Matriz de Probabilidad e Impacto',
    'risks.evalCount': 'Riesgos Evaluados',
    'risks.probability': 'Probabilidad',
    'risks.impact': 'Impacto',
    'risks.newRiskBtn': 'Nuevo Riesgo',
    'risks.category': 'Categoría',
    'risks.owner': 'Propietario',
    'risks.controls': 'Controles',
    'risks.level': 'Nivel',
    'risks.status': 'Estado',
    'risks.viewList': 'Ver Lista',
    'risks.viewMatrix': 'Ver Matriz',
    'risks.loading': 'Cargando matriz de riesgos...',
    'risks.thRisk': 'Riesgo',
    'risks.thNorm': 'Norma',
    'risks.thLevel': 'Nivel',
    'risks.thOwner': 'Responsable',
    'risks.thStatus': 'Estado',
    'risks.status.open': 'Abierto',
    'risks.status.mitigated': 'Mitigado',
    'risks.status.closed': 'Cerrado',

    // Compliance module
    'compliance.backBtn': 'Volver al resumen',
    'compliance.evalBtn': 'Ejecutar Auto-Evaluación IA',
    'compliance.clause': 'Cláusula',
    'compliance.requirement': 'Requisito',
    'compliance.status': 'Estado',
    'compliance.evidence': 'Evidencias',
    'compliance.action': 'Acción',
    'compliance.progress': 'Progreso de Implementación',
    'compliance.compliant': 'Cumple',
    'compliance.nonCompliant': 'No Cumple',
    'compliance.partial': 'Parcial',
    'compliance.pending': 'Pendiente',
    'compliance.loading': 'Cargando cumplimiento de normas...',
    'compliance.loadingReqs': 'Cargando requisitos...',

    // Evidence module
    'evidence.thTitle': 'Evidencia',
    'evidence.thStandard': 'Norma',
    'evidence.thClause': 'Cláusula',
    'evidence.thType': 'Tipo',
    'evidence.thStatus': 'Estado',
    'evidence.thDate': 'Fecha Subida',
    'evidence.thExpiry': 'Fecha Vencimiento',
    'evidence.btnUpload': 'Nueva Evidencia',
    'evidence.loading': 'Cargando evidencias...',

    // Automation module
    'auto.kanban': 'Tablero Kanban',
    'auto.list': 'Lista',
    'auto.planesCount': 'planes totales',
    'auto.btnNewPlan': 'Nuevo Plan de Acción',
    'auto.colPending': 'Pendiente',
    'auto.colInProgress': 'En Progreso',
    'auto.colCompleted': 'Completado',
    'auto.colOverdue': 'Vencido',
    'auto.loading': 'Cargando planes de acción...',

    // Audits module
    'audits.listTitle': 'Registro de Auditorías',
    'audits.newBtn': 'Registrar Auditoría',
    'audits.thTitle': 'Título',
    'audits.thDate': 'Fecha',
    'audits.thType': 'Tipo',
    'audits.thAuditor': 'Auditor',
    'audits.thStatus': 'Estado',
    'audits.viewFindings': 'Ver Hallazgos',
    'audits.findingsTitle': 'Hallazgos y No Conformidades',
    'audits.backBtn': 'Volver a Auditorías',
    'audits.newFindingBtn': 'Registrar Hallazgo',
    'audits.type.major': 'No Conformidad Mayor',
    'audits.type.minor': 'No Conformidad Menor',
    'audits.type.obs': 'Observación',
    'audits.type.opp': 'Oportunidad de Mejora',
    'audits.aiVerifyBtn': 'Solicitar Cierre a IA',
    'audits.finding.open': 'ABIERTO',
    'audits.finding.closed': 'CERRADO',
    'audits.finding.rejected': 'RECHAZADO POR IA',
    'audits.aiTitle': 'Veredicto de Inteligencia Artificial',

    // Users module
    'users.title': 'Usuarios Registrados',
    'users.desc': 'Administra los accesos de auditores y oficiales de cumplimiento.',
    'users.btnNew': 'Registrar Nuevo Usuario',
    'users.thName': 'Nombre',
    'users.thEmail': 'Correo',
    'users.thRole': 'Rol de Sistema',
    'users.thDate': 'Fecha Registro',
    'users.thActions': 'Acciones',
    'users.roleAdmin': 'Administrador',
    'users.roleManager': 'Gerente',
    'users.roleAuditor': 'Auditor',
    'users.roleUser': 'Usuario Estándar',
    'users.loading': 'Cargando usuarios...',
  },
  en: {
    // Navigation & Page Titles
    'nav.dashboard': 'Dashboard',
    'nav.documents': 'Document Review',
    'nav.risks': 'Risk Analysis',
    'nav.compliance': 'Compliance',
    'nav.evidence': 'Evidence',
    'nav.automation': 'Automation',
    'nav.audits': 'Audits',
    'nav.users': 'Users',
    'nav.logout': 'Log Out',
    
    'title.dashboard': 'Dashboard',
    'subtitle.dashboard': 'Overview of organizational compliance',
    'title.documents': 'Document Review',
    'subtitle.documents': 'AI-driven analysis of documents and contracts',
    'title.risks': 'Risk Analysis',
    'subtitle.risks': 'Risk matrix and AI identification',
    'title.compliance': 'Regulatory Compliance',
    'subtitle.compliance': 'Monitoring of standards and regulations',
    'title.evidence': 'Audit Evidence',
    'subtitle.evidence': 'Generation and management of evidence files',
    'title.automation': 'Process Automation',
    'subtitle.automation': 'Action plans and compliance scheduling',
    'title.audits': 'Audits and Findings',
    'subtitle.audits': 'Management of non-conformances validated by AI',
    'title.users': 'User Administration',
    'subtitle.users': 'Manage system access and roles',

    // Dashboard
    'dash.compliance': 'Overall Compliance',
    'dash.pendingDocs': 'Pending Reviews',
    'dash.activeRisks': 'Active Risks',
    'dash.overdueActions': 'Overdue Actions',
    'dash.critical': 'Critical',
    'dash.attention': 'Require attention',
    'dash.complianceByStd': 'Compliance by Standard',
    'dash.recentActivity': 'Recent Activity',
    'dash.quickActions': 'Quick Actions',
    'dash.newDocReview': 'New Document Review',
    'dash.registerRisk': 'Register Risk',
    'dash.verifyCompliance': 'Verify Compliance',
    'dash.generateEvidence': 'Generate Evidence',
    'dash.createActionPlan': 'Create Action Plan',
    'dash.aiReview': 'Automated Review',
    'dash.aiPendingMsg': 'documents pending analysis. Start process?',
    'dash.aiStartBtn': 'Start Analysis',
    'dash.stable': 'Stable',
    'dash.pending': 'Pending',

    // Login
    'login.title': 'Administrative Panel Login',
    'login.email': 'Email Address',
    'login.password': 'Password',
    'login.btn': 'Sign In',
    'login.loading': 'Authenticating...',
    'login.footer': 'Auditing SaaS Platform.',

    // Common buttons & labels
    'btn.save': 'Save',
    'btn.cancel': 'Cancel',
    'btn.delete': 'Delete',
    'btn.audit': 'Audit',
    'btn.close': 'Close',

    // Documents module
    'docs.uploadTitle': 'Select a file for evaluation',
    'docs.uploadSub': 'Supports PDF, DOCX, XLSX (Max 50MB). AI will analyze the document automatically.',
    'docs.btnSelect': 'Select and Upload',
    'docs.btnUploading': 'Uploading...',
    'docs.activeNorm': 'Uploading to standard',
    'docs.selectNorm': 'Select Standard...',
    'docs.thDoc': 'Document',
    'docs.thNorm': 'Standard',
    'docs.thStatus': 'Status',
    'docs.thScore': 'Score',
    'docs.thDate': 'Date',
    'docs.btnUpload': 'Upload Document',
    'docs.noDocs': 'No documents found for this standard.',
    'docs.loading': 'Loading documents...',
    'docs.status.reviewed': 'Reviewed',
    'docs.status.pending': 'Pending',
    'docs.status.issuesFound': 'Issues Found',
    'docs.aiAnalysis': 'Automated Analysis',
    'docs.aiAligned': 'Document aligned with standard.',
    'docs.aiLoading': 'AI is evaluating the file...',

    // Risks module
    'risks.matrixTitle': 'Probability and Impact Matrix',
    'risks.evalCount': 'Evaluated Risks',
    'risks.probability': 'Probability',
    'risks.impact': 'Impact',
    'risks.newRiskBtn': 'New Risk',
    'risks.category': 'Category',
    'risks.owner': 'Owner',
    'risks.controls': 'Controls',
    'risks.level': 'Level',
    'risks.status': 'Status',
    'risks.viewList': 'View List',
    'risks.viewMatrix': 'View Matrix',
    'risks.loading': 'Loading risk matrix...',
    'risks.thRisk': 'Risk',
    'risks.thNorm': 'Standard',
    'risks.thLevel': 'Level',
    'risks.thOwner': 'Owner',
    'risks.thStatus': 'Status',
    'risks.status.open': 'Open',
    'risks.status.mitigated': 'Mitigated',
    'risks.status.closed': 'Closed',

    // Compliance module
    'compliance.backBtn': 'Back to summary',
    'compliance.evalBtn': 'Run AI Auto-Evaluation',
    'compliance.clause': 'Clause',
    'compliance.requirement': 'Requirement',
    'compliance.status': 'Status',
    'compliance.evidence': 'Evidence',
    'compliance.action': 'Action',
    'compliance.progress': 'Implementation Progress',
    'compliance.compliant': 'Compliant',
    'compliance.nonCompliant': 'Non-Compliant',
    'compliance.partial': 'Partial',
    'compliance.pending': 'Pending',
    'compliance.loading': 'Loading standards compliance...',
    'compliance.loadingReqs': 'Loading requirements...',

    // Evidence module
    'evidence.thTitle': 'Evidence',
    'evidence.thStandard': 'Standard',
    'evidence.thClause': 'Clause',
    'evidence.thType': 'Type',
    'evidence.thStatus': 'Status',
    'evidence.thDate': 'Upload Date',
    'evidence.thExpiry': 'Expiry Date',
    'evidence.btnUpload': 'New Evidence',
    'evidence.loading': 'Loading evidence...',

    // Automation module
    'auto.kanban': 'Kanban Board',
    'auto.list': 'List',
    'auto.planesCount': 'total plans',
    'auto.btnNewPlan': 'New Action Plan',
    'auto.colPending': 'Pending',
    'auto.colInProgress': 'In Progress',
    'auto.colCompleted': 'Completed',
    'auto.colOverdue': 'Overdue',
    'auto.loading': 'Loading action plans...',

    // Audits module
    'audits.listTitle': 'Audit Registry',
    'audits.newBtn': 'Log Audit',
    'audits.thTitle': 'Title',
    'audits.thDate': 'Date',
    'audits.thType': 'Type',
    'audits.thAuditor': 'Auditor',
    'audits.thStatus': 'Status',
    'audits.viewFindings': 'View Findings',
    'audits.findingsTitle': 'Findings & Non-Conformances',
    'audits.backBtn': 'Back to Audits',
    'audits.newFindingBtn': 'Log Finding',
    'audits.type.major': 'Major Non-Conformance',
    'audits.type.minor': 'Minor Non-Conformance',
    'audits.type.obs': 'Observation',
    'audits.type.opp': 'Opportunity for Improvement',
    'audits.aiVerifyBtn': 'Request AI Closure',
    'audits.finding.open': 'OPEN',
    'audits.finding.closed': 'CLOSED',
    'audits.finding.rejected': 'REJECTED BY AI',
    'audits.aiTitle': 'Artificial Intelligence Verdict',

    // Users module
    'users.title': 'Registered Users',
    'users.desc': 'Manage access for auditors and compliance officers.',
    'users.btnNew': 'Register New User',
    'users.thName': 'Name',
    'users.thEmail': 'Email',
    'users.thRole': 'System Role',
    'users.thDate': 'Registration Date',
    'users.thActions': 'Actions',
    'users.roleAdmin': 'Administrator',
    'users.roleManager': 'Manager',
    'users.roleAuditor': 'Auditor',
    'users.roleUser': 'Standard User',
    'users.loading': 'Loading users...',
  }
};

interface ThemeLanguageContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['es']) => string;
}

const ThemeLanguageContext = createContext<ThemeLanguageContextType | null>(null);

export const ThemeLanguageProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('cert_theme');
    return (savedTheme as Theme) || 'light';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('cert_lang');
    return (savedLang as Language) || 'es';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cert_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('cert_lang', language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: keyof typeof translations['es']): string => {
    return translations[language][key] || translations['es'][key] || key;
  };

  return (
    <ThemeLanguageContext.Provider value={{ theme, language, toggleTheme, setLanguage, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error('useThemeLanguage must be used within a ThemeLanguageProvider');
  }
  return context;
};
