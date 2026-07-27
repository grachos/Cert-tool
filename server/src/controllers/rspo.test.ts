import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeliveryWeights } from './rspo.controller';

test('calcula peso neto y toneladas de una entrega RFF', () => {
  assert.deepEqual(calculateDeliveryWeights(18_750, 6_250), {
    grossWeightKg: 18_750,
    tareWeightKg: 6_250,
    netWeightKg: 12_500,
    volumeMt: 12.5
  });
});

test('rechaza pesos inconsistentes', () => {
  assert.throws(() => calculateDeliveryWeights(5_000, 5_000));
  assert.throws(() => calculateDeliveryWeights(4_000, 5_000));
  assert.throws(() => calculateDeliveryWeights(5_000, -1));
});
