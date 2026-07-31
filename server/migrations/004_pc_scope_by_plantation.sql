-- Separates the P&C assessment of the mill from each plantation.
-- Incremental and non-destructive: existing assessments remain assigned to MILL.

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

DROP PROCEDURE IF EXISTS drop_index_if_exists$$
CREATE PROCEDURE drop_index_if_exists(
  IN table_name_in VARCHAR(64),
  IN index_name_in VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_in
      AND INDEX_NAME = index_name_in
  ) THEN
    SET @statement = CONCAT(
      'ALTER TABLE `', table_name_in, '` DROP INDEX `', index_name_in, '`'
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

CALL add_column_if_missing(
  'PcEvaluation',
  'scopeType',
  'ENUM(''MILL'',''PLANTATION'',''SMALLHOLDER'') NOT NULL DEFAULT ''MILL'' AFTER `requirementId`'
);
CALL add_column_if_missing(
  'PcEvaluation',
  'scopeId',
  'VARCHAR(36) NOT NULL DEFAULT ''MILL'' AFTER `scopeType`'
);
CALL add_column_if_missing(
  'PcEvaluation',
  'farmPlotId',
  'VARCHAR(36) NULL AFTER `scopeId`'
);
CALL add_column_if_missing(
  'NonConformance',
  'farmPlotId',
  'VARCHAR(36) NULL AFTER `uocId`'
);

UPDATE PcEvaluation
SET scopeType = 'MILL',
    scopeId = 'MILL',
    farmPlotId = NULL
WHERE scopeId IS NULL OR scopeId = '';

CALL drop_index_if_exists('PcEvaluation', 'uq_pc_evaluation');
CALL add_index_if_missing(
  'PcEvaluation',
  'uq_pc_evaluation_scope',
  'UNIQUE KEY `uq_pc_evaluation_scope` (`uocId`,`requirementId`,`scopeType`,`scopeId`)'
);
CALL add_index_if_missing(
  'PcEvaluation',
  'idx_pc_evaluation_plot',
  'INDEX `idx_pc_evaluation_plot` (`uocId`,`farmPlotId`,`status`)'
);
CALL add_index_if_missing(
  'Evidence',
  'idx_evidence_plot_requirement',
  'INDEX `idx_evidence_plot_requirement` (`uocId`,`farmPlotId`,`requirementId`,`status`)'
);
CALL add_index_if_missing(
  'NonConformance',
  'idx_nonconformance_plot_requirement',
  'INDEX `idx_nonconformance_plot_requirement` (`uocId`,`farmPlotId`,`requirementId`)'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS drop_index_if_exists;
DROP PROCEDURE IF EXISTS add_index_if_missing;
