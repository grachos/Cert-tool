-- Cumplimiento P&C por Unidad de Certificación.
-- Migración incremental: no elimina ni reemplaza datos existentes.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_column_if_missing$$
CREATE PROCEDURE add_column_if_missing(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DROP PROCEDURE IF EXISTS add_index_if_missing$$
CREATE PROCEDURE add_index_if_missing(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_columns TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

ALTER TABLE User MODIFY COLUMN role ENUM(
  'SUPERADMIN','ADMIN','MANAGER','SUSTAINABILITY','AUDITOR','PROCESS_OWNER',
  'PLANT_ADMIN','PLANTATION_ADMIN','VIEWER','CERTIFIER','COORDINATOR','REVIEWER','USER'
) NOT NULL DEFAULT 'USER';

ALTER TABLE Evidence MODIFY COLUMN status ENUM(
  'PENDING','UPLOADED','IN_REVIEW','APPROVED','REJECTED','EXPIRED','REPLACED',
  'VALID','PENDING_REVIEW'
) NOT NULL DEFAULT 'PENDING_REVIEW';

CALL add_column_if_missing('CertificationUnit','millName','VARCHAR(255) NULL');
CALL add_column_if_missing('CertificationUnit','membershipNumber','VARCHAR(100) NULL');
CALL add_column_if_missing('CertificationUnit','certificationCode','VARCHAR(100) NULL');
CALL add_column_if_missing('CertificationUnit','certificationBody','VARCHAR(255) NULL');
CALL add_column_if_missing('CertificationUnit','certificationType','VARCHAR(100) NULL');
CALL add_column_if_missing('CertificationUnit','scopeDescription','TEXT NULL');
CALL add_column_if_missing('CertificationUnit','processingCapacityMt','DECIMAL(14,3) NOT NULL DEFAULT 0');
CALL add_column_if_missing('CertificationUnit','estimatedRffMt','DECIMAL(14,3) NOT NULL DEFAULT 0');
CALL add_column_if_missing('CertificationUnit','processedRffMt','DECIMAL(14,3) NOT NULL DEFAULT 0');
CALL add_column_if_missing('CertificationUnit','cpoProducedMt','DECIMAL(14,3) NOT NULL DEFAULT 0');
CALL add_column_if_missing('CertificationUnit','pkProducedMt','DECIMAL(14,3) NOT NULL DEFAULT 0');

CALL add_column_if_missing('Requirement','principleCode','VARCHAR(20) NULL');
CALL add_column_if_missing('Requirement','criterionCode','VARCHAR(30) NULL');
CALL add_column_if_missing('Requirement','indicatorText','TEXT NULL');
CALL add_column_if_missing('Requirement','officialText','LONGTEXT NULL');
CALL add_column_if_missing('Requirement','officialSourceUrl','VARCHAR(500) NULL');
CALL add_column_if_missing('Requirement','sourceLanguage','VARCHAR(30) NULL');
CALL add_column_if_missing('Requirement','officialImportedAt','TIMESTAMP NULL');
CALL add_column_if_missing('Requirement','standardVersion','VARCHAR(30) NOT NULL DEFAULT ''4.2''');
CALL add_column_if_missing('Requirement','isCritical','BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('Requirement','expectedEvidence','JSON NULL');
CALL add_column_if_missing('Requirement','processCodes','JSON NULL');
CALL add_column_if_missing('Requirement','active','BOOLEAN NOT NULL DEFAULT TRUE');
CALL add_column_if_missing('Requirement','sortOrder','INT NOT NULL DEFAULT 0');
CALL add_index_if_missing('Requirement','idx_requirement_pc','`standardId`,`principleCode`,`criterionCode`,`clause`');

CALL add_column_if_missing('Evidence','documentDate','DATE NULL');
CALL add_column_if_missing('Evidence','evidenceVersion','VARCHAR(50) NULL');
CALL add_column_if_missing('Evidence','processCode','VARCHAR(100) NULL');
CALL add_column_if_missing('Evidence','entityType','VARCHAR(50) NULL');
CALL add_column_if_missing('Evidence','entityId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','auditId','VARCHAR(191) NULL');
CALL add_column_if_missing('Evidence','nonConformanceId','VARCHAR(191) NULL');
CALL add_column_if_missing('Evidence','actionPlanId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','replacedEvidenceId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','reviewComment','TEXT NULL');
CALL add_index_if_missing('Evidence','idx_evidence_requirement_uoc','`uocId`,`requirementId`,`status`');

CALL add_column_if_missing('FarmPlot','pcWorkflowState','VARCHAR(50) NOT NULL DEFAULT ''NOT_STARTED''');
CALL add_column_if_missing('FarmPlot','pcLastUpdatedAt','TIMESTAMP NULL');

CALL add_column_if_missing('Alert','uocId','VARCHAR(36) NULL');
CALL add_index_if_missing('Alert','idx_alert_uoc_dismissed','`uocId`,`dismissed`,`createdAt`');

CALL add_column_if_missing('Audit','scopeDescription','TEXT NULL');
CALL add_column_if_missing('Audit','criteriaDescription','TEXT NULL');
CALL add_column_if_missing('Audit','auditTeamJson','JSON NULL');
CALL add_column_if_missing('Audit','processesJson','JSON NULL');
CALL add_column_if_missing('Audit','plantationsJson','JSON NULL');
CALL add_column_if_missing('Audit','samplingDescription','TEXT NULL');
CALL add_column_if_missing('Audit','openingMinutes','TEXT NULL');
CALL add_column_if_missing('Audit','closingMinutes','TEXT NULL');
CALL add_column_if_missing('Audit','reportEvidenceId','VARCHAR(36) NULL');

CALL add_column_if_missing('NonConformance','code','VARCHAR(100) NULL');
CALL add_column_if_missing('NonConformance','source','VARCHAR(100) NULL');
CALL add_column_if_missing('NonConformance','classification','VARCHAR(100) NULL');
CALL add_column_if_missing('NonConformance','objectiveEvidence','TEXT NULL');
CALL add_column_if_missing('NonConformance','responsible','VARCHAR(255) NULL');
CALL add_column_if_missing('NonConformance','correction','TEXT NULL');
CALL add_column_if_missing('NonConformance','causeAnalysis','TEXT NULL');
CALL add_column_if_missing('NonConformance','rootCause','TEXT NULL');
CALL add_column_if_missing('NonConformance','correctiveAction','TEXT NULL');
CALL add_column_if_missing('NonConformance','dueDate','DATE NULL');
CALL add_column_if_missing('NonConformance','verification','TEXT NULL');
CALL add_column_if_missing('NonConformance','effectiveness','TEXT NULL');
CALL add_column_if_missing('NonConformance','workflowStatus','VARCHAR(50) NOT NULL DEFAULT ''OPEN''');
CALL add_column_if_missing('NonConformance','closedAt','TIMESTAMP NULL');

CREATE TABLE IF NOT EXISTS PcEvaluation (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  requirementId VARCHAR(36) NOT NULL,
  applicability ENUM('APPLICABLE','NOT_APPLICABLE','PENDING_APPROVAL') NOT NULL DEFAULT 'APPLICABLE',
  status ENUM('NOT_EVALUATED','IN_PROGRESS','COMPLIANT','PARTIAL','NON_COMPLIANT','NOT_APPLICABLE','PENDING_VERIFICATION','CLOSED') NOT NULL DEFAULT 'NOT_EVALUATED',
  complianceLevel DECIMAL(5,2) NULL,
  responsible VARCHAR(255) NULL,
  processes JSON NULL,
  result TEXT NULL,
  observation TEXT NULL,
  evaluatedAt DATE NULL,
  evaluatorId VARCHAR(36) NULL,
  dueDate DATE NULL,
  noApplyJustification TEXT NULL,
  noApplyEvidenceId VARCHAR(36) NULL,
  noApplyApprovedBy VARCHAR(36) NULL,
  noApplyApprovedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pc_evaluation (uocId, requirementId),
  INDEX idx_pc_eval_status (uocId, status, applicability),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (requirementId) REFERENCES Requirement(id) ON DELETE RESTRICT,
  FOREIGN KEY (evaluatorId) REFERENCES User(id) ON DELETE SET NULL,
  FOREIGN KEY (noApplyEvidenceId) REFERENCES Evidence(id) ON DELETE SET NULL,
  FOREIGN KEY (noApplyApprovedBy) REFERENCES User(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS PcEvaluationHistory (
  id VARCHAR(36) PRIMARY KEY,
  evaluationId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  previousStatus VARCHAR(50) NULL,
  newStatus VARCHAR(50) NULL,
  comment TEXT NULL,
  snapshotJson LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pc_eval_history (evaluationId, createdAt),
  FOREIGN KEY (evaluationId) REFERENCES PcEvaluation(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS EvidenceHistory (
  id VARCHAR(36) PRIMARY KEY,
  evidenceId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  snapshotJson LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evidence_history (evidenceId, createdAt),
  FOREIGN KEY (evidenceId) REFERENCES Evidence(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS ManagementReview (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  reviewDate DATE NOT NULL,
  participantsJson JSON NULL,
  auditResults TEXT NULL,
  objectivesStatus TEXT NULL,
  indicatorsSummary TEXT NULL,
  legalCompliance TEXT NULL,
  risksSummary TEXT NULL,
  findingsSummary TEXT NULL,
  actionPlansSummary TEXT NULL,
  complaintsSummary TEXT NULL,
  socialPerformance TEXT NULL,
  environmentalPerformance TEXT NULL,
  laborPerformance TEXT NULL,
  ghgPerformance TEXT NULL,
  resourcesSummary TEXT NULL,
  changesSummary TEXT NULL,
  improvementNeeds TEXT NULL,
  decisions TEXT NULL,
  responsible VARCHAR(255) NULL,
  dueDate DATE NULL,
  minutesEvidenceId VARCHAR(36) NULL,
  status ENUM('DRAFT','IN_REVIEW','APPROVED','CLOSED') NOT NULL DEFAULT 'DRAFT',
  progress INT NOT NULL DEFAULT 0,
  createdBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_management_review_uoc (uocId, reviewDate),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (minutesEvidenceId) REFERENCES Evidence(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS ManagementReviewHistory (
  id VARCHAR(36) PRIMARY KEY,
  managementReviewId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  action VARCHAR(100) NOT NULL,
  snapshotJson LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_management_review_history (managementReviewId, createdAt),
  FOREIGN KEY (managementReviewId) REFERENCES ManagementReview(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

UPDATE Requirement
SET
  principleCode = COALESCE(principleCode, CONCAT('P', SUBSTRING_INDEX(clause,'.',1))),
  criterionCode = COALESCE(criterionCode, SUBSTRING_INDEX(clause,'.',2)),
  indicatorText = COALESCE(indicatorText, description),
  standardVersion = COALESCE(NULLIF(standardVersion,''), '4.2'),
  sortOrder = CASE
    WHEN sortOrder = 0 THEN
      CAST(SUBSTRING_INDEX(clause,'.',1) AS UNSIGNED) * 10000 +
      CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(clause,'.',2),'.',-1) AS UNSIGNED) * 100 +
      CAST(SUBSTRING_INDEX(clause,'.',-1) AS UNSIGNED)
    ELSE sortOrder
  END
WHERE standardId='RSPO';

-- Clasificación factual de indicadores críticos tomada del estándar oficial
-- RSPO P&C 2024 v4.2 (los indicadores críticos están señalados con "(C)").
UPDATE Requirement
SET isCritical = clause IN (
  '1.1.1','1.1.2','1.1.3',
  '2.1.1','2.1.3','2.3.1','2.3.2','2.4.1','2.5.1','2.5.3',
  '3.1.1','3.2.1','3.3.1','3.3.2','3.3.3','3.5.1','3.5.2','3.5.3',
  '3.5.4','3.5.5','3.5.6','3.5.7','3.5.8','3.5.9','3.5.10','3.5.11','3.5.12',
  '4.1.1','4.3.1','4.3.3','4.3.5','4.4.1','4.4.2','4.4.8',
  '4.5.1','4.5.2','4.6.1','4.6.2','4.7.2',
  '5.1.1','5.1.2','5.1.3','5.1.4',
  '6.1.1','6.1.2','6.2.1','6.2.2','6.2.6','6.2.7','6.2.8','6.3.1',
  '6.4.1','6.5.1','6.5.2','6.5.3','6.6.1','6.7.1','6.7.2','6.7.3',
  '6.8.1','6.8.2','6.8.3','6.8.4','6.8.5','6.8.6','6.8.7','6.8.8',
  '6.9.1','6.9.2','6.9.3','6.9.4','6.9.5','6.9.6','6.9.9','6.9.12',
  '7.1.1','7.1.2','7.1.3','7.1.4','7.1.5','7.1.6','7.1.7','7.2.3',
  '7.3.1','7.3.2','7.3.3','7.3.4','7.4.1','7.4.3','7.4.4','7.4.5',
  '7.4.6','7.4.7','7.5.1','7.5.3','7.5.4','7.6.1','7.6.2','7.6.3',
  '7.6.4','7.6.5','7.7.1','7.7.2','7.7.3','7.7.4'
)
WHERE standardId='RSPO';

-- Mapeo operativo inicial por proceso. Es editable por UoC en cada evaluación.
UPDATE Requirement
SET processCodes = CASE principleCode
  WHEN 'P1' THEN JSON_ARRAY('Gerencia','Gestión documental','Auditoría interna')
  WHEN 'P2' THEN JSON_ARRAY('Gerencia','Base de suministro','Compras','Contratistas')
  WHEN 'P3' THEN JSON_ARRAY('Planta extractora','Producción','Mantenimiento','Laboratorio','Cadena de suministro')
  WHEN 'P4' THEN JSON_ARRAY('Comunidades','Derechos humanos','Gestión social')
  WHEN 'P5' THEN JSON_ARRAY('Base de suministro','Productores externos','Plantaciones')
  WHEN 'P6' THEN JSON_ARRAY('Gestión humana','Seguridad y salud en el trabajo','Contratistas')
  WHEN 'P7' THEN JSON_ARRAY('Gestión ambiental','Plantaciones','Planta extractora')
  ELSE JSON_ARRAY('Sin asignar')
END
WHERE standardId='RSPO';

UPDATE Requirement
SET expectedEvidence = CASE principleCode
  WHEN 'P1' THEN JSON_ARRAY('Política o procedimiento aprobado','Registro de divulgación','Acta o registro de seguimiento')
  WHEN 'P2' THEN JSON_ARRAY('Matriz legal','Contrato o acuerdo','Registro de verificación de proveedor')
  WHEN 'P3' THEN JSON_ARRAY('Procedimiento operativo','Registro de control','Informe de auditoría interna')
  WHEN 'P4' THEN JSON_ARRAY('Acta de consulta','Mapa o soporte de tenencia','Registro de quejas')
  WHEN 'P5' THEN JSON_ARRAY('Contrato de suministro','Registro de capacitación','Evaluación de productor')
  WHEN 'P6' THEN JSON_ARRAY('Política laboral','Registro de trabajadores','Inspección o capacitación SST')
  WHEN 'P7' THEN JSON_ARRAY('Plan de manejo','Mapa o estudio técnico','Registro de monitoreo ambiental')
  ELSE JSON_ARRAY('Evidencia documental')
END
WHERE standardId='RSPO';

-- Repara únicamente asignaciones heredadas sin valor o dañadas por codificación;
-- no reemplaza asignaciones válidas realizadas por una UoC.
UPDATE PcEvaluation pe
JOIN Requirement r ON r.id=pe.requirementId
SET pe.processes=r.processCodes
WHERE r.standardId='RSPO'
  AND (pe.processes IS NULL OR pe.processes='' OR pe.processes LIKE '%?%');

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
