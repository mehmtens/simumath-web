import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMatrix, gaussJordan2x2 } from '../src/lib/linalg.js';
import { shortestPath } from '../src/lib/network.js';

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
