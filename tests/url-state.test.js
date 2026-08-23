import test from 'node:test';
import assert from 'node:assert/strict';
import { paramNumber } from '../src/lib/urlState.js';

test('missing and blank URL parameters preserve module defaults', () => {
  assert.equal(paramNumber(new URLSearchParams(), 'm', 7), 7);
  assert.equal(paramNumber(new URLSearchParams('m='), 'm', 7), 7);
});

test('numeric URL parameters are parsed and invalid values fall back', () => {
  assert.equal(paramNumber(new URLSearchParams('m=2.5'), 'm', 7), 2.5);
  assert.equal(paramNumber(new URLSearchParams('m=oops'), 'm', 7), 7);
});
