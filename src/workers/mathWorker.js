import { solveFirstOrder, solveSecondOrder, solveCustomFirstOrder, solveRLC, solvePendulum, solveHeatDiffusion } from '../lib/ode';
import { fastDecay, fastMatrixMultiply, wasmStatus } from '../lib/wasmMath';

function multiplyMatrices(a, b) {
  if (!a.length || !b.length || a[0].length !== b.length) throw new Error('Matrix dimensions are incompatible.');
  const out = Array.from({ length: a.length }, () => Array(b[0].length).fill(0));
  for (let i = 0; i < a.length; i++) for (let k = 0; k < b.length; k++) { const aik = a[i][k]; for (let j = 0; j < b[0].length; j++) out[i][j] += aik * b[k][j]; }
  return out;
}

self.onmessage = async ({ data }) => {
  const { id, task, payload = {} } = data;
  try {
    let result;
    if (task === 'perf:status') result = { wasm: await wasmStatus(), worker: true };
    else if (task === 'ode:first') result = await fastDecay(payload.k, payload.y0, payload.tMax, payload.nPoints || 500, solveFirstOrder);
    else if (task === 'ode:second') result = solveSecondOrder(payload.m, payload.c, payload.k, payload.y0, payload.v0, payload.tMax, payload.nPoints);
    else if (task === 'ode:custom') result = solveCustomFirstOrder(payload.expression, payload.y0, payload.tMax, payload.nPoints);
    else if (task === 'ode:rlc') result = solveRLC(payload);
    else if (task === 'ode:pendulum') result = solvePendulum(payload);
    else if (task === 'ode:heat') result = solveHeatDiffusion(payload);
    else if (task === 'matrix:multiply') result = await fastMatrixMultiply(payload.a, payload.b, multiplyMatrices);
    else throw new Error(`Unknown worker task: ${task}`);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
