import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.resolve(__dirname, '../../migrations/001_rspo_tech_core.sql'), 'utf8');
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
