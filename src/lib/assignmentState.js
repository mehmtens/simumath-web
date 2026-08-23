export function captureAssignmentState(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, "");
  const [route = "ode", query = ""] = raw.split("?");
  return {
    version: 1,
    route,
    hash: `#${raw}`,
    params: Object.fromEntries(new URLSearchParams(query)),
    capturedAt: new Date().toISOString(),
  };
}

export function makeRouteGradingSpec(hash = window.location.hash) {
  const state = captureAssignmentState(hash);
  const rules = [{ type: "route", expected: state.route, weight: 1 }];
  for (const [key, value] of Object.entries(state.params)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric))
      rules.push({
        type: "param_equals",
        key,
        expected: numeric,
        tolerance: 0.001,
        weight: 1,
      });
  }
  return { version: 1, rules };
}
