export function readHashState() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [route, query = ''] = raw.split('?');
  return { route, params: new URLSearchParams(query) };
}

export function updateHashState(route, values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.set(key, String(value));
  });
  const query = params.toString();
  const next = `#${route}${query ? `?${query}` : ''}`;
  window.history.replaceState(null, '', next);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function paramNumber(params, key, fallback) {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
