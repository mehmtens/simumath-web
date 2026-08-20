let wasmModulePromise;
const WASM_ENTRY = '/wasm/simumath_wasm.js';

async function wasmAssetExists() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(WASM_ENTRY, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    const type = response.headers.get('content-type') || '';
    return response.ok && !type.includes('text/html');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadWasmModule() {
  if (!wasmModulePromise) {
    wasmModulePromise = wasmAssetExists().then(exists => exists ? import(/* @vite-ignore */ WASM_ENTRY) : null)
      .then(async (mod) => { if (typeof mod.default === 'function') await mod.default('/wasm/simumath_wasm_bg.wasm'); return mod; })
      .catch(() => null);
  }
  return wasmModulePromise;
}

export async function wasmStatus() { return (await loadWasmModule()) ? 'wasm' : 'fallback'; }

export async function fastMatrixMultiply(a, b, fallback) {
  const wasm = await loadWasmModule();
  if (!wasm?.matmul) return fallback(a, b);
  const rows = a.length, inner = a[0]?.length || 0, cols = b[0]?.length || 0;
  const flat = wasm.matmul(Float64Array.from(a.flat()), rows, inner, Float64Array.from(b.flat()), cols);
  return Array.from({ length: rows }, (_, i) => Array.from(flat.slice(i * cols, (i + 1) * cols)));
}

export async function fastDecay(k, y0, tMax, nPoints, fallback) {
  const wasm = await loadWasmModule();
  if (!wasm?.rk4_decay) return fallback(k, y0, tMax, nPoints);
  const y = Array.from(wasm.rk4_decay(k, y0, tMax, nPoints));
  const dt = tMax / (Math.max(2, nPoints) - 1);
  return { t: y.map((_, i) => i * dt), y, isStable: y.every(Number.isFinite) };
}
