import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeMatrix,
  formatEigenLabel,
  eigenvectorLineEndpoints,
  gaussJordan2x2,
  luTrace2x2,
  eigenTrace2x2,
} from "../lib/linalg";
import { paramNumber, readHashState, updateHashState } from "../lib/urlState";
import { runMathTask } from "../lib/workerClient";
import {
  matrixPythonCode,
  matrixSympyCode,
  matrixMatlabCode,
} from "../lib/codegen";
import {
  buildLatexReport,
  downloadText,
  exportSvgElement,
  exportSvgAsPng,
  printReport,
} from "../lib/download";
const VIEW_SIZE = 360;
const fmt = (n) =>
  Number.isFinite(n) ? n.toFixed(3).replace(/\.000$/, "") : "—";
const fmtRow = (r) => r.map(fmt).join("   ");
function toScreen(x, y, l) {
  const s = (VIEW_SIZE / 2 - 20) / l;
  return [VIEW_SIZE / 2 + x * s, VIEW_SIZE / 2 - y * s];
}
function benchmarkMatrix(n, phase) {
  return Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: n },
      (_, j) => (((i * 17 + j * 13 + phase) % 23) - 11) / 7,
    ),
  );
}
function Slider({ label, value, set }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span className="value">{value.toFixed(2)}</span>
      </label>
      <input
        type="range"
        min="-4"
        max="4"
        step="0.1"
        value={value}
        onChange={(e) => set(+e.target.value)}
      />
    </div>
  );
}
export default function LinAlgTab() {
  const initial = useMemo(() => readHashState().params, []),
    plotRef = useRef(null);
  const [m11, setM11] = useState(() => paramNumber(initial, "a", 2)),
    [m12, setM12] = useState(() => paramNumber(initial, "b", 1)),
    [m21, setM21] = useState(() => paramNumber(initial, "c", 1)),
    [m22, setM22] = useState(() => paramNumber(initial, "d", 2)),
    [vx, setVx] = useState(() => paramNumber(initial, "vx", 1)),
    [vy, setVy] = useState(() => paramNumber(initial, "vy", 0)),
    [mode, setMode] = useState("gauss"),
    [step, setStep] = useState(0),
    [matrixSize, setMatrixSize] = useState(128),
    [bench, setBench] = useState(null),
    [benchBusy, setBenchBusy] = useState(false),
    [perf, setPerf] = useState({ wasm: "checking", worker: true });
  useEffect(() => {
    runMathTask("perf:status")
      .then(setPerf)
      .catch(() => setPerf({ wasm: "fallback", worker: true }));
  }, []);
  useEffect(
    () => updateHashState("matrix", { a: m11, b: m12, c: m21, d: m22, vx, vy }),
    [m11, m12, m21, m22, vx, vy],
  );
  const result = useMemo(
      () => analyzeMatrix(m11, m12, m21, m22, vx, vy),
      [m11, m12, m21, m22, vx, vy],
    ),
    gauss = useMemo(
      () => gaussJordan2x2(m11, m12, m21, m22),
      [m11, m12, m21, m22],
    ),
    lu = useMemo(() => luTrace2x2(m11, m12, m21, m22), [m11, m12, m21, m22]),
    eig = useMemo(
      () => eigenTrace2x2(m11, m12, m21, m22),
      [m11, m12, m21, m22],
    );
  useEffect(() => setStep(0), [m11, m12, m21, m22, mode]);
  const traces = { gauss: gauss.steps, lu: lu.steps, eigen: eig.steps },
    steps = traces[mode],
    cur = steps[Math.min(step, steps.length - 1)];
  const {
      v,
      vTransformed,
      eigenInfos,
      axisLimit,
      determinant,
      trace,
      invertible,
      inverse,
      frobeniusNorm,
    } = result,
    [ox, oy] = toScreen(0, 0, axisLimit),
    [vxS, vyS] = toScreen(v[0], v[1], axisLimit),
    [tx, ty] = toScreen(vTransformed[0], vTransformed[1], axisLimit);
  const presets = {
    identity: [1, 0, 0, 1],
    rotation: [0, -1, 1, 0],
    shear: [1, 1, 0, 1],
    stretch: [2, 0, 0, 0.5],
    reflection: [1, 0, 0, -1],
    projection: [1, 0, 0, 0],
    jordan: [2, 1, 0, 2],
  };
  const apply = (p) => {
    const [a, b, c, d] = presets[p];
    setM11(a);
    setM12(b);
    setM21(c);
    setM22(d);
  };
  const config = { m11, m12, m21, m22, vx, vy };
  const transformedGrid = useMemo(() => {
    const lines = [];
    for (let q = -3; q <= 3; q++) {
      lines.push({
        a: [m11 * q + m12 * -3, m21 * q + m22 * -3],
        b: [m11 * q + m12 * 3, m21 * q + m22 * 3],
      });
      lines.push({
        a: [m11 * -3 + m12 * q, m21 * -3 + m22 * q],
        b: [m11 * 3 + m12 * q, m21 * 3 + m22 * q],
      });
    }
    return lines;
  }, [m11, m12, m21, m22]);
  const report = {
    title: "SimuMath Matrix Laboratuvar Raporu",
    summary: "2x2 lineer dönüşümün sayısal ve geometrik analizi.",
    parameters: {
      A: `[[${m11}, ${m12}], [${m21}, ${m22}]]`,
      v: `[${vx}, ${vy}]`,
    },
    results: {
      determinant: fmt(determinant),
      trace: fmt(trace),
      frobeniusNorm: fmt(frobeniusNorm),
      invertible: invertible ? "evet" : "hayır",
    },
    notes: [
      "Gauss-Jordan, LU ve özdeğer/özvektör adımları eğitim amaçlı izlenebilir.",
    ],
  };
  const runBenchmark = async () => {
    setBenchBusy(true);
    setBench(null);
    const a = benchmarkMatrix(matrixSize, 1),
      b = benchmarkMatrix(matrixSize, 7),
      start = performance.now();
    try {
      const out = await runMathTask("matrix:multiply", { a, b });
      setBench({
        ms: performance.now() - start,
        checksum: out[0]
          .slice(0, Math.min(8, out[0].length))
          .reduce((s, x) => s + x, 0),
      });
    } catch (error) {
      setBench({ error: error.message });
    } finally {
      setBenchBusy(false);
    }
  };
  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Matrix Intuition Builder</h2>
        <p className="description">
          Katsayıları sürükle; ızgaranın, vektörün ve özdoğruların anlık
          dönüşümünü izle.
        </p>
        <div className="result-banner">
          Performans motoru: Web Worker · WASM:{" "}
          {perf.wasm === "wasm" ? "aktif" : "JS fallback"}
        </div>
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          {Object.keys(presets).map((p) => (
            <button
              key={p}
              className="btn btn-secondary"
              onClick={() => apply(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <Slider label="a₁₁" value={m11} set={setM11} />
        <Slider label="a₁₂" value={m12} set={setM12} />
        <Slider label="a₂₁" value={m21} set={setM21} />
        <Slider label="a₂₂" value={m22} set={setM22} />
        <Slider label="v₁" value={vx} set={setVx} />
        <Slider label="v₂" value={vy} set={setVy} />
        <div className="matrix-grid">
          <span className="bracket">A=[</span>
          <input
            type="number"
            value={m11}
            onChange={(e) => setM11(+e.target.value)}
          />
          <input
            type="number"
            value={m12}
            onChange={(e) => setM12(+e.target.value)}
          />
          <span />
          <span />
          <input
            type="number"
            value={m21}
            onChange={(e) => setM21(+e.target.value)}
          />
          <input
            type="number"
            value={m22}
            onChange={(e) => setM22(+e.target.value)}
          />
          <span className="bracket">]</span>
        </div>
        <div className="intuition-note">
          <strong>Alan ölçeği = det(A) = {fmt(determinant)}</strong>
          <span>
            {determinant < 0
              ? "Yön ters dönüyor (orientation flip)."
              : Math.abs(determinant) < 1e-9
                ? "Alan sıfıra çöküyor; dönüşüm tekil."
                : Math.abs(determinant) > 1
                  ? "Alan genişliyor."
                  : "Alan sıkışıyor."}
          </span>
        </div>
        <div className="result-banner">
          tr={fmt(trace)} · ‖A‖F={fmt(frobeniusNorm)}
          <br />
          {eigenInfos.map((x, i) => formatEigenLabel(x, i + 1)).join(" · ")}
        </div>
        <div className="field">
          <label>
            <span>N×N Worker Çarpımı</span>
            <span className="value">
              {matrixSize}×{matrixSize}
            </span>
          </label>
          <input
            type="range"
            min="32"
            max="256"
            step="32"
            value={matrixSize}
            onChange={(e) => setMatrixSize(+e.target.value)}
          />
        </div>
        <button
          className="btn btn-primary"
          disabled={benchBusy}
          onClick={runBenchmark}
        >
          {benchBusy ? "Hesaplanıyor…" : "Worker/WASM Çarpımını Çalıştır"}
        </button>
        {bench && (
          <div className="result-banner">
            {bench.error
              ? bench.error
              : `${matrixSize}×${matrixSize}: ${bench.ms.toFixed(1)} ms`}
          </div>
        )}
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => downloadText("simumath-matrix.py", matrixPythonCode(config))}>Python</button>
          <button className="btn btn-secondary" onClick={() => downloadText("simumath-matrix-sympy.py", matrixSympyCode(config))}>SymPy</button>
          <button className="btn btn-secondary" onClick={() => downloadText("simumath-matrix.m", matrixMatlabCode(config))}>MATLAB</button>
          <button className="btn btn-secondary" onClick={() => downloadText("simumath-matrix-report.tex", buildLatexReport(report), "application/x-tex;charset=utf-8")}>LaTeX</button>
          <button className="btn btn-secondary" onClick={() => printReport(report)}>PDF</button>
          <button className="btn btn-secondary" onClick={() => exportSvgElement(plotRef.current, "simumath-matrix.svg")}>SVG</button>
          <button className="btn btn-secondary" onClick={() => exportSvgAsPng(plotRef.current, "simumath-matrix-3x.png", 3)}>PNG 3×</button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 20 }}>
        <div className="viz-panel">
          <div className="viz-title">
            3.2 Dual View · Dönüşen Koordinat Izgarası
          </div>
          <div className="matrix-dual">
            <section className="intuition-pane">
              <div className="viz-title">Geometrik Dönüşüm</div>
              <svg
                ref={plotRef}
                viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
                width="100%"
                style={{ maxWidth: 500 }}
              >
                <line
                  x1="0"
                  y1={VIEW_SIZE / 2}
                  x2={VIEW_SIZE}
                  y2={VIEW_SIZE / 2}
                  stroke="#263758"
                />
                <line
                  x1={VIEW_SIZE / 2}
                  y1="0"
                  x2={VIEW_SIZE / 2}
                  y2={VIEW_SIZE}
                  stroke="#263758"
                />
                {transformedGrid.map((g, i) => {
                  const [x1, y1] = toScreen(g.a[0], g.a[1], axisLimit),
                    [x2, y2] = toScreen(g.b[0], g.b[1], axisLimit);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#33496f"
                      strokeWidth="1"
                      style={{ transition: "all 180ms ease" }}
                    />
                  );
                })}
                {eigenInfos.map((info, i) => {
                  if (!info.isReal || !info.vector) return null;
                  const [p1, p2] = eigenvectorLineEndpoints(
                      info.vector,
                      axisLimit,
                    ),
                    [x1, y1] = toScreen(p1[0], p1[1], axisLimit),
                    [x2, y2] = toScreen(p2[0], p2[1], axisLimit);
                  return (
                    <line
                      key={`e${i}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#e65b5b"
                      strokeDasharray="6 4"
                    />
                  );
                })}
                <line
                  x1={ox}
                  y1={oy}
                  x2={vxS}
                  y2={vyS}
                  stroke="#4d8cf2"
                  strokeWidth="3"
                />
                <line
                  x1={ox}
                  y1={oy}
                  x2={tx}
                  y2={ty}
                  stroke="#3ecf8e"
                  strokeWidth="3"
                />
              </svg>
            </section>
            <section className="intuition-pane">
              <div className="viz-title">Sayısal Etki</div>
              <div className="matrix-effect">
                <div>
                  <span>v</span>
                  <strong>
                    [{fmt(v[0])}, {fmt(v[1])}]
                  </strong>
                </div>
                <div>
                  <span>Av</span>
                  <strong>
                    [{fmt(vTransformed[0])}, {fmt(vTransformed[1])}]
                  </strong>
                </div>
                <div>
                  <span>det(A)</span>
                  <strong>{fmt(determinant)}</strong>
                </div>
                <div>
                  <span>trace(A)</span>
                  <strong>{fmt(trace)}</strong>
                </div>
              </div>
              {inverse && (
                <div className="progress-mono">
                  A⁻¹ = [[{fmt(inverse[0][0])}, {fmt(inverse[0][1])}], [
                  {fmt(inverse[1][0])}, {fmt(inverse[1][1])}]]
                </div>
              )}
            </section>
          </div>
        </div>
        <div className="viz-panel">
          <div className="btn-row">
            <button
              className={`btn ${mode === "gauss" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("gauss")}
            >
              Gauss-Jordan
            </button>
            <button
              className={`btn ${mode === "lu" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("lu")}
            >
              LU
            </button>
            <button
              className={`btn ${mode === "eigen" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("eigen")}
            >
              Eigen
            </button>
          </div>
          <div className="viz-title">
            Adım {step + 1}/{steps.length}
          </div>
          <div className="result-banner">{cur.label}</div>
          {cur.matrix && (
            <div className="progress-mono" style={{ whiteSpace: "pre" }}>
              {fmtRow(cur.matrix[0])}
              {"\n"}
              {fmtRow(cur.matrix[1])}
            </div>
          )}
          <div className="btn-row">
            <button
              className="btn btn-secondary"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              ← Geri
            </button>
            <button
              className="btn btn-primary"
              disabled={step >= steps.length - 1}
              onClick={() => setStep((s) => s + 1)}
            >
              İleri →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
