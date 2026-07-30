// 2x2 matris analizi: özdeğerler (kapalı form), özvektörler ve vektör dönüşümü.

const AXIS_MARGIN = 3.0;

function norm(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

/**
 * A = [[a, b], [c, d]] matrisinin özdeğer/özvektörlerini kapalı formülle hesaplar.
 * @returns {Array<{isReal: boolean, real: number, imag: number, vector: number[]|null}>}
 */
function eigenDecomposition2x2(a, b, c, d) {
  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  if (discriminant >= 0) {
    const sqrtDisc = Math.sqrt(discriminant);
    const lambdas = [(trace + sqrtDisc) / 2, (trace - sqrtDisc) / 2];
    return lambdas.map((lambda) => {
      let vector;
      if (b !== 0) {
        vector = [b, lambda - a];
      } else if (c !== 0) {
        vector = [lambda - d, c];
      } else {
        // Köşegen matris: b=c=0. lambda 'a' ise [1,0], 'd' ise [0,1].
        vector = Math.abs(lambda - a) < 1e-9 ? [1, 0] : [0, 1];
      }
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

/**
 * Bir 2x2 matrisi ve vektörü analiz eder: dönüşüm, özdeğerler, çizim için eksen limiti.
 */
export function analyzeMatrix(a, b, c, d, vx, vy) {
  const v = [vx, vy];
  const vTransformed = [a * vx + b * vy, c * vx + d * vy];

  let maxExtent = Math.max(...v.map(Math.abs), ...vTransformed.map(Math.abs));
  if (!Number.isFinite(maxExtent) || maxExtent === 0) maxExtent = 1.0;
  const axisLimit = maxExtent + AXIS_MARGIN;

  const eigenInfos = eigenDecomposition2x2(a, b, c, d);

  return { v, vTransformed, eigenInfos, axisLimit };
}

/** Bir özdeğer bilgisini "λ1 = ..." formatında okunabilir metne çevirir. */
export function formatEigenLabel(info, index) {
  if (info.isReal) {
    return `λ${index} = ${info.real.toFixed(2)}`;
  }
  const sign = info.imag >= 0 ? '+' : '-';
  return `λ${index} = ${info.real.toFixed(2)} ${sign} ${Math.abs(info.imag).toFixed(2)}i (salınımlı/dönel davranış)`;
}

/** Bir özvektör doğrultusunda, eksen limitine göre ölçeklenmiş iki uç nokta döner. */
export function eigenvectorLineEndpoints(vector, axisLimit) {
  return [
    [-axisLimit * vector[0], -axisLimit * vector[1]],
    [axisLimit * vector[0], axisLimit * vector[1]],
  ];
}
