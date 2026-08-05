-- Plataforma central RSPO TECH: acceso aislado por plantación, evidencia
-- reutilizable y registros operativos integrados. Migración incremental.

ALTER TABLE User MODIFY COLUMN role ENUM(
  'SUPERADMIN','ADMIN','MILL_ADMIN','MANAGER','SUSTAINABILITY',
  'TECHNICAL_REVIEWER','REVIEWER','AUDITOR','CERTIFIER','COORDINATOR',
  'PROCESS_OWNER','PLANT_ADMIN','PLANTATION_ADMIN','PLANTATION_OPERATOR',
  'VIEWER','READ_ONLY','USER'
) NOT NULL DEFAULT 'USER';

DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_missing$$
CREATE PROCEDURE add_column_if_missing(
  IN table_name_in VARCHAR(64),
  IN column_name_in VARCHAR(64),
  IN column_definition_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_in
      AND COLUMN_NAME = column_name_in
  ) THEN
    SET @statement = CONCAT(
      'ALTER TABLE `', table_name_in, '` ADD COLUMN `',
      column_name_in, '` ', column_definition_in
    );
    PREPARE prepared_statement FROM @statement;
    EXECUTE prepared_statement;
    DEALLOCATE PREPARE prepared_statement;
  END IF;
END$$

DROP PROCEDURE IF EXISTS add_index_if_missing$$
CREATE PROCEDURE add_index_if_missing(
  IN table_name_in VARCHAR(64),
  IN index_name_in VARCHAR(64),
  IN index_definition_in TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_in
      AND INDEX_NAME = index_name_in
  ) THEN
    SET @statement = CONCAT(
      'ALTER TABLE `', table_name_in, '` ADD ', index_definition_in
    );
    PREPARE prepared_statement FROM @statement;
    EXECUTE prepared_statement;
    DEALLOCATE PREPARE prepared_statement;
  END IF;
END$$

DELIMITER ;

CREATE TABLE IF NOT EXISTS UserPlantationAccess (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NOT NULL,
  accessLevel ENUM('ADMIN','OPERATOR','VIEWER') NOT NULL DEFAULT 'VIEWER',
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  assignedBy VARCHAR(36) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_plantation_access (userId, farmPlotId),
  INDEX idx_user_plantation_uoc (userId, uocId, status),
  INDEX idx_plantation_users (farmPlotId, status),
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedBy) REFERENCES User(id) ON DELETE SET NULL
);

CALL add_column_if_missing('Document','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('Document','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Document','moduleCode','VARCHAR(60) NULL');
CALL add_column_if_missing('Risk','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Stakeholder','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Audit','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('ActionPlan','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('PlantRecord','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','plantationLotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','moduleCode','VARCHAR(60) NULL');
CALL add_column_if_missing('Evidence','programCode','VARCHAR(100) NULL');
CALL add_column_if_missing('Evidence','uploadedBy','VARCHAR(36) NULL');
CALL add_column_if_missing('Alert','farmPlotId','VARCHAR(36) NULL');

-- Los documentos del esquema anterior eran globales. Cuando la instalación
-- contiene una única UoC se conservan asociándolos a esa unidad.
UPDATE Document
SET uocId=(SELECT id FROM CertificationUnit ORDER BY createdAt LIMIT 1)
WHERE uocId IS NULL
  AND (SELECT COUNT(*) FROM CertificationUnit)=1;

CALL add_index_if_missing('Document','idx_document_uoc_plot','INDEX `idx_document_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('Risk','idx_risk_uoc_plot','INDEX `idx_risk_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('Stakeholder','idx_stakeholder_uoc_plot','INDEX `idx_stakeholder_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('Audit','idx_audit_uoc_plot','INDEX `idx_audit_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('ActionPlan','idx_action_uoc_plot','INDEX `idx_action_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('PlantRecord','idx_plant_record_uoc_plot','INDEX `idx_plant_record_uoc_plot` (`uocId`,`farmPlotId`)');
CALL add_index_if_missing('Evidence','idx_evidence_uoc_plot_module','INDEX `idx_evidence_uoc_plot_module` (`uocId`,`farmPlotId`,`moduleCode`,`status`)');
CALL add_index_if_missing('Alert','idx_alert_uoc_plot_status','INDEX `idx_alert_uoc_plot_status` (`uocId`,`farmPlotId`,`dismissed`,`createdAt`)');

CREATE TABLE IF NOT EXISTS EvidenceRequirementLink (
  id VARCHAR(36) PRIMARY KEY,
  evidenceId VARCHAR(36) NOT NULL,
  requirementId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NULL,
  linkedBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_evidence_requirement_scope (evidenceId, requirementId, farmPlotId),
  INDEX idx_requirement_evidence_scope (uocId, requirementId, farmPlotId),
  FOREIGN KEY (evidenceId) REFERENCES Evidence(id) ON DELETE CASCADE,
  FOREIGN KEY (requirementId) REFERENCES Requirement(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE,
  FOREIGN KEY (linkedBy) REFERENCES User(id)
);

-- Conserva el vínculo histórico de una evidencia con su indicador principal.
INSERT IGNORE INTO EvidenceRequirementLink
  (id,evidenceId,requirementId,uocId,farmPlotId,linkedBy)
SELECT UUID(),e.id,e.requirementId,e.uocId,e.farmPlotId,
       COALESCE(e.uploadedBy,e.reviewedBy,
         (SELECT u.id FROM User u
          JOIN UserCertificationUnit ucu ON ucu.userId=u.id
          WHERE ucu.uocId=e.uocId ORDER BY FIELD(u.role,'ADMIN','MILL_ADMIN','MANAGER') DESC
          LIMIT 1))
FROM Evidence e
WHERE e.requirementId IS NOT NULL
  AND e.uocId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM EvidenceRequirementLink existingLink
    WHERE existingLink.evidenceId=e.id
      AND existingLink.requirementId=e.requirementId
      AND existingLink.farmPlotId<=>e.farmPlotId
  )
  AND COALESCE(e.uploadedBy,e.reviewedBy,
    (SELECT u.id FROM User u
     JOIN UserCertificationUnit ucu ON ucu.userId=u.id
     WHERE ucu.uocId=e.uocId LIMIT 1)) IS NOT NULL;

CREATE TABLE IF NOT EXISTS OperationalRecord (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NULL,
  plantationLotId VARCHAR(36) NULL,
  moduleCode ENUM('SST','TRAINING','ENVIRONMENT','SOCIAL') NOT NULL,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  responsible VARCHAR(255) NULL,
  scheduledDate DATE NULL,
  completedDate DATE NULL,
  status ENUM('PLANNED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  targetValue DECIMAL(14,4) NULL,
  numeratorValue DECIMAL(14,4) NULL,
  denominatorValue DECIMAL(14,4) NULL,
  resultValue DECIMAL(14,4) NULL,
  unit VARCHAR(50) NULL,
  dataJson LONGTEXT NULL,
  createdBy VARCHAR(36) NOT NULL,
  updatedBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_operational_scope (uocId, farmPlotId, moduleCode, category),
  INDEX idx_operational_dates (uocId, moduleCode, scheduledDate, completedDate),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE,
  FOREIGN KEY (plantationLotId) REFERENCES PlantationLot(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id),
  FOREIGN KEY (updatedBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS OperationalRecordEvidence (
  operationalRecordId VARCHAR(36) NOT NULL,
  evidenceId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (operationalRecordId, evidenceId),
  FOREIGN KEY (operationalRecordId) REFERENCES OperationalRecord(id) ON DELETE CASCADE,
  FOREIGN KEY (evidenceId) REFERENCES Evidence(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS SystemChangeLog (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NULL,
  entityType VARCHAR(80) NOT NULL,
  entityId VARCHAR(191) NOT NULL,
  action VARCHAR(80) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  snapshotJson LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_change_log_entity (uocId, entityType, entityId, createdAt),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE SET NULL,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
