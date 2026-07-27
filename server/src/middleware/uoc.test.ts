import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessUoc, getAuthorizedUocIds } from './uoc.middleware';

test('un administrador puede operar cualquier UoC', async () => {
  assert.equal(await canAccessUoc({ id: 'admin-1', role: 'ADMIN' }, 'uoc-1'), true);
});

test('el alcance global solo se representa para administradores', async () => {
  assert.equal(await getAuthorizedUocIds({ id: 'admin-1', role: 'ADMIN' }), null);
});
