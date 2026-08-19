// Diferansiyel denklem çözücüleri — sabit adımlı RK4.

const MAX_REASONABLE_MAGNITUDE = 1e6;

function isNumericallyStable(values) {
  for (const v of values) {
    if (!Number.isFinite(v) || Math.abs(v) > MAX_REASONABLE_MAGNITUDE) return false;
  }
  return true;
}

function rk4Step1D(f, y, t, dt) {
  const k1 = f(y, t);
  const k2 = f(y + (dt / 2) * k1, t + dt / 2);
  const k3 = f(y + (dt / 2) * k2, t + dt / 2);
  const k4 = f(y + dt * k3, t + dt);
  return y + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

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

const ALLOWED_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'exp', 'log', 'pow', 'min', 'max']);

/** Basit bir matematik ifadesini yalnızca y, t, sayılar ve izinli Math fonksiyonlarıyla derler. */
export function compileExpression(expression) {
  const source = String(expression ?? '').trim().replace(/\^/g, '**');
  if (!source) throw new Error('Denklem boş olamaz.');
  if (!/^[0-9+\-*/().,\s_a-zA-Z*]+$/.test(source)) throw new Error('Denklemde desteklenmeyen karakter var.');

  const identifiers = source.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  for (const id of identifiers) {
    if (id !== 'y' && id !== 't' && id !== 'pi' && id !== 'e' && !ALLOWED_FUNCTIONS.has(id)) {
      throw new Error(`Desteklenmeyen ifade: ${id}`);
    }
  }

  let js = source.replace(/\bpi\b/g, 'Math.PI').replace(/\be\b/g, 'Math.E');
  for (const fn of ALLOWED_FUNCTIONS) js = js.replace(new RegExp(`\\b${fn}\\b`, 'g'), `Math.${fn}`);

  const fn = new Function('y', 't', `"use strict"; return (${js});`);
  const probe = fn(1, 0);
  if (!Number.isFinite(probe)) throw new Error('Denklem başlangıç testinde sonlu bir sayı üretmedi.');
  return fn;
}

export function solveCustomFirstOrder(expression, y0, tMax, nPoints = 500) {
  const f = compileExpression(expression);
  const dt = tMax / (nPoints - 1);
  const t = [];
  const y = [];
  let current = y0;
  for (let i = 0; i < nPoints; i++) {
    const time = i * dt;
    t.push(time);
    y.push(current);
    current = rk4Step1D((yy, tt) => Number(f(yy, tt)), current, time, dt);
  }
  return { t, y, isStable: isNumericallyStable(y) };
}

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
