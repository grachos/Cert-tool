-- Incremental, non-destructive RSPO TECH core migration.
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
CREATE TABLE IF NOT EXISTS UserCertificationUnit (
  userId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (userId, uocId),
  CONSTRAINT fk_ucu_user FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  CONSTRAINT fk_ucu_uoc FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE
);

CALL add_column_if_missing('CertificationUnit','type','ENUM(''MIXED'',''PLANTATION'',''MILL'',''SMALLHOLDERS'') DEFAULT ''MIXED''');
CALL add_column_if_missing('CertificationUnit','appliesAll','BOOLEAN DEFAULT TRUE');
CALL add_column_if_missing('CertificationUnit','applicablePrinciples','JSON NULL');

CALL add_column_if_missing('ActionPlan','brecha','TEXT NULL');
CALL add_column_if_missing('ActionPlan','causaRaiz','TEXT NULL');
CALL add_column_if_missing('ActionPlan','correccion','TEXT NULL');
CALL add_column_if_missing('ActionPlan','eficacia','TEXT NULL');
CALL add_column_if_missing('ActionPlan','closedAt','TIMESTAMP NULL');
CALL add_column_if_missing('ActionPlan','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('ActionPlan','evidenceId','VARCHAR(36) NULL');
CALL add_index_if_missing('ActionPlan','idx_action_uoc','`uocId`');

CREATE TABLE IF NOT EXISTS SupplySource (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  identifier VARCHAR(100) NOT NULL,
  sourceType ENUM('OWN','ASSOCIATED','INDEPENDENT','ASSOCIATION','SMALLHOLDER_GROUP','INDIVIDUAL') NOT NULL,
  totalArea DECIMAL(12,2) DEFAULT 0,
  plantedArea DECIMAL(12,2) DEFAULT 0,
  certifiedArea DECIMAL(12,2) DEFAULT 0,
  polygonReference TEXT NULL,
  polygonStatus ENUM('PENDING','VALID','INVALID') DEFAULT 'PENDING',
  riskLevel ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  eligibilityStatus ENUM('ELIGIBLE','CONDITIONAL','INELIGIBLE','PENDING') DEFAULT 'PENDING',
  certificationStatus ENUM('CERTIFIED','CONVENTIONAL','SUSPENDED','PENDING') DEFAULT 'PENDING',
  responsible VARCHAR(255) NULL,
  lastEvaluation DATE NULL,
  expiryDate DATE NULL,
  notes TEXT NULL,
  status ENUM('ACTIVE','ARCHIVED') DEFAULT 'ACTIVE',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_supply_identifier_uoc (uocId, identifier),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS FarmPlot (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  supplySourceId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  farmName VARCHAR(255) NULL,
  area DECIMAL(12,2) DEFAULT 0,
  plantedArea DECIMAL(12,2) DEFAULT 0,
  estimatedProductionMt DECIMAL(12,3) DEFAULT 0,
  eligibilityStatus ENUM('ELIGIBLE','CONDITIONAL','INELIGIBLE','PENDING') DEFAULT 'PENDING',
  certificationStatus ENUM('CERTIFIED','CONVENTIONAL','SUSPENDED','PENDING') DEFAULT 'PENDING',
  polygonReference TEXT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (supplySourceId) REFERENCES SupplySource(id) ON DELETE CASCADE
);
CALL add_column_if_missing('SupplySource','status','ENUM(''ACTIVE'',''ARCHIVED'') DEFAULT ''ACTIVE''');

CREATE TABLE IF NOT EXISTS SupplySourceHistory (
  id VARCHAR(36) PRIMARY KEY,
  supplySourceId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  changesJson JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplySourceId) REFERENCES SupplySource(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS PlantationActivity (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NOT NULL,
  category ENUM('GAP','MAINTENANCE','PLANT_HEALTH','INPUT','VISIT','EVALUATION','DOCUMENT') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  requirementId VARCHAR(36) NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  score DECIMAL(5,2) NULL,
  isCritical BOOLEAN DEFAULT FALSE,
  responsible VARCHAR(255) NULL,
  activityDate DATE NULL,
  dueDate DATE NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE,
  FOREIGN KEY (requirementId) REFERENCES Requirement(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS RffDelivery (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  supplySourceId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NULL,
  deliveredAt DATETIME NOT NULL,
  agriculturalLot VARCHAR(100) NULL,
  traceabilityLot VARCHAR(100) NOT NULL,
  vehicle VARCHAR(100) NULL,
  plate VARCHAR(30) NOT NULL,
  driverName VARCHAR(255) NULL,
  weighTicket VARCHAR(100) NOT NULL,
  grossWeightKg DECIMAL(12,3) NOT NULL,
  tareWeightKg DECIMAL(12,3) NOT NULL,
  netWeightKg DECIMAL(12,3) NOT NULL,
  volumeMt DECIMAL(12,3) NOT NULL,
  supplyModel ENUM('IP','SG','MB') NOT NULL,
  fruitCondition ENUM('CERTIFIED','CONVENTIONAL') NOT NULL,
  eligibleAtDelivery BOOLEAN NOT NULL,
  estimatedProductionMt DECIMAL(12,3) DEFAULT 0,
  accumulatedDeliveredMt DECIMAL(12,3) DEFAULT 0,
  varianceMt DECIMAL(12,3) DEFAULT 0,
  documentRef VARCHAR(255) NULL,
  observations TEXT NULL,
  evidenceId VARCHAR(36) NULL,
  status ENUM('ACCEPTED','REVIEW','REJECTED') DEFAULT 'REVIEW',
  sccTransactionId VARCHAR(36) NULL,
  createdBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_uoc (uocId, weighTicket),
  UNIQUE KEY uq_trace_lot_uoc (uocId, traceabilityLot),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (supplySourceId) REFERENCES SupplySource(id),
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id),
  FOREIGN KEY (evidenceId) REFERENCES Evidence(id) ON DELETE SET NULL,
  FOREIGN KEY (sccTransactionId) REFERENCES SccTransaction(id) ON DELETE SET NULL,
  FOREIGN KEY (createdBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS TraceabilityAlert (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  deliveryId VARCHAR(36) NOT NULL,
  alertType ENUM('INELIGIBLE','OVERPRODUCTION','MISSING_DATA','DUPLICATE','CERTIFICATION_MISMATCH') NOT NULL,
  severity ENUM('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'HIGH',
  message TEXT NOT NULL,
  status ENUM('OPEN','RESOLVED','DISMISSED') DEFAULT 'OPEN',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP NULL,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (deliveryId) REFERENCES RffDelivery(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Alert (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  priority VARCHAR(50) NOT NULL DEFAULT 'media',
  action VARCHAR(255) NULL,
  module VARCHAR(100) NULL,
  dismissed TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alert_dismissed_created (dismissed, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PrismaOperation (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  operationType ENUM('SHIPPING_ANNOUNCEMENT','CONFIRMATION','REMOVE','ADJUSTMENT') NOT NULL,
  internalReference VARCHAR(100) NOT NULL,
  prismaReference VARCHAR(100) NULL,
  product VARCHAR(100) NOT NULL,
  supplyModel ENUM('IP','SG','MB','BC') NOT NULL,
  volumeMt DECIMAL(12,3) NOT NULL,
  physicalDate DATE NOT NULL,
  deadline DATE NULL,
  status ENUM('DRAFT','PENDING','CONFIRMED','REMOVED','ADJUSTED','OVERDUE') DEFAULT 'DRAFT',
  counterparty VARCHAR(255) NULL,
  observations TEXT NULL,
  responsibleId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_prisma_internal_uoc (uocId, internalReference),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (responsibleId) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS PrismaAdjustment (
  id VARCHAR(36) PRIMARY KEY,
  operationId VARCHAR(36) NOT NULL,
  adjustmentType ENUM('CONFIRMATION','REMOVE','ADJUSTMENT') NOT NULL,
  previousVolumeMt DECIMAL(12,3) NULL,
  newVolumeMt DECIMAL(12,3) NULL,
  reason TEXT NOT NULL,
  createdBy VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operationId) REFERENCES PrismaOperation(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES User(id)
);

CREATE TABLE IF NOT EXISTS PrismaAttachment (
  id VARCHAR(36) PRIMARY KEY,
  operationId VARCHAR(36) NOT NULL,
  evidenceId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operationId) REFERENCES PrismaOperation(id) ON DELETE CASCADE,
  FOREIGN KEY (evidenceId) REFERENCES Evidence(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PlantRecord (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  section ENUM('contratistas','sst','ambiente','avc','social','negocios') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  responsible VARCHAR(255) NULL,
  date DATE NULL,
  meta VARCHAR(255) NULL,
  result VARCHAR(255) NULL,
  extra JSON NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plant_record_uoc (uocId),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE
);
CALL add_column_if_missing('PlantRecord','uocId','VARCHAR(36) NULL');
CALL add_index_if_missing('PlantRecord','idx_plant_record_uoc','`uocId`');

CREATE TABLE IF NOT EXISTS ActionPlanHistory (
  id VARCHAR(36) PRIMARY KEY,
  actionPlanId VARCHAR(36) NOT NULL,
  uocId VARCHAR(36) NOT NULL,
  changedBy VARCHAR(36) NOT NULL,
  changesJson JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actionPlanId) REFERENCES ActionPlan(id) ON DELETE CASCADE,
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (changedBy) REFERENCES User(id)
);

CALL add_column_if_missing('Evidence','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','companyName','VARCHAR(255) NULL');
CALL add_column_if_missing('Evidence','supplySourceId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','farmPlotId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','requirementId','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','indicator','VARCHAR(255) NULL');
CALL add_column_if_missing('Evidence','responsible','VARCHAR(255) NULL');
CALL add_column_if_missing('Evidence','fileName','VARCHAR(255) NULL');
CALL add_column_if_missing('Evidence','originalFileName','VARCHAR(255) NULL');
CALL add_column_if_missing('Evidence','mimeType','VARCHAR(100) NULL');
CALL add_column_if_missing('Evidence','observations','TEXT NULL');
CALL add_column_if_missing('Evidence','reviewedBy','VARCHAR(36) NULL');
CALL add_column_if_missing('Evidence','reviewedAt','TIMESTAMP NULL');
CALL add_index_if_missing('Evidence','idx_evidence_uoc','`uocId`');

CALL add_column_if_missing('Activity','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('Risk','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('Audit','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('NonConformance','uocId','VARCHAR(36) NULL');
CALL add_column_if_missing('Stakeholder','uocId','VARCHAR(36) NULL');
CALL add_index_if_missing('Activity','idx_activity_uoc','`uocId`');
CALL add_index_if_missing('Risk','idx_risk_uoc','`uocId`');
CALL add_index_if_missing('Audit','idx_audit_uoc','`uocId`');
CALL add_index_if_missing('NonConformance','idx_nc_uoc','`uocId`');
CALL add_index_if_missing('Stakeholder','idx_stakeholder_uoc','`uocId`');

DELIMITER $$
DROP PROCEDURE IF EXISTS add_fk_if_missing$$
CREATE PROCEDURE add_fk_if_missing(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_sql TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_name, '` ', p_sql);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;
CALL add_fk_if_missing('ActionPlan','fk_action_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('ActionPlan','fk_action_evidence','FOREIGN KEY (`evidenceId`) REFERENCES `Evidence`(`id`) ON DELETE SET NULL');
CALL add_fk_if_missing('Evidence','fk_evidence_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('Evidence','fk_evidence_source','FOREIGN KEY (`supplySourceId`) REFERENCES `SupplySource`(`id`) ON DELETE SET NULL');
CALL add_fk_if_missing('Evidence','fk_evidence_plot','FOREIGN KEY (`farmPlotId`) REFERENCES `FarmPlot`(`id`) ON DELETE SET NULL');
CALL add_fk_if_missing('Evidence','fk_evidence_requirement','FOREIGN KEY (`requirementId`) REFERENCES `Requirement`(`id`) ON DELETE SET NULL');
CALL add_fk_if_missing('Evidence','fk_evidence_reviewer','FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL');
CALL add_fk_if_missing('Activity','fk_activity_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('Risk','fk_risk_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('Audit','fk_audit_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('NonConformance','fk_nc_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('Stakeholder','fk_stakeholder_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
CALL add_fk_if_missing('PlantRecord','fk_plant_record_uoc','FOREIGN KEY (`uocId`) REFERENCES `CertificationUnit`(`id`) ON DELETE RESTRICT');
DROP PROCEDURE IF EXISTS add_fk_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;
