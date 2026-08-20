import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompliance, plantationPcScopeType } from './controllers/pc.controller';

const row = (status: string, isCritical = false, applicability = 'APPLICABLE') => ({
  clause: '1.1.1',
  principleCode: 'P1',
  isCritical,
  status,
  applicability,
  processes: [],
  processCodes: []
});

test('un indicador crítico no conforme limita el cumplimiento global a 49%', () => {
  const result = calculateCompliance([
    row('COMPLIANT'), row('COMPLIANT'), row('COMPLIANT'), row('NON_COMPLIANT', true)
  ]);
  assert.equal(result.baseScore, 75);
  assert.equal(result.overall, 49);
  assert.equal(result.criticalNonCompliant, 1);
});

test('un indicador crítico pendiente limita el cumplimiento global a 79%', () => {
  const result = calculateCompliance([
    ...Array.from({ length: 9 }, () => row('COMPLIANT')),
    row('PENDING_VERIFICATION', true)
  ]);
  assert.equal(result.baseScore, 95);
  assert.equal(result.overall, 79);
  assert.equal(result.criticalPending, 1);
});

test('No aplica aprobado se excluye del denominador', () => {
  const result = calculateCompliance([
    row('COMPLIANT'),
    row('NOT_APPLICABLE', false, 'NOT_APPLICABLE')
  ]);
  assert.equal(result.applicable, 1);
  assert.equal(result.notApplicable, 1);
  assert.equal(result.overall, 100);
});

test('plantaciones de hasta 50 hectáreas usan el perfil de pequeño productor', () => {
  assert.equal(plantationPcScopeType(38), 'SMALLHOLDER');
  assert.equal(plantationPcScopeType(50), 'SMALLHOLDER');
  assert.equal(plantationPcScopeType(50.01), 'PLANTATION');
  assert.equal(plantationPcScopeType(120), 'PLANTATION');
});
