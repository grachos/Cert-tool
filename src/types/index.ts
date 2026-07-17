export type StandardId = 'BASC' | 'ISO9001' | 'ISO14001' | 'ISO45001' | 'SAGRILAFT' | 'PESV' | 'RSPO';

export interface Standard {
  id: StandardId;
  name: string;
  fullName: string;
  description: string;
  color: string;
  icon: string;
  requirements: Requirement[];
}

export interface Requirement {
  id: string;
  clause: string;
  title: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial' | 'pending';
  evidenceCount: number;
  lastReviewed?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'policy' | 'procedure' | 'record' | 'manual' | 'contract' | 'report';
  standard: StandardId;
  status: 'reviewed' | 'pending' | 'issues-found' | 'expired';
  uploadDate: string;
  lastReview?: string;
  reviewer?: string;
  aiScore?: number;
  aiFindings?: AIFinding[];
  size: string;
  version: string;
}

export interface AIFinding {
  id: string;
  type: 'gap' | 'recommendation' | 'risk' | 'improvement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  clause?: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  standard: StandardId;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  level: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
  owner: string;
  controls: string[];
  createdDate: string;
  updatedDate: string;
}

export interface ComplianceStatus {
  standardId: StandardId;
  overallScore: number;
  totalRequirements: number;
  compliant: number;
  nonCompliant: number;
  partial: number;
  pending: number;
  lastAudit?: string;
  nextAudit?: string;
  trend: number;
}

export interface Evidence {
  id: string;
  title: string;
  description: string;
  standard: StandardId;
  clause: string;
  type: 'document' | 'photo' | 'record' | 'report' | 'certificate';
  status: 'valid' | 'expired' | 'pending-review';
  uploadDate: string;
  expiryDate?: string;
  linkedDocuments: string[];
}

export interface ActionPlan {
  id: string;
  title: string;
  description: string;
  standard: StandardId;
  type: 'corrective' | 'preventive' | 'improvement';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  dueDate: string;
  createdDate: string;
  completedDate?: string;
  progress: number;
  relatedRisk?: string;
  relatedFinding?: string;
}

export interface ActivityItem {
  id: string;
  type: 'document' | 'risk' | 'compliance' | 'evidence' | 'action' | 'audit';
  action: string;
  description: string;
  user: string;
  timestamp: string;
  standard?: StandardId;
}

export interface DashboardStats {
  totalDocuments: number;
  pendingReviews: number;
  overallCompliance: number;
  activeRisks: number;
  criticalRisks: number;
  overdueActions: number;
  upcomingAudits: number;
  evidenceGaps: number;
}
