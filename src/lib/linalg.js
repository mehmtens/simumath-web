// 2x2 matris analizi: özdeğerler, özvektörler, determinant, iz, ters, vektör dönüşümü ve Gauss-Jordan adımları.

const AXIS_MARGIN = 3.0;
const EPS = 1e-9;

function norm(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function cloneMatrix(m) {
  return m.map((row) => [...row]);
}

function eigenDecomposition2x2(a, b, c, d) {
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  if (discriminant >= 0) {
    const sqrtDisc = Math.sqrt(discriminant);
    const lambdas = [(trace + sqrtDisc) / 2, (trace - sqrtDisc) / 2];
    return lambdas.map((lambda) => {
      let vector;
      if (Math.abs(b) > EPS) vector = [b, lambda - a];
      else if (Math.abs(c) > EPS) vector = [lambda - d, c];
      else vector = Math.abs(lambda - a) < EPS ? [1, 0] : [0, 1];
      const n = norm(vector) || 1;
      return { isReal: true, real: lambda, imag: 0, vector: [vector[0] / n, vector[1] / n] };
    });
  }

  const realPart = trace / 2;
  const imagPart = Math.sqrt(-discriminant) / 2;
  return [
    { isReal: false, real: realPart, imag: imagPart, vector: null },
    { isReal: false, real: realPart, imag: -imagPart, vector: null },
  ];
}

export function analyzeMatrix(a, b, c, d, vx, vy) {
  const v = [vx, vy];
  const vTransformed = [a * vx + b * vy, c * vx + d * vy];
  const determinant = a * d - b * c;
  const trace = a + d;
  const invertible = Math.abs(determinant) > EPS;
  const inverse = invertible ? [[d / determinant, -b / determinant], [-c / determinant, a / determinant]] : null;
  const frobeniusNorm = Math.sqrt(a * a + b * b + c * c + d * d);
  let maxExtent = Math.max(...v.map(Math.abs), ...vTransformed.map(Math.abs));
  if (!Number.isFinite(maxExtent) || maxExtent === 0) maxExtent = 1.0;
  const axisLimit = maxExtent + AXIS_MARGIN;
  const eigenInfos = eigenDecomposition2x2(a, b, c, d);
  return { v, vTransformed, eigenInfos, axisLimit, determinant, trace, invertible, inverse, frobeniusNorm };
}

export function gaussJordan2x2(a, b, c, d) {
  const matrix = [[a, b, 1, 0], [c, d, 0, 1]];
  const steps = [{ label: 'Başlangıç: [A | I]', matrix: cloneMatrix(matrix) }];

  for (let pivot = 0; pivot < 2; pivot++) {
    let pivotRow = pivot;
    for (let r = pivot + 1; r < 2; r++) {
      if (Math.abs(matrix[r][pivot]) > Math.abs(matrix[pivotRow][pivot])) pivotRow = r;
    }
    if (Math.abs(matrix[pivotRow][pivot]) < EPS) {
      steps.push({ label: 'Pivot bulunamadı: matris tekil.', matrix: cloneMatrix(matrix), singular: true });
      return { singular: true, steps, inverse: null };
    }
    if (pivotRow !== pivot) {
      [matrix[pivot], matrix[pivotRow]] = [matrix[pivotRow], matrix[pivot]];
      steps.push({ label: `R${pivot + 1} ↔ R${pivotRow + 1}`, matrix: cloneMatrix(matrix) });
    }
    const pivotValue = matrix[pivot][pivot];
    if (Math.abs(pivotValue - 1) > EPS) {
      matrix[pivot] = matrix[pivot].map((v) => v / pivotValue);
      steps.push({ label: `R${pivot + 1} ← R${pivot + 1} / ${pivotValue.toFixed(3)}`, matrix: cloneMatrix(matrix) });
    }
    for (let r = 0; r < 2; r++) {
      if (r === pivot) continue;
      const factor = matrix[r][pivot];
      if (Math.abs(factor) < EPS) continue;
      matrix[r] = matrix[r].map((v, col) => v - factor * matrix[pivot][col]);
      steps.push({ label: `R${r + 1} ← R${r + 1} - (${factor.toFixed(3)})R${pivot + 1}`, matrix: cloneMatrix(matrix) });
    }
  }

  const inverse = [[matrix[0][2], matrix[0][3]], [matrix[1][2], matrix[1][3]]];
  steps.push({ label: 'Tamamlandı: [I | A⁻¹]', matrix: cloneMatrix(matrix), done: true });
  return { singular: false, steps, inverse };
}

export function formatEigenLabel(info, index) {
  if (info.isReal) return `λ${index} = ${info.real.toFixed(3)}`;
  const sign = info.imag >= 0 ? '+' : '-';
  return `λ${index} = ${info.real.toFixed(3)} ${sign} ${Math.abs(info.imag).toFixed(3)}i`;
}

export function eigenvectorLineEndpoints(vector, axisLimit) {
  return [[-axisLimit * vector[0], -axisLimit * vector[1]], [axisLimit * vector[0], axisLimit * vector[1]]];
}
