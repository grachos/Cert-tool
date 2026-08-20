-- Productor -> plantación -> lotes. Incremental y sin eliminación de datos.
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

CALL add_column_if_missing('SupplySource','personType','ENUM(''NATURAL'',''JURIDICAL'') NOT NULL DEFAULT ''NATURAL''');
CALL add_column_if_missing('SupplySource','identifierType','ENUM(''CC'',''NIT'') NOT NULL DEFAULT ''CC''');
CALL add_column_if_missing('SupplySource','relationshipType','ENUM(''PARTNER'',''THIRD_PARTY'',''SMALLHOLDER'',''OWN'') NOT NULL DEFAULT ''THIRD_PARTY''');
CALL add_column_if_missing('SupplySource','legalRepresentativeName','VARCHAR(255) NULL');
CALL add_column_if_missing('SupplySource','legalRepresentativeId','VARCHAR(100) NULL');
CALL add_column_if_missing('SupplySource','address','VARCHAR(500) NULL');
CALL add_column_if_missing('SupplySource','phone','VARCHAR(50) NULL');
CALL add_column_if_missing('SupplySource','email','VARCHAR(255) NULL');
CALL add_column_if_missing('SupplySource','dataConsentAccepted','BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('SupplySource','dataConsentAcceptedAt','TIMESTAMP NULL');
CALL add_column_if_missing('SupplySource','dataConsentHolderName','VARCHAR(255) NULL');
CALL add_column_if_missing('SupplySource','dataConsentVersion','VARCHAR(30) NULL');

CALL add_column_if_missing('FarmPlot','locationDescription','VARCHAR(500) NULL');
CALL add_column_if_missing('FarmPlot','latitude','DECIMAL(10,7) NULL');
CALL add_column_if_missing('FarmPlot','longitude','DECIMAL(10,7) NULL');
CALL add_column_if_missing('FarmPlot','fieldWorkers','INT UNSIGNED NOT NULL DEFAULT 0');
CALL add_column_if_missing('FarmPlot','administrativeWorkers','INT UNSIGNED NOT NULL DEFAULT 0');
CALL add_column_if_missing('FarmPlot','permanentWorkers','INT UNSIGNED NOT NULL DEFAULT 0');
CALL add_column_if_missing('FarmPlot','contractorWorkers','INT UNSIGNED NOT NULL DEFAULT 0');
CALL add_column_if_missing('FarmPlot','hasResidents','BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('PlantationActivity','plantationLotId','VARCHAR(36) NULL');

CREATE TABLE IF NOT EXISTS PlantationLot (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  area DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plantation_lot_name (farmPlotId, name),
  INDEX idx_plantation_lot_uoc (uocId, farmPlotId),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS PlantationResident (
  id VARCHAR(36) PRIMARY KEY,
  uocId VARCHAR(36) NOT NULL,
  farmPlotId VARCHAR(36) NOT NULL,
  fullName VARCHAR(255) NOT NULL,
  identifier VARCHAR(100) NOT NULL,
  age INT UNSIGNED NOT NULL,
  dataConsentAccepted BOOLEAN NOT NULL DEFAULT FALSE,
  dataConsentAcceptedAt TIMESTAMP NULL,
  dataConsentHolderName VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plantation_resident_id (farmPlotId, identifier),
  INDEX idx_plantation_resident_uoc (uocId, farmPlotId),
  FOREIGN KEY (uocId) REFERENCES CertificationUnit(id) ON DELETE CASCADE,
  FOREIGN KEY (farmPlotId) REFERENCES FarmPlot(id) ON DELETE CASCADE
);
CALL add_column_if_missing('PlantationResident','dataConsentAccepted','BOOLEAN NOT NULL DEFAULT FALSE');
CALL add_column_if_missing('PlantationResident','dataConsentAcceptedAt','TIMESTAMP NULL');
CALL add_column_if_missing('PlantationResident','dataConsentHolderName','VARCHAR(255) NULL');
CALL add_index_if_missing('PlantationActivity','idx_activity_lot','`plantationLotId`');
CALL add_fk_if_missing('PlantationActivity','fk_activity_lot','FOREIGN KEY (`plantationLotId`) REFERENCES `PlantationLot`(`id`) ON DELETE SET NULL');

-- Conserva el lote que antes estaba embebido en FarmPlot.name.
INSERT IGNORE INTO PlantationLot (id,uocId,farmPlotId,name,area,notes)
SELECT UUID(), fp.uocId, fp.id, fp.name, fp.area, 'Migrado desde la ficha anterior'
FROM FarmPlot fp
WHERE fp.name IS NOT NULL AND TRIM(fp.name) <> '';

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_fk_if_missing;
