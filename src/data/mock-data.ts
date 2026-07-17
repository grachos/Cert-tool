import type { Document, Risk, ComplianceStatus, Evidence, ActionPlan, ActivityItem, DashboardStats } from '../types';

export const mockDashboardStats: DashboardStats = {
  totalDocuments: 142,
  pendingReviews: 12,
  overallCompliance: 84,
  activeRisks: 28,
  criticalRisks: 3,
  overdueActions: 2,
  upcomingAudits: 2,
  evidenceGaps: 15
};

export const mockComplianceStatuses: ComplianceStatus[] = [
  { standardId: 'BASC', overallScore: 82, totalRequirements: 25, compliant: 18, nonCompliant: 2, partial: 3, pending: 2, lastAudit: '2025-11-15', nextAudit: '2026-11-15', trend: 2 },
  { standardId: 'ISO9001', overallScore: 91, totalRequirements: 45, compliant: 40, nonCompliant: 1, partial: 2, pending: 2, lastAudit: '2026-02-10', nextAudit: '2027-02-10', trend: 5 },
  { standardId: 'ISO14001', overallScore: 95, totalRequirements: 30, compliant: 28, nonCompliant: 0, partial: 2, pending: 0, lastAudit: '2026-03-20', nextAudit: '2027-03-20', trend: 1 },
  { standardId: 'ISO45001', overallScore: 78, totalRequirements: 35, compliant: 22, nonCompliant: 5, partial: 5, pending: 3, lastAudit: '2025-08-05', nextAudit: '2026-08-05', trend: -3 },
  { standardId: 'SAGRILAFT', overallScore: 88, totalRequirements: 20, compliant: 16, nonCompliant: 1, partial: 3, pending: 0, lastAudit: '2026-01-15', nextAudit: '2027-01-15', trend: 4 },
  { standardId: 'PESV', overallScore: 75, totalRequirements: 28, compliant: 18, nonCompliant: 4, partial: 2, pending: 4, lastAudit: '2025-09-10', nextAudit: '2026-09-10', trend: 0 },
  { standardId: 'RSPO', overallScore: 65, totalRequirements: 40, compliant: 20, nonCompliant: 5, partial: 5, pending: 10, nextAudit: '2026-12-01', trend: 2 }
];

export const mockDocuments: Document[] = [
  { id: 'doc1', name: 'Manual_Calidad_v3.pdf', type: 'MANUAL', standard: 'ISO9001', standardId: 'ISO9001', status: 'REVIEWED', uploadDate: '2026-06-15', lastReview: '2026-06-16', reviewer: 'María García', aiScore: 95, size: '2.4 MB', version: '3.0' },
  { id: 'doc2', name: 'Procedimiento_Contratacion.docx', type: 'PROCEDURE', standard: 'BASC', standardId: 'BASC', status: 'ISSUES_FOUND', uploadDate: '2026-07-01', lastReview: '2026-07-02', reviewer: 'Carlos Rodríguez', aiScore: 65, size: '1.1 MB', version: '1.2', aiFindings: [
    { id: 'f1', type: 'GAP', severity: 'HIGH', description: 'Falta validación de antecedentes penales en el flujograma.', clause: '4.0' }
  ]},
  { id: 'doc3', name: 'Matriz_Riesgos_SST.xlsx', type: 'RECORD', standard: 'ISO45001', standardId: 'ISO45001', status: 'PENDING', uploadDate: '2026-07-15', size: '5.6 MB', version: '2026.1' }
];

export const mockRisks: Risk[] = [
  { id: 'r1', title: 'Contaminación de carga', description: 'Riesgo de introducción de sustancias ilícitas en contenedores', category: 'Operativo', standard: 'BASC', standardId: 'BASC', probability: 3, impact: 5, level: 'CRITICAL', status: 'OPEN', owner: 'Carlos Rodríguez', controls: ['Inspección canina', 'CCTV', 'Precintos de seguridad'], createdDate: '2026-01-10', updatedDate: '2026-06-15' },
  { id: 'r2', title: 'Incumplimiento legal ambiental', description: 'Falla en la renovación de permisos de vertimientos', category: 'Legal', standard: 'ISO14001', standardId: 'ISO14001', probability: 2, impact: 4, level: 'HIGH', status: 'MITIGATED', owner: 'Ana Martínez', controls: ['Matriz legal', 'Alertas automáticas'], createdDate: '2026-03-20', updatedDate: '2026-05-01' },
  { id: 'r3', title: 'Accidente de tránsito', description: 'Colisión de vehicle de reparto', category: 'SST', standard: 'PESV', standardId: 'PESV', probability: 4, impact: 3, level: 'HIGH', status: 'OPEN', owner: 'Luis Pérez', controls: ['Capacitación', 'Mantenimiento'], createdDate: '2026-02-15', updatedDate: '2026-07-01' }
];

export const mockActionPlans: ActionPlan[] = [
  { id: 'ap1', title: 'Actualizar política de SST', description: 'Incluir nuevos requisitos normativos', standard: 'ISO45001', standardId: 'ISO45001', type: 'CORRECTIVE', status: 'IN_PROGRESS', priority: 'HIGH', assignee: 'María García', dueDate: '2026-07-30', createdDate: '2026-07-01', progress: 40 },
  { id: 'ap2', title: 'Capacitación en SAGRILAFT', description: 'Entrenamiento anual a toda la compañía', standard: 'SAGRILAFT', standardId: 'SAGRILAFT', type: 'PREVENTIVE', status: 'PENDING', priority: 'MEDIUM', assignee: 'Carlos Rodríguez', dueDate: '2026-08-15', createdDate: '2026-07-10', progress: 0 },
  { id: 'ap3', title: 'Renovar certificación BASC', description: 'Auditoría externa programada', standard: 'BASC', standardId: 'BASC', type: 'IMPROVEMENT', status: 'COMPLETED', priority: 'HIGH', assignee: 'Ana Martínez', dueDate: '2026-06-30', createdDate: '2026-01-15', completedDate: '2026-06-25', progress: 100 }
];

export const mockEvidence: Evidence[] = [
  { id: 'ev1', title: 'Registro de asistencia capacitación', description: 'Firmas de inducción SST', standard: 'ISO45001', standardId: 'ISO45001', clause: '7.2', type: 'RECORD', status: 'VALID', uploadDate: '2026-06-10', linkedDocuments: ['doc3'] },
  { id: 'ev2', title: 'Certificado bomberos', description: 'Inspección anual de red contra incendios', standard: 'BASC', standardId: 'BASC', clause: '5.0', type: 'CERTIFICATE', status: 'EXPIRED', uploadDate: '2025-05-10', expiryDate: '2026-05-10', linkedDocuments: [] }
];

export const mockActivities: ActivityItem[] = [
  { id: 'act1', type: 'document', action: 'Subió un documento', description: 'Matriz_Riesgos_SST.xlsx', user: 'Luis Pérez', timestamp: 'Hace 2 horas', standard: 'ISO45001' },
  { id: 'act2', type: 'risk', action: 'Actualizó un riesgo', description: 'Contaminación de carga (Crítico)', user: 'Carlos Rodríguez', timestamp: 'Hace 5 horas', standard: 'BASC' },
  { id: 'act3', type: 'action', action: 'Completó plan de acción', description: 'Renovar certificación BASC', user: 'Ana Martínez', timestamp: 'Ayer', standard: 'BASC' }
];
