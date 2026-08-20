import test from 'node:test';
import assert from 'node:assert/strict';
import { captureAssignmentState, makeRouteGradingSpec } from '../src/lib/assignmentState.js';

test('captures a reproducible lab route and parameters', () => {
  const state=captureAssignmentState('#matrix?a=2&b=1');
  assert.equal(state.version,1);
  assert.equal(state.route,'matrix');
  assert.equal(state.hash,'#matrix?a=2&b=1');
  assert.deepEqual(state.params,{a:'2',b:'1'});
  assert.ok(!Number.isNaN(Date.parse(state.capturedAt)));
});

test('builds route and numeric parameter grading rules', () => {
  const spec = makeRouteGradingSpec('#ode?m=2&label=demo&k=8');
  assert.equal(spec.version, 1);
  assert.deepEqual(spec.rules.map(rule => rule.type), ['route', 'param_equals', 'param_equals']);
  assert.deepEqual(spec.rules.map(rule => rule.key).filter(Boolean), ['m', 'k']);
});
