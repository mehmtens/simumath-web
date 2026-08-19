function pyExpr(expr) {
  return expr.replace(/\^/g, '**').replace(/\bpi\b/g, 'np.pi');
}

export function odePythonCode({ type, expression, m, c, k, y0, v0, tMax }) {
  if (type === 'second') {
    return `import numpy as np\nfrom scipy.integrate import solve_ivp\n\nm, c, k = ${m}, ${c}, ${k}\ny0, v0 = ${y0}, ${v0}\n\ndef model(t, Y):\n    y, v = Y\n    return [v, -(c/m)*v - (k/m)*y]\n\nt_eval = np.linspace(0, ${tMax}, 500)\nsol = solve_ivp(model, [0, ${tMax}], [y0, v0], t_eval=t_eval, method='RK45')\nprint(sol.y)\n`;
  }
  const rhs = type === 'custom' ? pyExpr(expression) : `-${k}*y`;
  return `import numpy as np\nfrom scipy.integrate import solve_ivp\n\ny0 = ${y0}\n\ndef model(t, Y):\n    y = Y[0]\n    return [${rhs}]\n\nt_eval = np.linspace(0, ${tMax}, 500)\nsol = solve_ivp(model, [0, ${tMax}], [y0], t_eval=t_eval, method='RK45')\nprint(sol.y[0])\n`;
}

export function odeMatlabCode({ type, expression, m, c, k, y0, v0, tMax }) {
  if (type === 'second') {
    return `% SimuMath ODE export\nm = ${m}; c = ${c}; k = ${k};\nf = @(t,Y) [Y(2); -(c/m)*Y(2) - (k/m)*Y(1)];\n[t,Y] = ode45(f, [0 ${tMax}], [${y0}; ${v0}]);\nplot(t,Y); grid on; legend('y','v');\n`;
  }
  const rhs = type === 'custom' ? expression.replace(/\^/g, '.^') : `-${k}*y`;
  return `% SimuMath ODE export\nf = @(t,y) ${rhs};\n[t,y] = ode45(f, [0 ${tMax}], ${y0});\nplot(t,y); grid on;\n`;
}

export function matrixPythonCode({ m11, m12, m21, m22, vx, vy }) {
  return `import numpy as np\n\nA = np.array([[${m11}, ${m12}], [${m21}, ${m22}]], dtype=float)\nv = np.array([${vx}, ${vy}], dtype=float)\n\nprint('A @ v =', A @ v)\nprint('det(A) =', np.linalg.det(A))\nprint('trace(A) =', np.trace(A))\nprint('eigen =', np.linalg.eig(A))\nif abs(np.linalg.det(A)) > 1e-12:\n    print('inv(A) =', np.linalg.inv(A))\n`;
}

export function matrixMatlabCode({ m11, m12, m21, m22, vx, vy }) {
  return `% SimuMath Matrix export\nA = [${m11} ${m12}; ${m21} ${m22}];\nv = [${vx}; ${vy}];\nAv = A*v\ndetA = det(A)\ntraceA = trace(A)\n[V,D] = eig(A)\nif abs(detA) > 1e-12\n    invA = inv(A)\nend\n`;
}
