// Diferansiyel denklem çözücüler — sabit adımlı RK4 (odeint'in basit ama sağlam bir muadili).

const MAX_REASONABLE_MAGNITUDE = 1e6;

function isNumericallyStable(values) {
  for (const v of values) {
    if (!Number.isFinite(v) || Math.abs(v) > MAX_REASONABLE_MAGNITUDE) return false;
  }
  return true;
}

/** Tek boyutlu RK4 adımı: dy/dt = f(y, t) */
function rk4Step1D(f, y, t, dt) {
  const k1 = f(y, t);
  const k2 = f(y + (dt / 2) * k1, t + dt / 2);
  const k3 = f(y + (dt / 2) * k2, t + dt / 2);
  const k4 = f(y + dt * k3, t + dt);
  return y + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

/** İki boyutlu (vektör) RK4 adımı: dY/dt = f(Y, t), Y = [y0, y1] */
function rk4Step2D(f, Y, t, dt) {
  const add = (a, b, s) => [a[0] + s * b[0], a[1] + s * b[1]];
  const k1 = f(Y, t);
  const k2 = f(add(Y, k1, dt / 2), t + dt / 2);
  const k3 = f(add(Y, k2, dt / 2), t + dt / 2);
  const k4 = f(add(Y, k3, dt), t + dt);
  return [
    Y[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    Y[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
  ];
}

/**
 * y' = -k*y birinci mertebe diferansiyel denklemini çözer.
 * @returns {{t: number[], y: number[], isStable: boolean}}
 */
export function solveFirstOrder(k, y0, tMax, nPoints = 500) {
  const dt = tMax / (nPoints - 1);
  const t = [];
  const y = [];
  let current = y0;
  for (let i = 0; i < nPoints; i++) {
    const time = i * dt;
    t.push(time);
    y.push(current);
    current = rk4Step1D((yy) => -k * yy, current, time, dt);
  }
  return { t, y, isStable: isNumericallyStable(y) };
}

/**
 * m*y'' + c*y' + k*y = 0 sönümlü harmonik osilatörü çözer.
 * @returns {{t: number[], position: number[], velocity: number[], isStable: boolean}}
 */
export function solveSecondOrder(m, c, k, y0, v0, tMax, nPoints = 500) {
  const dt = tMax / (nPoints - 1);
  const model = ([yVal, vVal]) => [vVal, -(c / m) * vVal - (k / m) * yVal];

  const t = [];
  const position = [];
  const velocity = [];
  let Y = [y0, v0];
  for (let i = 0; i < nPoints; i++) {
    const time = i * dt;
    t.push(time);
    position.push(Y[0]);
    velocity.push(Y[1]);
    Y = rk4Step2D(model, Y, time, dt);
  }
  return { t, position, velocity, isStable: isNumericallyStable(position) && isNumericallyStable(velocity) };
}
