import { solveFirstOrder, solveSecondOrder, solveCustomFirstOrder, solveRlc, solvePendulum, solveHeat1D } from '../lib/ode';

function multiplyMatrices(a, b) {
  const rows = a.length;
  const cols = b[0].length;
  const inner = b.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = a[i][k];
      for (let j = 0; j < cols; j++) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

self.onmessage = (event) => {
  const { id, task, payload } = event.data;
  try {
    let result;
    if (task === 'ode:first') result = solveFirstOrder(payload.k, payload.y0, payload.tMax, payload.nPoints);
    else if (task === 'ode:second') result = solveSecondOrder(payload.m, payload.c, payload.k, payload.y0, payload.v0, payload.tMax, payload.nPoints);
    else if (task === 'ode:custom') result = solveCustomFirstOrder(payload.expression, payload.y0, payload.tMax, payload.nPoints);
    else if (task === 'ode:rlc') result = solveRlc(payload.R, payload.L, payload.C, payload.q0, payload.i0, payload.tMax, payload.nPoints);
    else if (task === 'ode:pendulum') result = solvePendulum(payload.length, payload.damping, payload.theta0, payload.omega0, payload.tMax, payload.nPoints);
    else if (task === 'ode:heat') result = solveHeat1D(payload.alpha, payload.length, payload.tMax, payload.nx, payload.snapshots);
    else if (task === 'matrix:multiply') result = multiplyMatrices(payload.a, payload.b);
    else throw new Error(`Unknown worker task: ${task}`);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error.message });
  }
};
