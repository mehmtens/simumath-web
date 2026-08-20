import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMatrix, gaussJordan2x2 } from '../src/lib/linalg.js';
import { parseWeightedGraph, shortestPath } from '../src/lib/network.js';
import { buildAutomaton, runAutomaton } from '../src/lib/dfa.js';

test('matrix analysis preserves determinant and transformed vector', () => {
  const result = analyzeMatrix(2, 1, 0, 3, 4, -1);
  assert.equal(result.determinant, 6);
  assert.deepEqual(result.vTransformed, [7, -3]);
});

test('Gauss-Jordan trace ends with the inverse for an invertible matrix', () => {
  const result = gaussJordan2x2(2, 0, 0, 4);
  assert.deepEqual(result.inverse, [[0.5, 0], [0, 0.25]]);
  assert.ok(result.steps.length >= 2);
});

test('Dijkstra finds the cheapest path', () => {
  const graph = {
    nodes: ['A', 'B', 'C'],
    adjacency: new Map([
      ['A', [{ to: 'B', weight: 2 }, { to: 'C', weight: 8 }]],
      ['B', [{ to: 'A', weight: 2 }, { to: 'C', weight: 1 }]],
      ['C', [{ to: 'A', weight: 8 }, { to: 'B', weight: 1 }]],
    ]),
  };
  const result = shortestPath(graph, 'A', 'C');
  assert.equal(result.distance, 3);
  assert.deepEqual(result.pathNodes, ['A', 'B', 'C']);
});

test('custom weighted graphs can use named nodes', () => {
  const graph = parseWeightedGraph('A, B, C', 'A B 5\nA C 1\nC B 2');
  const result = shortestPath(graph, 'A', 'B');
  assert.equal(result.distance, 3);
  assert.deepEqual(result.pathNodes, ['A', 'C', 'B']);
});

test('custom NFA supports multiple destinations', () => {
  const definition = buildAutomaton({ kind: 'nfa', statesText: 'S,A,F', alphabetText: '0,1', start: 'S', acceptText: 'F', transitionsText: 'S,0 -> S | A\nS,1 -> S\nA,1 -> F' });
  assert.equal(runAutomaton(definition, '001').accepted, true);
  assert.deepEqual(definition.transitions['S,0'], ['S', 'A']);
});
