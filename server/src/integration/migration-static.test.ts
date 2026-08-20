import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.resolve(__dirname, '../../migrations/001_rspo_tech_core.sql'), 'utf8');
const producerMigration = fs.readFileSync(path.resolve(__dirname, '../../migrations/002_producer_plantation_structure.sql'), 'utf8');
const pcMigration = fs.readFileSync(path.resolve(__dirname, '../../migrations/003_pc_uoc_compliance.sql'), 'utf8');
const pcPlantationMigration = fs.readFileSync(path.resolve(__dirname, '../../migrations/004_pc_scope_by_plantation.sql'), 'utf8');
const pcImporter = fs.readFileSync(path.resolve(__dirname, '../../import_rspo_pc.ts'), 'utf8');
const schema = fs.readFileSync(path.resolve(__dirname, '../../schema.sql'), 'utf8');

test('migración no usa ADD COLUMN IF NOT EXISTS incompatible', () => {
  assert.doesNotMatch(migration, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i);
  assert.match(migration, /information_schema\.COLUMNS/i);
});

test('migración declara índices y relaciones UoC críticas', () => {
  for (const token of ['idx_action_uoc','idx_evidence_uoc','fk_action_uoc','fk_evidence_uoc','fk_plant_record_uoc']) assert.match(migration, new RegExp(token));
});

test('esquema base incluye ActionPlan ampliado, asignaciones y PlantRecord', () => {
  for (const token of ['brecha TEXT','causaRaiz TEXT','correccion TEXT','eficacia TEXT','UserCertificationUnit','PlantRecord']) assert.match(schema, new RegExp(token));
});

test('migración de productores separa plantaciones, lotes y residentes sin borrar datos', () => {
  for (const token of [
    'personType', 'legalRepresentativeId', 'relationshipType', 'PlantationLot',
    'PlantationResident', 'plantationLotId', 'dataConsentAccepted'
  ]) assert.match(producerMigration, new RegExp(token));
  assert.doesNotMatch(producerMigration, /\bDROP\s+TABLE\b|\bTRUNCATE\b/i);
  assert.match(producerMigration, /INSERT\s+IGNORE\s+INTO\s+PlantationLot/i);
});

test('migración P&C crea alcance UoC, evaluación, historial y revisión sin borrar datos', () => {
  for (const token of [
    'PcEvaluation', 'PcEvaluationHistory', 'EvidenceHistory', 'ManagementReview',
    'officialText', 'isCritical', 'noApplyJustification', 'idx_alert_uoc_dismissed'
  ]) assert.match(pcMigration, new RegExp(token));
  assert.doesNotMatch(pcMigration, /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  assert.match(pcMigration, /2024 v4\.2/i);
});

test('migración P&C por plantación separa alcances y evidencias sin borrar datos', () => {
  for (const token of [
    'scopeType', 'scopeId', 'farmPlotId', 'SMALLHOLDER',
    'uq_pc_evaluation_scope', 'idx_evidence_plot_requirement',
    'idx_nonconformance_plot_requirement'
  ]) assert.match(pcPlantationMigration, new RegExp(token));
  assert.doesNotMatch(pcPlantationMigration, /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\b/i);
  assert.match(pcPlantationMigration, /UPDATE\s+PcEvaluation/i);
});

test('esquema base refleja las nuevas entidades de Cumplimiento P&C', () => {
  for (const token of [
    'CREATE TABLE IF NOT EXISTS PcEvaluation',
    'CREATE TABLE IF NOT EXISTS ManagementReview',
    'pcWorkflowState',
    'scopeDescription TEXT',
    'workflowStatus VARCHAR'
  ]) assert.match(schema, new RegExp(token));
});

test('importador controlado exige la versión oficial y los 162 indicadores', () => {
  for (const token of [
    'RSPO-STD-T01-001', 'Version', '4.2', 'indicators.length !== 162',
    'officialSourceUrl', 'officialImportedAt', 'active=FALSE'
  ]) assert.match(pcImporter, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(pcImporter, /TRUNCATE|DROP\s+TABLE/i);
});
